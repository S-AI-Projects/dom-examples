import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const requestedPath = pathname === "/" ? "/launch-handler/" : pathname;
    const filePath = path.resolve(root, `.${requestedPath}`);

    if (!filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const actualPath = requestedPath.endsWith("/")
      ? path.join(filePath, "index.html")
      : filePath;
    const content = await readFile(actualPath);

    response.writeHead(200, {
      "Content-Type":
        mimeTypes[path.extname(actualPath)] ?? "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

let browser;

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  browser = await chromium.launch({ headless: true });

  const context = await browser.newContext();

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: async () => ({ scope: "http://localhost/test-scope/" }),
      },
    });
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  // Keep this test independent of the external media-chrome CDN.
  await page.route(
    "https://unpkg.com/media-chrome@0.4.0/dist/index.js",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "",
      }),
  );

  await page.goto(`http://127.0.0.1:${port}/launch-handler/`);

  const audio = page.locator("audio");
  const status = page.locator(".audio-status");

  await assert.doesNotReject(async () => {
    await audio.waitFor({ state: "attached" });
  });
  await assert.doesNotReject(async () => {
    await status.waitFor({ state: "attached" });
  });

  assert.equal(await status.isHidden(), true, "Status starts hidden");

  // Baseline: the example's bundled sample audio must load.
  await page.waitForFunction(
    () => document.querySelector("audio")?.readyState >= 2,
    null,
    { timeout: 10000 },
  );
  assert.equal(
    await audio.evaluate((element) => element.error),
    null,
    "Bundled sample audio loads without a media error",
  );

  // Failure fixture: request a deliberately nonexistent audio file.
  await audio.evaluate((element) => {
    element.src = "/launch-handler/audio/__r55_t013_missing__.mp3";
    element.load();
  });

  await page.waitForFunction(
    () => document.querySelector("audio")?.error !== null,
    null,
    { timeout: 10000 },
  );
  await status.waitFor({ state: "visible" });

  assert.match(
    await status.textContent(),
    /Unable to load this audio file.*try another audio file/i,
    "Missing audio displays a useful fallback message",
  );
  assert.notEqual(
    await status.evaluate((element) => getComputedStyle(element).display),
    "none",
    "Fallback message is visibly rendered",
  );

  // Recovery: restore the valid bundled sample.
  await audio.evaluate((element) => {
    element.src = "audio/sample-9s.mp3";
    element.load();
  });

  await page.waitForFunction(
    () => document.querySelector("audio")?.readyState >= 2,
    null,
    { timeout: 10000 },
  );

  await page.waitForFunction(
    () => document.querySelector(".audio-status")?.hidden === true,
    null,
    { timeout: 5000 },
  );

  assert.equal(await status.textContent(), "", "Recovery clears the message");
  assert.deepEqual(pageErrors, [], "No uncaught page errors occurred");

  console.log("PASS: bundled audio loads");
  console.log("PASS: missing audio displays the fallback message");
  console.log("PASS: restoring valid audio clears the fallback");
  console.log("PASS: no uncaught page errors");
  await context.close();
} catch (error) {
  console.error("FAIL: R55-T013 browser check");
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
}

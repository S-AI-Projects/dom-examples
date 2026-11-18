import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8772;
const baseUrl = `http://127.0.0.1:${port}`;
const attackString = "<img src=x onerror=window.__xss=1>";

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/media-session/index.html`)).ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error("Local HTTP server did not become ready");
}

const server = startServer();
const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const consoleErrors = [];

try {
  await waitForServer();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === baseUrl) {
      await route.continue();
    } else if (route.request().resourceType() === "font") {
      await route.fulfill({ status: 200, contentType: "font/woff2", body: Buffer.alloc(0) });
    } else if (requestUrl.pathname.endsWith(".css")) {
      await route.fulfill({ status: 200, contentType: "text/css", body: "" });
    } else {
      await route.abort();
    }
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/media-session/index.html`, { waitUntil: "load" });
  assert.equal(await page.locator("#playlist audio").count(), 1);
  assert.equal(await page.locator("#status h3").innerText(), "No track is playing");
  assert.deepEqual(await page.locator("#status dd").allTextContents(), ["N/A", "N/A", "N/A"]);

  await page.goto(`${baseUrl}/media-session/text-fixture.html`, { waitUntil: "load" });
  await page.locator("#track-title").fill(attackString);
  await page.getByRole("button", { name: "Render title" }).click();
  assert.equal(await page.locator("#rendered-title").textContent(), attackString);
  assert.equal(await page.locator("#rendered-title img").count(), 0, "the fixture string must not create an image");
  assert.equal(await page.evaluate(() => window.__xss), undefined, "the fixture handler must not execute");
  assert.equal(await page.locator("#rendered-title").getAttribute("role"), "status");

  console.log(JSON.stringify({
    baseline: "The media-session page had no user text input, so safe rendering was not directly exercised.",
    changed: "The main metadata path uses textContent and the isolated companion renders the attack string literally without DOM injection or execution.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
  await context.close();
} finally {
  await browser.close();
  server.kill();
}

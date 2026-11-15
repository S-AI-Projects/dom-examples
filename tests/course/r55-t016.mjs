import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const evidenceDir = path.join(root, "work/R55-T016");
const results = [];
let server;
let browser;

async function getFreePort() {
  const temporaryServer = createServer();

  await new Promise((resolve, reject) => {
    temporaryServer.once("error", reject);
    temporaryServer.listen(0, "127.0.0.1", resolve);
  });

  const port = temporaryServer.address().port;

  await new Promise((resolve, reject) => {
    temporaryServer.close((error) =>
      error ? reject(error) : resolve()
    );
  });

  return port;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Local server did not become ready.");
}

async function record(name, actual, expected) {
  assert.deepEqual(actual, expected, name);

  results.push({
    name,
    expected,
    actual,
    result: "PASS",
  });

  console.log(`PASS: ${name}`);
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/fullscreen-api/`;

  try {
    server = spawn(
      "python3",
      [
        "-m",
        "http.server",
        String(port),
        "--bind",
        "127.0.0.1",
        "--directory",
        root,
      ],
      { stdio: "ignore" }
    );

    await waitForServer(baseUrl);

    browser = await chromium.launch({ headless: true });

    // Test 1: Basic page structure and layout.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(baseUrl);

      await record(
        "Video element exists",
        await page.locator("#video").count(),
        1
      );

      await record(
        "Credits section exists",
        await page.locator("#credits").count(),
        1
      );

      await record(
        "Fullscreen status element has accessible role",
        await page.locator('#fullscreen-status[role="status"]').count(),
        1
      );

      await record(
        "Video uses responsive max-width",
        await page.locator("#video").evaluate(
          (video) => getComputedStyle(video).maxWidth
        ),
        "100%"
      );

      await context.close();
    }

    // Test 2: Fullscreen API unavailable.
    {
      const context = await browser.newContext();

      await context.addInitScript(() => {
        Object.defineProperty(Document.prototype, "fullscreenEnabled", {
          configurable: true,
          get: () => false,
        });
      });

      const page = await context.newPage();
      await page.goto(baseUrl);

      await record(
        "Unsupported browser displays fallback",
        await page.locator("#fullscreen-status").innerText(),
        "Fullscreen mode is not supported by this browser."
      );

      await page.keyboard.press("Enter");

      await record(
        "Video remains available when fullscreen is unsupported",
        await page.locator("#video").count(),
        1
      );

      await context.close();
    }

    // Test 3: Fullscreen methods missing.
    {
      const context = await browser.newContext();

      await context.addInitScript(() => {
        Object.defineProperty(Document.prototype, "fullscreenEnabled", {
          configurable: true,
          get: () => true,
        });

        Object.defineProperty(HTMLVideoElement.prototype, "requestFullscreen", {
          configurable: true,
          value: undefined,
        });
      });

      const page = await context.newPage();
      await page.goto(baseUrl);

      await record(
        "Missing fullscreen method displays fallback",
        await page.locator("#fullscreen-status").innerText(),
        "Fullscreen mode is not supported by this browser."
      );

      await context.close();
    }

    // Test 4: Supported API behavior, using controlled mocks.
    {
      const context = await browser.newContext();

      await context.addInitScript(() => {
        window.fakeFullscreen = null;

        Object.defineProperty(Document.prototype, "fullscreenEnabled", {
          configurable: true,
          get: () => true,
        });

        Object.defineProperty(Document.prototype, "fullscreenElement", {
          configurable: true,
          get: () => window.fakeFullscreen,
        });

        HTMLVideoElement.prototype.requestFullscreen = async function () {
          window.fakeFullscreen = this;
        };

        Document.prototype.exitFullscreen = async function () {
          window.fakeFullscreen = null;
        };
      });

      const page = await context.newPage();
      await page.goto(baseUrl);

      await page.keyboard.press("Enter");

      await record(
        "Enter key activates fullscreen",
        await page.evaluate(
          () => document.fullscreenElement === document.querySelector("#video")
        ),
        true
      );

      await page.keyboard.press("Enter");

      await record(
        "Second Enter key exits fullscreen",
        await page.evaluate(() => document.fullscreenElement === null),
        true
      );

      await record(
        "Status clears after successful toggle",
        await page.locator("#fullscreen-status").innerText(),
        ""
      );

      await context.close();
    }

    const evidence = {
      issue: "R55-T016",
      page: "fullscreen-api/index.html",
      date: new Date().toISOString(),
      browser: browser.version(),
      node: process.version,
      playwright: "1.65.0",
      server: "python3 -m http.server",
      inputs: {
        unsupported: "Fullscreen API disabled through browser initialization.",
        missingMethod: "HTMLVideoElement.requestFullscreen unavailable.",
        supported: "Mocked requestFullscreen and exitFullscreen methods.",
      },
      results,
      summary: {
        passed: results.length,
        failed: 0,
      },
    };

    await writeFile(
      path.join(evidenceDir, "results.json"),
      JSON.stringify(evidence, null, 2)
    );

    await writeFile(
      path.join(evidenceDir, "tool-versions.txt"),
      `Node: ${process.version}\nPlaywright: 1.65.0\nChromium: ${browser.version()}\nServer: Python 3 http.server\n`
    );

    console.log(`\nAll ${results.length} checks passed.`);
    console.log(`Evidence saved in work/R55-T016/`);
  } finally {
    if (browser) await browser.close();

    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
});

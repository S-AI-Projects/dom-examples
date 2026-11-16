import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import fs from "node:fs/promises";

const testFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFile), "../..");

const port = 4176;
const baseUrl = `http://127.0.0.1:${port}`;
const pageUrl = `${baseUrl}/webgpu-render-demo/text-rendering.html`;

const fixture =
  '<p>Hello</p><img src=x onerror="window.__xssExecuted = true">';

const server = spawn(
  "python3",
  ["-m", "http.server", String(port), "--bind", "127.0.0.1"],
  { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
);

let browser;
let serverOutput = "";
let serverErrors = "";

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

server.stderr.on("data", (chunk) => {
  serverErrors += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Local server exited early: ${serverErrors}`);
    }

    try {
      const response = await fetch(pageUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be starting.
    }

    await delay(200);
  }

  throw new Error("Local server did not become ready within 10 seconds.");
}

async function runBrowserCheck(contextNumber, width) {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
  });

  try {
    const page = await context.newPage();
    const pageErrors = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(pageUrl, { waitUntil: "networkidle" });

    assert.equal(
      await page.title(),
      "Safe Text Rendering",
      "The companion page should load."
    );

    await page.locator("#fixtureInput").fill(fixture);
    await page.locator("#renderButton").click();

    const actual = await page.evaluate(() => {
      const output = document.querySelector("#textOutput");
      const rectangle = output.getBoundingClientRect();

      return {
        renderedText: output.textContent,
        injectedImageCount: output.querySelectorAll("img").length,
        injectedParagraphCount: output.querySelectorAll("p").length,
        childElementCount: output.childElementCount,
        handlerExecuted: window.__xssExecuted === true,
        layout: {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          outputWidth: rectangle.width,
          outputVisible: rectangle.width > 0 && rectangle.height > 0,
        },
      };
    });

    assert.equal(
      actual.renderedText,
      fixture,
      "The complete fixture must appear literally as text."
    );

    assert.equal(
      actual.injectedImageCount,
      0,
      "The fixture must not create an injected image."
    );

    assert.equal(
      actual.injectedParagraphCount,
      0,
      "The fixture must not create an injected paragraph."
    );

    assert.equal(
      actual.childElementCount,
      0,
      "The output must contain text only, with no child elements."
    );

    assert.equal(
      actual.handlerExecuted,
      false,
      "The fixture's event handler must not execute."
    );

    assert.equal(actual.layout.outputVisible, true, "Output must be visible.");

    assert.ok(
      actual.layout.documentWidth <= actual.layout.viewportWidth,
      "The page must not overflow horizontally."
    );

    assert.deepEqual(
      pageErrors,
      [],
      "The browser must not report unexpected page errors."
    );

    await page.screenshot({
      path: `work/R55-T018/changed-context-${contextNumber}.png`,
      fullPage: true,
    });

    return {
      context: contextNumber,
      viewport: { width, height: 800 },
      input: fixture,
      expected: {
        renderedText: fixture,
        injectedImageCount: 0,
        injectedParagraphCount: 0,
        childElementCount: 0,
        handlerExecuted: false,
        pageErrors: [],
      },
      actual: {
        ...actual,
        pageErrors,
      },
      passed: true,
    };
  } finally {
    await context.close();
  }
}

async function cleanup() {
  if (browser) {
    await browser.close();
  }

  if (server.exitCode === null) {
    server.kill("SIGTERM");

    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      delay(3000),
    ]);

    if (server.exitCode === null) {
      server.kill("SIGKILL");
    }
  }
}

try {
  await waitForServer();

  browser = await chromium.launch({ headless: true });

  const results = [];

  results.push(await runBrowserCheck(1, 1280));
  results.push(await runBrowserCheck(2, 360));

  const report = {
    task: "R55-T018",
    page: pageUrl,
    browser: "Chromium",
    fixture,
    contexts: results,
    allPassed: results.every((result) => result.passed),
  };

  await fs.writeFile(
    "work/R55-T018/changed-results.json",
    JSON.stringify(report, null, 2)
  );

  console.log(JSON.stringify(report, null, 2));

  assert.equal(report.allPassed, true, "All browser checks must pass.");
} catch (error) {
  console.error("R55-T018 FAILED:", error);
  console.error("Server output:", serverOutput);
  console.error("Server errors:", serverErrors);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (cleanupError) {
    console.error("Cleanup failed:", cleanupError);
    process.exitCode = 1;
  }
}
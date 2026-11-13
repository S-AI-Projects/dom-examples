import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const EVIDENCE_DIR = path.join(ROOT, "work/R55-T017");
const PORT = 8765;
const BASE_URL = `http://127.0.0.1:${PORT}/screenleft-screentop/`;
const WIDTH = 640;
const HEIGHT = 480;

function waitForServer(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    function check() {
      http.get(url, (response) => {
        response.resume();

        if (response.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      }).on("error", retry);
    }

    function retry() {
      if (Date.now() - started > timeout) {
        reject(new Error("Local test server did not become ready."));
        return;
      }

      setTimeout(check, 200);
    }

    check();
  });
}

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  let server;
  let browser;

  try {
    server = spawn(
      "python3",
      ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"],
      { cwd: ROOT, stdio: "ignore" }
    );

    server.on("error", (error) => {
      console.error("Server error:", error.message);
    });

    await waitForServer(BASE_URL);

    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();
    const pageErrors = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.addInitScript(() => {
      window.__screenLeft = 100;
      window.__screenTop = 200;

      Object.defineProperty(window, "screenLeft", {
        configurable: true,
        get: () => window.__screenLeft,
      });

      Object.defineProperty(window, "screenTop", {
        configurable: true,
        get: () => window.__screenTop,
      });
    });

    await page.goto(BASE_URL, { waitUntil: "load" });

    await page.waitForFunction(() => {
      const canvas = document.querySelector("canvas");
      const text = document.querySelector("p")?.textContent || "";

      return canvas && text.includes("Window.screenTop: 200");
    });

    const initial = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const context = canvas.getContext("2d");
      const style = getComputedStyle(canvas);
      const rect = canvas.getBoundingClientRect();

      return {
        width: canvas.width,
        height: canvas.height,
        display: style.display,
        marginTop: style.marginTop,
        boundingWidth: rect.width,
        boundingHeight: rect.height,
        circlePixel: [...context.getImageData(320, 275, 1, 1).data],
        text: document.querySelector("p").textContent,
      };
    });

    assert.equal(initial.width, WIDTH, "Canvas width should be 640");
    assert.equal(initial.height, HEIGHT, "Canvas height should be 480");
    assert.equal(initial.display, "block", "Canvas should use block layout");
    assert.equal(initial.marginTop, "50px", "Canvas top margin should be 50px");
    assert.equal(initial.boundingWidth, WIDTH);
    assert.equal(initial.boundingHeight, HEIGHT);
    assert.deepEqual(
      initial.circlePixel,
      [0, 0, 255, 255],
      "Blue circle should be drawn at the initial position"
    );
    assert.match(initial.text, /Window\.screenLeft: 100/);
    assert.match(initial.text, /Window\.screenTop: 200/);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "baseline.png"),
      fullPage: true,
    });

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "baseline.json"),
      JSON.stringify(initial, null, 2)
    );

    console.log("PASS: Initial canvas rendering and computed layout");

    await page.evaluate(() => {
      window.__screenLeft += 60;
      window.__screenTop += 40;
    });

    await page.waitForFunction(() => {
      const text = document.querySelector("p")?.textContent || "";

      return (
        text.includes("Window.screenLeft: 160") &&
        text.includes("Window.screenTop: 240")
      );
    });

    const moved = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const context = canvas.getContext("2d");

      return {
        circlePixel: [...context.getImageData(260, 235, 1, 1).data],
        oldPixel: [...context.getImageData(320, 275, 1, 1).data],
        text: document.querySelector("p").textContent,
      };
    });

    assert.deepEqual(
      moved.circlePixel,
      [0, 0, 255, 255],
      "Circle should compensate for screen coordinate changes"
    );

    assert.deepEqual(
      moved.oldPixel,
      [0, 0, 0, 255],
      "Circle should no longer occupy its previous canvas position"
    );

    assert.match(moved.text, /Window\.screenLeft: 160/);
    assert.match(moved.text, /Window\.screenTop: 240/);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "changed.png"),
      fullPage: true,
    });

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "changed.json"),
      JSON.stringify(moved, null, 2)
    );

    console.log("PASS: Circle compensates for screen coordinate changes");

    assert.deepEqual(
      pageErrors,
      [],
      "Page should have no unexpected JavaScript errors"
    );

    const playwrightPackage = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "node_modules/playwright/package.json"),
        "utf8"
      )
    );

    const metadata = {
      task: "R55-T017",
      inputs: {
        initialScreenLeft: 100,
        initialScreenTop: 200,
        screenLeftChange: 60,
        screenTopChange: 40,
        canvasWidth: WIDTH,
        canvasHeight: HEIGHT
      },
      expected: {
        baselineCirclePixel: [0, 0, 255, 255],
        changedCirclePixel: [0, 0, 255, 255],
        previousCirclePosition: [0, 0, 0, 255],
        finalScreenLeft: 160,
        finalScreenTop: 240
      },
      actual: {
        baseline: initial,
        changed: moved
      },
      checks: {
        canvasAndLayout: "passed",
        circleRendering: "passed",
        coordinateCompensation: "passed",
        javascriptErrors: pageErrors
      },
      toolVersions: {
        node: process.version,
        playwright: playwrightPackage.version,
        chromium: browser.version(),
        python: execFileSync("python3", ["--version"], {
          encoding: "utf8"
        }).trim()
      }
    };

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    console.log("PASS: No unexpected JavaScript page errors");
    console.log(`Evidence saved in ${path.relative(ROOT, EVIDENCE_DIR)}`);
    console.log("All R55-T017 checks passed.");

    await context.close();
  } finally {
    if (browser) {
      await browser.close();
    }

    if (server && !server.killed) {
      server.kill();
    }
  }
}

main().catch((error) => {
  console.error("R55-T017 FAILED:", error);
  process.exitCode = 1;
});

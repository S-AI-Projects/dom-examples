import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, "../..");
const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/dynamic-range-limit/`;
const VIEWPORT = { width: 1280, height: 800 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(server) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) {
      throw new Error("Local HTTP server exited before becoming ready.");
    }

    try {
      const response = await fetch(URL);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }

    await sleep(100);
  }

  throw new Error("Local HTTP server did not become ready.");
}

async function captureContext(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(URL);
    assert.equal(response.status(), 200, "Demo page should load successfully");

    const image = page.locator("img");
    await image.waitFor({ state: "visible" });

    await page.waitForFunction(() => {
      const img = document.querySelector("img");
      return img && img.complete && img.naturalWidth > 0;
    });

    const initial = await page.evaluate(() => {
      const img = document.querySelector("img");

      return {
        title: document.title,
        heading: document.querySelector("h1")?.textContent.trim(),
        imageLoaded: img.complete && img.naturalWidth > 0,
        imageWidth: img.naturalWidth,
        imageAlt: img.alt,
        tabIndex: img.tabIndex,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        supportsProperty: CSS.supports("dynamic-range-limit", "no-limit"),
        value: getComputedStyle(img).getPropertyValue("dynamic-range-limit"),
        fontFamily: getComputedStyle(document.body).fontFamily,
      };
    });

    assert.equal(initial.heading, "dynamic-range-limit property demo");
    assert.equal(initial.imageLoaded, true);
    assert.equal(initial.tabIndex, 0);
    assert.deepEqual(initial.viewport, VIEWPORT);
    assert.equal(initial.supportsProperty, true);

    await image.hover();

    await page.waitForFunction(() => {
      const img = document.querySelector("img");
      return getComputedStyle(img).getPropertyValue("dynamic-range-limit").trim() === "no-limit";
    });

    const hover = await image.evaluate((img) =>
      getComputedStyle(img).getPropertyValue("dynamic-range-limit").trim()
    );

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await image.focus();

    assert.equal(
      await image.evaluate((img) => document.activeElement === img),
      true,
      "Image should receive keyboard focus"
    );

    await page.waitForFunction(() => {
      const img = document.querySelector("img");
      return getComputedStyle(img).getPropertyValue("dynamic-range-limit").trim() === "no-limit";
    });

    const focus = await image.evaluate((img) =>
      getComputedStyle(img).getPropertyValue("dynamic-range-limit").trim()
    );

    assert.deepEqual(pageErrors, [], "Page should not produce JavaScript errors");

    return { initial, hover, focus, pageErrors };
  } finally {
    await context.close();
  }
}

async function main() {
  let server;
  let browser;

  try {
    server = spawn(
      "python3",
      ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"],
      { cwd: ROOT, stdio: "ignore" }
    );

    await waitForServer(server);

    browser = await chromium.launch({ headless: true });

    const first = await captureContext(browser);
    const second = await captureContext(browser);

    assert.deepEqual(
      first,
      second,
      "Two fresh browser contexts should produce identical results"
    );

    assert.equal(first.initial.value, "standard");
    assert.equal(first.hover, "no-limit");
    assert.equal(first.focus, "no-limit");

    console.log(
      JSON.stringify(
        {
          test: "R55-T015 dynamic-range-limit",
          status: "PASS",
          playwrightVersion: require("playwright/package.json").version,
          contextsCompared: 2,
          results: first,
        },
        null,
        2
      )
    );
  } finally {
    if (browser) await browser.close();

    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => server.once("exit", resolve)),
        sleep(2000),
      ]);
    }
  }
}

main().catch((error) => {
  console.error("R55-T015 FAILED:", error);
  process.exitCode = 1;
});

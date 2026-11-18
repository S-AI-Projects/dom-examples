import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8765;
const baseUrl = `http://127.0.0.1:${port}`;

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/screen-wake-lock-api/index.html`);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error("Local HTTP server did not become ready");
}

const server = startServer();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];

page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

try {
  await waitForServer();

  // Wake Lock is permission- and device-dependent. This deterministic sentinel
  // keeps the test focused on the page's real controls and release behavior.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          const sentinel = new EventTarget();
          sentinel.release = async () => sentinel.dispatchEvent(new Event("release"));
          return sentinel;
        },
      },
    });
  });

  await page.goto(`${baseUrl}/screen-wake-lock-api/index.html`, { waitUntil: "load" });
  const button = page.locator("button[data-status]");
  const checkbox = page.locator("#reaquire");

  assert.equal(await button.count(), 1, "the wake-lock toggle must exist");
  assert.equal(await checkbox.count(), 1, "the re-acquire checkbox must exist");
  const baseline = await page.locator("body").innerText();
  assert.match(baseline, /Wake Lock Status/);

  const controls = page.locator("button, input");
  const tabIndexes = await controls.evaluateAll((elements) => elements.map((element) => element.tabIndex));
  assert.ok(tabIndexes.every((tabIndex) => tabIndex <= 0), "controls must not use positive tabindex values");

  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.matches("button[data-status]")), true);
  assert.equal(await page.evaluate(() => document.activeElement?.matches(":focus-visible")), true);

  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.matches("#reaquire")), true);
  assert.equal(await page.evaluate(() => document.activeElement?.matches(":focus-visible")), true);

  await page.keyboard.press("Space");
  assert.equal(await checkbox.isChecked(), true, "Space must toggle the re-acquire control");

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("button")?.dataset.status === "on");
  assert.equal(await page.locator("#status p").innerText(), "Wake Lock is active!");

  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("button")?.dataset.status === "off");
  assert.equal(await page.locator("#status p").innerText(), "Wake Lock has been released.");

  console.log(JSON.stringify({
    baseline: "The page rendered the status panel and two native controls.",
    changed: "Tab, Space, and Enter reached the controls and exercised acquire/release without pointer input.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
} finally {
  await context.close();
  await browser.close();
  server.kill();
}

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8773;
const baseUrl = `http://127.0.0.1:${port}`;

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/pointer-lock/index.html`)).ok) return;
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
  for (const width of [360, 640]) {
    for (const reducedMotion of ["reduce", "no-preference"]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion });
      const page = await context.newPage();
      page.on("pageerror", (error) => pageErrors.push(`${width}/${reducedMotion}: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(`${width}/${reducedMotion}: ${message.text()}`);
      });

      try {
        await page.goto(`${baseUrl}/pointer-lock/index.html`, { waitUntil: "load" });
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          animations: document.getAnimations().length,
          canvasWidth: document.querySelector("canvas").getBoundingClientRect().width,
          viewportWidth: innerWidth,
        }));
        assert.equal(metrics.overflow, 0, `${width}px layout must not overflow`);
        assert.equal(metrics.animations, 0, `${reducedMotion} must leave the static demo without animations`);
        assert.ok(metrics.canvasWidth <= metrics.viewportWidth, "canvas must fit the viewport");

        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.matches("canvas")), true);
        assert.equal(await page.evaluate(() => document.activeElement?.matches(":focus-visible")), true);
        const focusStyle = await page.evaluate(() => {
          const style = getComputedStyle(document.activeElement);
          return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
        });
        assert.notEqual(focusStyle.outlineStyle, "none");
        assert.notEqual(focusStyle.outlineWidth, "0px");
      } finally {
        await context.close();
      }
    }
  }

  console.log(JSON.stringify({
    baseline: "The demo had no CSS/Web Animations motion but its canvas was not keyboard-focusable and the fixed-width layout clipped narrow viewports.",
    changed: "Reduced-motion and normal-motion contexts retain a static usable demo, while 360px and 640px keyboard focus remains visible.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
} finally {
  await browser.close();
  server.kill();
}

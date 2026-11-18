import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8767;
const baseUrl = `http://127.0.0.1:${port}`;

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/web-animations-api/implicit-keyframes.html`)).ok) return;
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

async function checkPage({ unsupported }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(`${unsupported ? "unsupported" : "supported"}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${unsupported ? "unsupported" : "supported"}: ${message.text()}`);
  });

  try {
    if (unsupported) {
      await page.addInitScript(() => {
        Object.defineProperty(Element.prototype, "animate", {
          configurable: true,
          value: undefined,
        });
      });
    }

    await page.goto(`${baseUrl}/web-animations-api/implicit-keyframes.html`, { waitUntil: "load" });
    const status = await page.locator("#animation-status").innerText();
    if (unsupported) {
      assert.equal(status, "Web Animations API is not supported in this browser.");
      assert.equal(await page.locator("#animation-status").getAttribute("role"), "status");
      assert.equal(await page.evaluate(() => document.querySelector("div").getAnimations().length), 0);
    } else {
      assert.equal(status, "Animation is running.");
      assert.equal(await page.evaluate(() => document.querySelector("div").getAnimations().length), 1);
    }
  } finally {
    await context.close();
  }
}

try {
  await waitForServer();
  await checkPage({ unsupported: false });
  await checkPage({ unsupported: true });

  console.log(JSON.stringify({
    baseline: "The original page rendered an empty animation target and threw when animate() was unavailable.",
    changed: "Supported browsers keep the demo animation; unsupported browsers get readable status text without an uncaught error.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
} finally {
  await browser.close();
  server.kill();
}

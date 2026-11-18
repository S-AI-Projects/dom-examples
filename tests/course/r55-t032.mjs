import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8766;
const baseUrl = `http://127.0.0.1:${port}`;
const expectedLinks = [
  "Phrase matcher",
  "Speak easy synthesis",
  "Speech color changer",
  "On-device-speech color changer",
  "Audio track recognition",
  "Web Speech API",
  "The code used on these pages.",
];

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/web-speech-api/index.html`)).ok) return;
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

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 1280, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`${viewport.width}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${viewport.width}: ${message.text()}`);
    });

    try {
      await page.goto(`${baseUrl}/web-speech-api/index.html`, { waitUntil: "load" });
      const metrics = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const links = [...document.querySelectorAll("a")].map((link) => {
          const rect = link.getBoundingClientRect();
          return {
            text: link.textContent.trim(),
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height,
          };
        });
        return {
          viewportWidth,
          scrollWidth: document.documentElement.scrollWidth,
          links,
        };
      });

      assert.equal(metrics.scrollWidth, metrics.viewportWidth, `${viewport.width}px must not overflow horizontally`);
      assert.deepEqual(metrics.links.map((link) => link.text), expectedLinks, "content order must remain stable");
      assert.ok(
        metrics.links.every(
          (link) => link.left >= 0 && link.right <= metrics.viewportWidth && link.height > 0,
        ),
        `${viewport.width}px links must remain visible and inside the viewport`,
      );
    } finally {
      await context.close();
    }
  }

  console.log(JSON.stringify({
    baseline: "The page had no layout overflow, but its linked stylesheet returned 404.",
    changed: "The local stylesheet now loads and both 360x800 and 1280x800 remain ordered, usable, and overflow-free.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
} finally {
  await browser.close();
  server.kill();
}

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8769;
const baseUrl = `http://127.0.0.1:${port}`;

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/canvas/chroma-keying/index.html`)).ok) return;
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
const requestFailures = [];
const states = [];

try {
  await waitForServer();

  for (let contextNumber = 0; contextNumber < 2; contextNumber += 1) {
    const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === baseUrl) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`context ${contextNumber + 1}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`context ${contextNumber + 1}: ${message.text()}`);
    });
    page.on("requestfailed", (request) => requestFailures.push(`${contextNumber + 1}: ${request.url()}`));

    try {
      await page.addInitScript(() => {
        Date.now = () => 1700000000000;
        Math.random = () => 0.5;
      });
      await page.goto(`${baseUrl}/canvas/chroma-keying/index.html`, { waitUntil: "load" });
      const state = await page.evaluate(() => ({
        video: {
          src: document.querySelector("#video").getAttribute("src"),
          controls: document.querySelector("#video").hasAttribute("controls"),
        },
        canvases: [...document.querySelectorAll("canvas")].map((canvas) => ({
          id: canvas.id,
          width: canvas.width,
          height: canvas.height,
          cssWidth: getComputedStyle(canvas).width,
          cssHeight: getComputedStyle(canvas).height,
        })),
        backgroundImage: getComputedStyle(document.querySelector("#c2")).backgroundImage,
        viewport: { width: innerWidth, height: innerHeight },
      }));
      assert.deepEqual(state.video, { src: "media/video.mp4", controls: true });
      assert.deepEqual(state.canvases, [
        { id: "c1", width: 160, height: 96, cssWidth: "160px", cssHeight: "96px" },
        { id: "c2", width: 160, height: 96, cssWidth: "160px", cssHeight: "96px" },
      ]);
      assert.match(state.backgroundImage, /foo\.png/);
      assert.deepEqual(state.viewport, { width: 800, height: 600 });
      states.push(state);
    } finally {
      await context.close();
    }
  }

  assert.deepEqual(states[0], states[1], "fresh contexts must render the same asserted state");
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
  assert.deepEqual(requestFailures, [], "local media fixtures must load without failed requests");
  console.log(JSON.stringify({
    baseline: "The example used local video and image assets, but the browser check did not previously lock its environment.",
    changed: "Two fresh fixed contexts now assert identical video/canvas/image state using only local fixtures.",
    pageErrors,
    consoleErrors,
    requestFailures,
  }));
} finally {
  await browser.close();
  server.kill();
}

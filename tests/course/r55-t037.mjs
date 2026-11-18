import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8771;
const baseUrl = `http://127.0.0.1:${port}`;

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/websockets/index.html`)).ok) return;
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
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.addInitScript(() => {
    window.name = String(Number(window.name || "0") + 1);
    class FixtureWebSocket extends EventTarget {
      static OPEN = 1;

      constructor(url) {
        super();
        this.url = url;
        this.readyState = 0;
        window.__fixtureSockets ??= [];
        window.__fixtureSockets.push(this);
        queueMicrotask(() => {
          this.readyState = FixtureWebSocket.OPEN;
          this.dispatchEvent(new Event("open"));
        });
      }

      send(data) {
        window.__fixtureSent ??= [];
        window.__fixtureSent.push(data);
        queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: "pong" })));
      }

      close() {
        this.readyState = 3;
        this.dispatchEvent(new Event("close"));
      }
    }
    window.WebSocket = FixtureWebSocket;
  });

  await page.goto(`${baseUrl}/websockets/index.html`, { waitUntil: "load" });
  await page.getByText("WebSocket Test").waitFor();
  await page.waitForFunction(() => document.querySelector("#log")?.innerText.includes("CONNECTED"));
  await page.waitForTimeout(1200);

  const log = await page.locator("#log").innerText();
  assert.match(log, /^OPENING\nCONNECTED\n/);
  assert.match(log, /SENT: ping: 0/);
  assert.match(log, /RECEIVED: pong: 0/);
  assert.equal(await page.evaluate(() => window.__fixtureSent[0]), "ping");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280);
  assert.equal(await page.locator("#log").getAttribute("id"), "log");

  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("#log")?.innerText.includes("CONNECTED"));
  assert.equal(await page.evaluate(() => Number(window.name)), 2, "a fresh page load opens one fresh socket");

  console.log(JSON.stringify({
    baseline: "The page entry point and Deno walkthrough were documented, but the live exchange depended on a running external server.",
    changed: "The executable check records OPENING, CONNECTED, ping, and pong through a deterministic local socket fixture and verifies layout.",
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

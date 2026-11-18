import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8768;
const baseUrl = `http://127.0.0.1:${port}`;

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/window-management-api/index.html`)).ok) return;
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

  const unsupportedContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const unsupportedPage = await unsupportedContext.newPage();
  unsupportedPage.on("pageerror", (error) => pageErrors.push(`unsupported: ${error.message}`));
  unsupportedPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`unsupported: ${message.text()}`);
  });
  await unsupportedPage.addInitScript(() => {
    delete window.getScreenDetails;
    delete Window.prototype.getScreenDetails;
  });
  await unsupportedPage.goto(`${baseUrl}/window-management-api/index.html`, { waitUntil: "load" });
  assert.equal(await unsupportedPage.locator("section ul li").count(), 4, "unsupported browsers get four fallback links");
  assert.equal(await unsupportedPage.locator("section button").count(), 0, "unsupported browsers do not get the popup button");
  await unsupportedPage.reload({ waitUntil: "load" });
  assert.equal(await unsupportedPage.locator("section ul li").count(), 4, "reload must not duplicate fallback links");
  await unsupportedContext.close();

  const supportedContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const supportedPage = await supportedContext.newPage();
  supportedPage.on("pageerror", (error) => pageErrors.push(`supported: ${error.message}`));
  supportedPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`supported: ${message.text()}`);
  });
  await supportedPage.addInitScript(() => {
    window.__openedWindows = [];
    window.__beforeUnloadAdds = 0;
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function (type, listener, options) {
      if (type === "beforeunload") window.__beforeUnloadAdds += 1;
      return originalAddEventListener.call(this, type, listener, options);
    };
    window.open = (url) => {
      const popup = {
        closed: false,
        close() {
          this.closed = true;
        },
      };
      window.__openedWindows.push({ url, popup });
      return popup;
    };
    window.getScreenDetails = async () => ({
      screens: [{ availLeft: 0, availTop: 0, availWidth: 1200, availHeight: 800 }],
      addEventListener() {},
    });
  });
  await supportedPage.goto(`${baseUrl}/window-management-api/index.html`, { waitUntil: "load" });

  const button = supportedPage.getByRole("button", { name: "Open learning environment" });
  assert.equal(await button.count(), 1);
  await button.click();
  await supportedPage.waitForFunction(() => window.__openedWindows.length === 4);
  await button.click();
  await supportedPage.waitForTimeout(300);
  assert.equal(await supportedPage.evaluate(() => window.__openedWindows.length), 4, "repeat activation must not duplicate windows");
  assert.equal(await supportedPage.evaluate(() => window.__beforeUnloadAdds), 1, "repeat activation must not duplicate cleanup handlers");
  assert.equal(await supportedPage.locator("#block-warning").count(), 1, "repeat activation must not duplicate the popover");

  await supportedPage.evaluate(() => {
    window.__openedWindows[0].popup.closed = true;
  });
  await supportedPage.waitForFunction(() => window.__openedWindows.every(({ popup }) => popup.closed));
  await button.click();
  await supportedPage.waitForFunction(() => window.__openedWindows.length === 8);
  assert.equal(await supportedPage.evaluate(() => window.__beforeUnloadAdds), 1, "reopening must retain one cleanup handler");
  await supportedContext.close();

  console.log(JSON.stringify({
    baseline: "The original supported path could create another set of popups and cleanup listeners on each activation.",
    changed: "Fallback links remain single on reload, repeated supported activation is idempotent, and cleanup permits one fresh set after closure.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
} finally {
  await browser.close();
  server.kill();
}

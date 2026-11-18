import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8770;
const baseUrl = `http://127.0.0.1:${port}`;

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/view-transitions/mpa/index.html`)).ok) return;
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

  const supportedContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const supportedPage = await supportedContext.newPage();
  supportedPage.on("pageerror", (error) => pageErrors.push(`supported: ${error.message}`));
  supportedPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`supported: ${message.text()}`);
  });
  await supportedPage.goto(`${baseUrl}/view-transitions/mpa/index.html`, { waitUntil: "load" });
  assert.equal(await supportedPage.locator("#view-transition-support").innerText(), "Cross-document view transitions enabled.");
  assert.equal(await supportedPage.locator("img").count(), 1);
  await supportedPage.getByRole("link", { name: "Go to page 2" }).click();
  await supportedPage.waitForURL(`${baseUrl}/view-transitions/mpa/page2.html`);
  assert.equal(await supportedPage.title(), "Cross-document view transition example: Page 2");
  assert.equal(await supportedPage.locator("#view-transition-support").innerText(), "Cross-document view transitions enabled.");
  assert.equal(await supportedPage.locator("img").getAttribute("alt"), "A large green tropical leaf in the middle of a jungle.");
  await supportedContext.close();

  const unsupportedContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const unsupportedPage = await unsupportedContext.newPage();
  unsupportedPage.on("pageerror", (error) => pageErrors.push(`unsupported: ${error.message}`));
  unsupportedPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`unsupported: ${message.text()}`);
  });
  await unsupportedPage.addInitScript(() => {
    const originalSupports = CSS.supports.bind(CSS);
    CSS.supports = (query) => query === "view-transition-name: root" ? false : originalSupports(query);
  });
  await unsupportedPage.goto(`${baseUrl}/view-transitions/mpa/index.html`, { waitUntil: "load" });
  assert.equal(await unsupportedPage.locator("#view-transition-support").innerText(), "Cross-document view transitions are not supported; navigation still works normally.");
  assert.equal(await unsupportedPage.getByRole("link", { name: "Go to page 2" }).isVisible(), true);
  assert.equal(await unsupportedPage.locator("img").isVisible(), true);
  await unsupportedContext.close();

  console.log(JSON.stringify({
    baseline: "The MPA demo relied on CSS support without an explicit unsupported-feature message.",
    changed: "Supported and unsupported fixtures both preserve navigation and imagery, with the feature path reported accurately.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
} finally {
  await browser.close();
  server.kill();
}

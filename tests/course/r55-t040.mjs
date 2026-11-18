import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8774;
const baseUrl = `http://127.0.0.1:${port}`;
const pagePath = "/interest-invokers/stock-moving/index.html";
const scriptPath = "/interest-invokers/stock-moving/index.js";

function startServer() {
  return spawn("python3", ["-m", "http.server", String(port), "--directory", repoRoot], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}${pagePath}`)).ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error("Local HTTP server did not become ready");
}

async function dispatchInterest(page) {
  await page.evaluate(() => {
    const target = document.querySelector("#button-tooltip");
    const source = document.querySelector(".keep button");
    const event = new Event("interest");
    Object.defineProperty(event, "source", { value: source });
    target.dispatchEvent(event);
  });
}

const server = startServer();
const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const consoleErrors = [];

try {
  await waitForServer();

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(`correct: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`correct: ${message.text()}`);
  });
  await page.goto(`${baseUrl}${pagePath}`, { waitUntil: "load" });
  assert.equal(await page.locator("#button-tooltip").count(), 1);
  assert.equal(await page.locator(".keep button").first().innerText(), "🥕 Carrots (9)");

  await dispatchInterest(page);
  await page.waitForFunction(() => document.querySelector("#button-tooltip")?.textContent === "Stock to move: 1");
  assert.equal(await page.locator("#button-tooltip").innerText(), "Stock to move: 1");
  await page.evaluate(() => document.querySelector("#button-tooltip").dispatchEvent(new Event("loseinterest")));
  assert.equal(await page.locator("#button-tooltip").innerText(), "");
  await page.locator(".keep button").first().click();
  assert.equal(await page.locator(".sell button").count(), 1, "the click must move one stock item");
  assert.equal(await page.locator(".keep button").first().innerText(), "🥕 Carrots (8)");
  await context.close();

  const mutatedContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await mutatedContext.route(`**${scriptPath}`, async (route) => {
    const original = await readFile(resolve(repoRoot, `.${scriptPath}`), "utf8");
    const mutated = original.replace(
      'btnTooltip.addEventListener("interest", incrementStock);',
      'btnTooltip.addEventListener("interest", () => {});',
    );
    await route.fulfill({ status: 200, contentType: "text/javascript", body: mutated });
  });
  const mutatedPage = await mutatedContext.newPage();
  mutatedPage.on("pageerror", (error) => pageErrors.push(`mutated: ${error.message}`));
  mutatedPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`mutated: ${message.text()}`);
  });
  await mutatedPage.goto(`${baseUrl}${pagePath}`, { waitUntil: "load" });
  await dispatchInterest(mutatedPage);
  await mutatedPage.waitForTimeout(300);
  assert.equal(await mutatedPage.locator("#button-tooltip").innerText(), "", "the deliberately broken binding must fail the stock update");
  assert.equal(await mutatedPage.locator(".sell button").count(), 0);
  await mutatedContext.close();

  console.log(JSON.stringify({
    baseline: "The correct page shows a stock tooltip on interest and moves one item on click.",
    changed: "The check proves the correct binding updates stock and a temporary binding mutation produces a distinct failing behavior; the repository source remains unmutated.",
    pageErrors,
    consoleErrors,
  }));
  assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
  assert.deepEqual(consoleErrors, [], "unexpected console errors must fail the check");
} finally {
  await browser.close();
  server.kill();
}

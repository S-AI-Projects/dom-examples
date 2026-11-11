import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8765";
const PAGE_URL = `${BASE_URL}/css-painting/`;
const EXPECTED_LINKS = [
  ["Half highlight, fixed size", "half-highlight-fixed-size"],
  ["Half highlight, variable size", "half-highlight-paintsize"],
  ["Fancy highlight", "fancy-header-highlight"],
  ["Using custom properties", "custom-properties"],
  ["Hollow highlight", "hollow-highlight"],
];

let server;
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(PAGE_URL);
      if (response.ok) return;
    } catch {
      // The server may not be ready yet.
    }
    await delay(100);
  }
  throw new Error("Python server did not become ready.");
}

async function startServer() {
  server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], {
    stdio: "ignore",
  });
  await waitForServer();
}

async function cleanup() {
  try {
    if (browser) await browser.close();
  } finally {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");

      await Promise.race([
        new Promise((resolve) => server.once("exit", resolve)),
        delay(2000),
      ]);

      if (server.exitCode === null) server.kill("SIGKILL");
    }
  }
}

async function run() {
  const results = [];
  const record = (name, expected, actual) => {
    results.push({ name, expected, actual, passed: true });
    console.log(`PASS: ${name}`);
  };

  try {
    await startServer();
    browser = await chromium.launch({ headless: true });

    // A fresh context prevents stored browser state from affecting the test.
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    const failedRequests = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto(PAGE_URL);
    assert.equal(response.status(), 200);
    record("Page loads successfully", 200, response.status());

    const heading = page.getByRole("heading", {
      name: "CSS Painting API examples",
      level: 1,
    });
    assert.equal(await heading.count(), 1);
    record("Page has one descriptive H1", 1, await heading.count());

    const main = page.getByRole("main");
    assert.equal(await main.count(), 1);
    assert.equal(await main.getAttribute("id"), "main-content");

    record(
      "Main landmark has expected ID",
      "main-content",
      await main.getAttribute("id"),
    );

    const positiveTabindexCount = await page.locator("[tabindex]").evaluateAll(
      (elements) =>
        elements.filter(
          (element) => Number(element.getAttribute("tabindex")) > 0,
        ).length,
    );

    assert.equal(positiveTabindexCount, 0);
    record("No positive tabindex values", 0, positiveTabindexCount);
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    assert.equal(await skipLink.count(), 1);

    const initialTop = await skipLink.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).top),
    );
    assert.ok(initialTop < 0, `Skip link should start offscreen, got top=${initialTop}`);
    record("Skip link starts visually hidden", "top < 0", `top=${initialTop}px`);

    await page.keyboard.press("Tab");
    assert.equal(await skipLink.evaluate((element) => element === document.activeElement), true);

    const focusedTop = await skipLink.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).top),
    );
    assert.ok(focusedTop >= 0, `Focused skip link should be visible, got top=${focusedTop}`);
    const skipBox = await skipLink.boundingBox();
    assert.ok(skipBox && skipBox.width > 0 && skipBox.height > 0);
    record("Tab reveals the skip link", "visible on screen", `top=${focusedTop}px`);

    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash === "#main-content");
    assert.equal(await main.evaluate((element) => element === document.activeElement), true);
    record(
      "Enter activates skip link and moves focus to main",
      "#main-content",
      await page.evaluate(() => window.location.hash),
    );

    const links = main.getByRole("link");
    assert.equal(await links.count(), EXPECTED_LINKS.length);
    record("Main content contains five example links", 5, await links.count());

    const actualLinks = [];

for (let index = 0; index < EXPECTED_LINKS.length; index += 1) {
  const link = links.nth(index);

  const actual = [
    (await link.innerText()).trim(),
    await link.getAttribute("href"),
  ];

  assert.deepEqual(actual, EXPECTED_LINKS[index]);
  actualLinks.push(actual);
}

record(
  "Example link names and destinations remain unchanged",
  EXPECTED_LINKS,
  actualLinks,
);

    // Tab from the focused main landmark reaches the first example link.
    await page.keyboard.press("Tab");
    assert.equal(
      await links.nth(0).evaluate((element) => element === document.activeElement),
      true,
    );
    record("Tab from main reaches first example link", EXPECTED_LINKS[0][0], await page.evaluate(() => document.activeElement.textContent));

    const focusStyle = await links.nth(0).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        outlineColor: style.outlineColor,
      };
    });
    assert.notEqual(focusStyle.outlineStyle, "none");
    assert.ok(focusStyle.outlineWidth >= 3);
    assert.notEqual(focusStyle.outlineColor, "rgba(0, 0, 0, 0)");
    record("Focused example link has visible outline", "solid visible outline >= 3px", focusStyle);

    for (let index = 1; index < EXPECTED_LINKS.length; index += 1) {
      await page.keyboard.press("Tab");
      assert.equal(
        await links.nth(index).evaluate((element) => element === document.activeElement),
        true,
        `Tab should focus link ${index + 1}`,
      );
    }
    record("Tab traverses all five example links in order", 5, EXPECTED_LINKS.length);

    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await links.nth(3).evaluate((element) => element === document.activeElement),
      true,
    );
    record("Shift+Tab moves focus backwards", EXPECTED_LINKS[3][0], await page.evaluate(() => document.activeElement.textContent));

    // Test real keyboard activation of every original link.
    for (let index = 0; index < EXPECTED_LINKS.length; index += 1) {
      await page.goto(PAGE_URL);
      await page.keyboard.press("Tab"); // Skip link.
      await page.keyboard.press("Tab"); // First example link.
      for (let step = 0; step < index; step += 1) {
        await page.keyboard.press("Tab");
      }

      const targetLink = main.getByRole("link", { name: EXPECTED_LINKS[index][0] });
      assert.equal(
        await targetLink.evaluate((element) => element === document.activeElement),
        true,
      );

      await page.keyboard.press("Enter");
      await page.waitForURL(`**/css-painting/${EXPECTED_LINKS[index][1]}/`);
      assert.ok(page.url().endsWith(`/css-painting/${EXPECTED_LINKS[index][1]}/`));
      assert.equal(await page.locator("body").count(), 1);
    }
    record("Enter activates all five example links", 5, EXPECTED_LINKS.length);

    assert.deepEqual(pageErrors, [], "No uncaught browser JavaScript errors expected.");
    assert.deepEqual(failedRequests, [], "No failed or missing page resources expected.");
    record("No browser errors or failed resource requests", [], failedRequests);

    await page.goto(PAGE_URL);
    await page.keyboard.press("Tab");
    await page.screenshot({
      path: "work/R55-T011/keyboard-focus.png",
      fullPage: true,
    });

    await context.close();

    const report = {
      task: "R55-T011",
      page: PAGE_URL,
      browser: "Chromium",
      checks: results,
      summary: {
        passed: results.filter((item) => item.passed).length,
        total: results.length,
      },
    };

    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      "work/R55-T011/results.json",
      `${JSON.stringify(report, null, 2)}\n`,
    );

    console.log(`\n${report.summary.passed}/${report.summary.total} checks passed.`);
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error("\nR55-T011 FAILED:", error);
  process.exitCode = 1;
});

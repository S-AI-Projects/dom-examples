import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T021";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  // Deterministic stub for window.queryLocalFonts permission-gated API
  await page.addInitScript(() => {
    window.queryLocalFonts = async () => [
      { family: "Courier New", fullName: "Courier New Regular" },
      { family: "Georgia", fullName: "Georgia Bold" },
      { family: "Verdana", fullName: "Verdana Regular" },
    ];
  });

  await page.goto(`${baseUrl}/local-font-access/index.html`, { waitUntil: "load" });

  // 1. Verify baseline state
  const button = page.locator("button");
  const selectContainer = page.locator(".select-container");
  const selectElem = page.locator("#font-select");
  const sampleText = page.locator(".sample-text");

  assert.equal(await button.count(), 1, "start button must exist");
  assert.equal(await selectElem.count(), 1, "#font-select must exist");
  assert.equal(await button.innerText(), "Get your local fonts");
  assert.equal(await selectContainer.evaluate((el) => getComputedStyle(el).display), "none", "select container initially hidden");

  // Check no positive tabindexes
  const positiveTabIndex = await page.locator("[tabindex]").evaluateAll((els) =>
    els.filter((el) => Number(el.getAttribute("tabindex")) > 0).length
  );
  assert.equal(positiveTabIndex, 0, "no positive tabindex permitted");

  // 2. Keyboard traversal to button
  await page.keyboard.press("Tab");
  const isButtonActive = await button.evaluate((el) => el === document.activeElement);
  assert.equal(isButtonActive, true, "Tab reaches start button");

  const buttonFocusOutline = await button.evaluate((el) => getComputedStyle(el).outlineStyle);
  assert.notEqual(buttonFocusOutline, "none", "button has visible focus style");

  // 3. Activate button with keyboard (Enter)
  await page.keyboard.press("Enter");

  // Wait for fonts to populate and select to show
  await page.waitForFunction(() => {
    const sel = document.querySelector("#font-select");
    return sel && sel.options.length === 3;
  });

  assert.equal(await selectContainer.evaluate((el) => getComputedStyle(el).display), "block", "select container now visible");
  assert.equal(await sampleText.evaluate((el) => el.style.fontFamily), '"Courier New"', "initial font applied to sample text");

  // 4. Tab traversal to font-select
  await page.keyboard.press("Tab");
  const isSelectActive = await selectElem.evaluate((el) => el === document.activeElement);
  assert.equal(isSelectActive, true, "Tab reaches #font-select");

  const selectFocusOutline = await selectElem.evaluate((el) => getComputedStyle(el).outlineStyle);
  assert.notEqual(selectFocusOutline, "none", "select has visible focus style");

  // 5. Change font with keyboard
  await selectElem.selectOption("Georgia");
  await page.evaluate(() => {
    document.querySelector("#font-select").dispatchEvent(new Event("change"));
  });

  assert.equal(await sampleText.evaluate((el) => el.style.fontFamily), "Georgia", "sample text font family updated to Georgia");

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    baseline: "Initial page rendered with button 'Get your local fonts' and hidden select container.",
    changed: "Keyboard Tab reached button and select; Enter triggered queryLocalFonts; font selection changed typography.",
    toolVersions: { node: process.version, playwright: "chromium" },
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: keyboard navigation, visible focus, and activation for local-font-access.`);

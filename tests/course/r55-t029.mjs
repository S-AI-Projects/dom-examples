import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T029";

await runBrowserTest(taskId, async ({ baseUrl, context, page, pageErrors, consoleErrors }) => {
  // Deterministic stub for Web Share API
  await page.addInitScript(() => {
    navigator.canShare = () => true;
    navigator.share = async () => true;
  });

  await page.goto(`${baseUrl}/web-share/index.html`, { waitUntil: "load" });

  const link = page.locator("a");
  const button = page.locator("button");
  const result = page.locator(".result");

  assert.equal(await link.count(), 1, "link anchor must exist");
  assert.equal(await button.count(), 1, "button must exist");
  assert.equal(await result.innerText(), "", "result initially empty");

  // 1. Keyboard traversal and visible focus indicators
  await page.keyboard.press("Tab");
  const isLinkFocused = await link.evaluate((el) => el === document.activeElement);
  assert.equal(isLinkFocused, true, "First Tab reaches anchor link");

  const linkOutline = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
  });
  assert.notEqual(linkOutline.outlineStyle, "none", "Link must have visible focus outline");

  await page.keyboard.press("Tab");
  const isButtonFocused = await button.evaluate((el) => el === document.activeElement);
  assert.equal(isButtonFocused, true, "Second Tab reaches button");

  const buttonOutline = await button.evaluate((el) => {
    const s = getComputedStyle(el);
    return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
  });
  assert.notEqual(buttonOutline.outlineStyle, "none", "Button must have visible focus outline");

  // 2. Keyboard activation of share action
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector(".result").textContent.includes("MDN shared successfully"));
  assert.equal(await result.innerText(), "MDN shared successfully", "Enter triggers share action and shows success result");

  // 3. Test prefers-reduced-motion
  // Check default/no-preference duration
  const defaultDuration = await button.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  assert.ok(defaultDuration > 0.05, "Default transition duration is active under normal motion preference");

  // Emulate reduced motion
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedDuration = await button.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  assert.ok(
    reducedDuration <= 0.001,
    `Transition duration must be minimized under prefers-reduced-motion (got ${reducedDuration}s)`
  );

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    baseline: "Initial page without focus indicators and unconstrained motion.",
    focusIndicatorsVerified: { link: linkOutline, button: buttonOutline },
    keyboardActivationVerified: true,
    reducedMotionVerified: { defaultDuration, reducedDuration },
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: keyboard focus visibility and prefers-reduced-motion verified.`);

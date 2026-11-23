import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T030";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  await page.goto(`${baseUrl}/pointerevents/Pinch_zoom_gestures.html`, { waitUntil: "load" });

  const target = page.locator("#target");
  const logBtn = page.locator("#log");
  const clearLogBtn = page.locator("#clearlog");
  const output = page.locator("output");

  assert.equal(await target.count(), 1, "#target must exist");
  assert.equal(await logBtn.count(), 1, "#log button must exist");
  assert.equal(await clearLogBtn.count(), 1, "#clearlog button must exist");

  // Helper function to dispatch pinch sequence
  async function dispatchPinchSequence(targetSelector, expand) {
    return page.evaluate(
      ({ selector, isExpand }) => {
        const el = document.querySelector(selector);
        // First pointer at (100, 100)
        el.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: 1,
            clientX: 100,
            clientY: 100,
            pointerType: "touch",
            bubbles: true,
          })
        );
        // Second pointer at (200, 100) -> initial diff = 100
        el.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: 2,
            clientX: 200,
            clientY: 100,
            pointerType: "touch",
            bubbles: true,
          })
        );
        // First move to establish prevDiff
        el.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerId: 2,
            clientX: 200,
            clientY: 100,
            pointerType: "touch",
            bubbles: true,
          })
        );
        // Second move: either expand (distance 200) or contract (distance 50)
        const moveX = isExpand ? 300 : 150;
        el.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerId: 2,
            clientX: moveX,
            clientY: 100,
            pointerType: "touch",
            bubbles: true,
          })
        );

        const resultingBg = el.style.background;

        // Cleanup: pointerup
        el.dispatchEvent(
          new PointerEvent("pointerup", {
            pointerId: 1,
            pointerType: "touch",
            bubbles: true,
          })
        );
        el.dispatchEvent(
          new PointerEvent("pointerup", {
            pointerId: 2,
            pointerType: "touch",
            bubbles: true,
          })
        );

        return resultingBg;
      },
      { selector: targetSelector, isExpand: expand }
    );
  }

  // 1. Correct implementation check: expanding pinch zoom produces 'pink'
  const correctExpandBg = await dispatchPinchSequence("#target", true);
  assert.equal(correctExpandBg, "pink", "Expanding pinch zoom correctly sets target background to pink");

  // Contracting pinch zoom produces 'lightblue'
  const correctContractBg = await dispatchPinchSequence("#target", false);
  assert.equal(correctContractBg, "lightblue", "Contracting pinch zoom correctly sets target background to lightblue");

  // Verify reset on pointerup
  const finalBg = await target.evaluate((el) => el.style.background);
  assert.equal(finalBg, "white", "Target background resets to white after pointerup");

  // 2. Logging functionality check
  await logBtn.click();
  await dispatchPinchSequence("#target", true);
  const logContent = await output.innerText();
  assert.ok(logContent.length > 0, "Event logging active after clicking #log");

  await clearLogBtn.click();
  assert.equal(await output.innerText(), "", "#clearlog empties the output element");

  // 3. Regression test fixture: deliberately break pointermove handler
  const brokenExpandBg = await page.evaluate(() => {
    const el = document.getElementById("target");
    const originalHandler = el.onpointermove;
    // Deliberately break the move handler
    el.onpointermove = null;

    // Simulate same pinch gesture
    el.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, clientX: 100, clientY: 100, bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 2, clientX: 200, clientY: 100, bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointermove", { pointerId: 2, clientX: 300, clientY: 100, bubbles: true }));

    const bgInBrokenState = el.style.background;

    // Restore original handler
    el.onpointermove = originalHandler;
    el.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2, bubbles: true }));

    return bgInBrokenState;
  });

  // Assertion distinguishing broken state from correct state
  assert.notEqual(brokenExpandBg, "pink", "Broken handler does not set background to pink");
  assert.equal(brokenExpandBg, "white", "Broken state remains white without pointermove handling");

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    baseline: "Initial page ready with white background and touch-action none.",
    correctGestureResult: { expandBg: correctExpandBg, contractBg: correctContractBg },
    brokenFixtureResult: { brokenExpandBg },
    distinctionVerified: "Assertion successfully differentiated correct handler (pink) from broken handler (white)",
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: pinch zoom gesture behavior and regression fixture asserted.`);

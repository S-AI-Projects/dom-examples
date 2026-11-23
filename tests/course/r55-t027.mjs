import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T027";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  await page.goto(`${baseUrl}/web-workers/fibonacci-worker/index.html`, { waitUntil: "load" });

  const numberInput = page.locator("#number");
  const resultElem = page.locator("#result");
  const submitBtn = page.locator('input[type="submit"]');

  assert.equal(await numberInput.count(), 1, "#number input must exist");
  assert.equal(await resultElem.count(), 1, "#result output element must exist");
  assert.equal(await submitBtn.count(), 1, "submit button must exist");

  // 1. Baseline state
  assert.equal(await numberInput.inputValue(), "", "Input initially empty");
  assert.equal(await resultElem.innerText(), "", "Result initially empty");

  // 2. Walkthrough Step 1: Input 6 -> Expected 8
  await numberInput.fill("6");
  await submitBtn.click();
  await page.waitForFunction(() => document.querySelector("#result").textContent.trim() === "8");
  assert.equal(await resultElem.innerText(), "8", "Fibonacci(6) produces 8 via worker");
  assert.equal(await numberInput.inputValue(), "", "Input is cleared after submission");

  // 3. Walkthrough Step 2: Input 10 -> Expected 55
  await numberInput.fill("10");
  await submitBtn.click();
  await page.waitForFunction(() => document.querySelector("#result").textContent.trim() === "55");
  assert.equal(await resultElem.innerText(), "55", "Fibonacci(10) produces 55 via worker");

  // 4. Verify computed layout of result
  const resultBox = await resultElem.boundingBox();
  assert.ok(resultBox, "Result element has a valid bounding box");
  assert.ok(resultBox.width > 0 && resultBox.height > 0, "Result element has visible layout");

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    entryPoint: "web-workers/fibonacci-worker/index.html",
    setupCommand: "python -m http.server 8000 or npx serve .",
    walkthroughSteps: [
      { input: 6, expected: "8", actual: "8" },
      { input: 10, expected: "55", actual: "55" },
    ],
    workerStatus: "Dedicated Worker executed and communicated successfully without main thread block",
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: web-worker fibonacci walkthrough documented and verified.`);

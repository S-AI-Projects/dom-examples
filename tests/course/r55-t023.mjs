import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T023";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  await page.goto(`${baseUrl}/insert-adjacent/insertAdjacentText.html`, { waitUntil: "load" });

  const input = page.locator("input");
  const beforeBtn = page.locator("button.before");
  const afterBtn = page.locator("button.after");
  const resetBtn = page.locator("button.reset");
  const para = page.locator("section p");
  const message = page.locator(".message");

  // 1. Verify existence of source anchors
  assert.equal(await input.count(), 1, "input must exist");
  assert.equal(await beforeBtn.count(), 1, "before button must exist");
  assert.equal(await afterBtn.count(), 1, "after button must exist");
  assert.equal(await resetBtn.count(), 1, "reset button must exist");

  // 2. Baseline check
  const initialText = await para.innerText();
  assert.equal(initialText, "This is my text", "baseline text matches initial expectation");
  assert.equal(await message.innerText(), "", "message initially empty");

  // 3. Exercise empty input fallback
  await beforeBtn.click();
  assert.equal(
    await message.innerText(),
    "Please enter text to insert.",
    "empty input before-click triggers visible fallback"
  );
  assert.equal(await para.innerText(), initialText, "paragraph text remains unmodified on empty input");

  await resetBtn.click();
  await afterBtn.click();
  assert.equal(
    await message.innerText(),
    "Please enter text to insert.",
    "empty input after-click triggers visible fallback"
  );
  assert.equal(await para.innerText(), initialText, "paragraph text remains unmodified on empty input");

  // 4. Exercise valid insertions
  await input.fill("Prefix-");
  await beforeBtn.click();
  assert.equal(await para.innerText(), "Prefix-This is my text", "beforebegin insert successful");
  assert.equal(await message.innerText(), "", "fallback message cleared upon successful insert");

  await input.fill("-Suffix");
  await afterBtn.click();
  assert.equal(await para.innerText(), "Prefix-This is my text-Suffix", "beforeend insert successful");

  // 5. Reset demo
  await resetBtn.click();
  assert.equal(await para.innerText(), initialText, "reset restored initial text");
  assert.equal(await input.inputValue(), "", "reset cleared input");
  assert.equal(await message.innerText(), "", "reset cleared message");

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    baseline: "Initial page rendered 'This is my text' with empty input.",
    emptyInputExercised: "Clicking insert with empty input displayed fallback: 'Please enter text to insert.'",
    validInputExercised: "Inserted 'Prefix-' and '-Suffix' correctly via insertAdjacentText.",
    resetExercised: "Reset restored original text and state.",
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: empty input and error fallback exercised with visible messaging.`);

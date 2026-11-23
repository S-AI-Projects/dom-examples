import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T024";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  // Deterministic stub for window.LanguageModel
  await page.addInitScript(() => {
    let sessionCount = 0;
    window.__sessionCount = () => sessionCount;

    window.LanguageModel = {
      availability: async () => "available",
      create: async ({ initialPrompts }) => {
        sessionCount += 1;
        return {
          contextUsage: 50,
          contextWindow: 2048,
          prompt: async (text, { signal } = {}) => {
            if (text === "slow") {
              return new Promise((resolve, reject) => {
                const timer = setTimeout(() => resolve("Slow answer"), 5000);
                signal?.addEventListener("abort", () => {
                  clearTimeout(timer);
                  reject(new DOMException("Query aborted by user.", "AbortError"));
                });
              });
            }
            return `AI reply for: ${text}`;
          },
        };
      },
    };
  });

  await page.goto(`${baseUrl}/prompt-api-web-storage/index.html`, { waitUntil: "load" });

  const textarea = page.locator("#prompt-text");
  const submitBtn = page.locator("#submit");
  const abortBtn = page.locator("#abort");
  const deleteBtn = page.locator("#delete-session");
  const output = page.locator(".prompt-output");

  // Verify all source anchors
  assert.equal(await textarea.count(), 1, "#prompt-text must exist");
  assert.equal(await submitBtn.count(), 1, "#submit must exist");
  assert.equal(await abortBtn.count(), 1, "#abort must exist");
  assert.equal(await deleteBtn.count(), 1, "#delete-session must exist");

  // Baseline: submit and abort are disabled initially
  assert.equal(await submitBtn.isDisabled(), true, "submit initially disabled");
  assert.equal(await abortBtn.isDisabled(), true, "abort initially disabled");

  // 1. Focus textarea repeatedly - should initialize session exactly once
  await textarea.focus();
  await page.waitForFunction(() => document.querySelector(".prompt-output").textContent.includes("Session created"));
  await textarea.blur();
  await textarea.focus();

  const sessionsCreated = await page.evaluate(() => window.__sessionCount());
  assert.equal(sessionsCreated, 1, "repeated focus must not duplicate session creation");
  assert.equal(await submitBtn.isEnabled(), true, "submit button enabled after init");

  // 2. First interaction / query
  await textarea.fill("Hello AI");
  await submitBtn.click();
  await page.waitForFunction(() => document.querySelector(".prompt-output").textContent.includes("AI reply for: Hello AI"));

  // Check localStorage contains history
  const history1 = await page.evaluate(() => JSON.parse(localStorage.getItem("promptHistory") || "[]"));
  assert.equal(history1.length, 2, "history has 1 user and 1 assistant entry");
  assert.equal(await deleteBtn.isEnabled(), true, "delete button enabled when history exists");

  // 3. Second interaction / query - verify handlers and state work seamlessly
  await textarea.fill("Second question");
  await submitBtn.click();
  await page.waitForFunction(() => document.querySelector(".prompt-output").textContent.includes("AI reply for: Second question"));

  const history2 = await page.evaluate(() => JSON.parse(localStorage.getItem("promptHistory") || "[]"));
  assert.equal(history2.length, 4, "history updated to 4 entries without duplication");

  // 4. Test abort interaction
  await textarea.fill("slow");
  await submitBtn.click();
  assert.equal(await abortBtn.isEnabled(), true, "abort enabled while generating");
  await abortBtn.click();
  await page.waitForFunction(() => document.querySelector(".prompt-output").textContent.includes("Query aborted"));
  assert.equal(await submitBtn.isEnabled(), true, "submit re-enabled after abort");
  assert.equal(await abortBtn.isDisabled(), true, "abort disabled after aborting");

  // 5. Test history deletion
  await deleteBtn.click();
  const historyCleared = await page.evaluate(() => localStorage.getItem("promptHistory"));
  assert.equal(historyCleared, null, "localStorage promptHistory removed");
  assert.equal(await deleteBtn.isDisabled(), true, "delete button disabled when history cleared");

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    baseline: "Initial page loaded with disabled submit/abort controls.",
    repeatInit: "Multiple focus calls resulted in exactly 1 session initialization.",
    repeatInteractions: "Submitted multiple queries successfully without duplicated listeners or orphaned state.",
    abortHandled: true,
    historyCleared: true,
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: repeated initialization and multiple interactions verified cleanly.`);

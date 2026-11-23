import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T028";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  // 1. Verify source anchors on main page
  await page.goto(`${baseUrl}/webxr/index.html`, { waitUntil: "domcontentloaded" });

  const enterXr = page.locator("#enter-xr");
  const projMat = page.locator("#projection-matrix");
  const modelMat = page.locator("#model-view-matrix");
  const cameraMat = page.locator("#camera-matrix");

  assert.equal(await enterXr.count(), 1, "#enter-xr must exist on main page");
  assert.equal(await projMat.count(), 1, "#projection-matrix must exist on main page");
  assert.equal(await modelMat.count(), 1, "#model-view-matrix must exist on main page");
  assert.equal(await cameraMat.count(), 1, "#camera-matrix must exist on main page");

  // 2. Test safe text rendering companion
  await page.goto(`${baseUrl}/webxr/safe-text.html`, { waitUntil: "load" });

  const input = page.locator("#text-input");
  const renderBtn = page.locator("#render-text");
  const output = page.locator("#text-output");

  assert.equal(await input.count(), 1, "#text-input must exist on companion page");
  assert.equal(await renderBtn.count(), 1, "#render-text button must exist on companion page");
  assert.equal(await output.count(), 1, "#text-output must exist on companion page");

  // Inject attack payload simulating unescaped HTML/script
  const payload = '<img src=x onerror="window.__injected = true">';
  await input.fill(payload);
  await renderBtn.click();

  // Assert output treats payload strictly as plain text
  const renderedText = await output.textContent();
  assert.equal(renderedText, payload, "Fixture string rendered exactly as literal text");

  // Assert no img elements were created in DOM
  const imgCount = await output.locator("img").count();
  assert.equal(imgCount, 0, "No img element created by payload string");

  // Assert script didn't execute
  const wasInjected = await page.evaluate(() => window.__injected);
  assert.equal(wasInjected, undefined, "Payload onerror script was not executed");

  // Assert child element count is 0 (pure text node)
  const childCount = await output.evaluate((el) => el.childElementCount);
  assert.equal(childCount, 0, "Output container has zero child elements");

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    mainAnchorsVerified: ["#enter-xr", "#projection-matrix", "#model-view-matrix", "#camera-matrix"],
    companionTested: "webxr/safe-text.html",
    testPayload: payload,
    renderedAsTextOnly: true,
    scriptExecutionPrevented: true,
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: source anchors verified and fixture text rendered safely as text.`);

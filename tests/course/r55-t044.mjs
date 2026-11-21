import assert from "node:assert/strict";
import { runBrowserTest } from "./browser-harness.mjs";

await runBrowserTest("R55-T044", async ({ baseUrl, page }) => {
  await page.addInitScript(() => {
    const add = window.addEventListener.bind(window);
    window.__resizeListenerCount = 0;
    window.addEventListener = (type, listener, options) => {
      if (type === "resize") window.__resizeListenerCount += 1;
      return add(type, listener, options);
    };
  });
  await page.goto(`${baseUrl}/resize-event/`);
  assert.equal(await page.evaluate(() => window.__resizeListenerCount), 1, "initialization registers one resize handler");
  assert.equal(await page.locator("#height").count(), 1);
  assert.equal(await page.locator("#width").count(), 1);

  for (const [width, height] of [[640, 480], [900, 700], [640, 480]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() =>
      document.querySelector("#width").textContent === String(window.innerWidth) &&
      document.querySelector("#height").textContent === String(window.innerHeight)
    );
    assert.equal(await page.evaluate(() => window.__resizeListenerCount), 1, "repeat interactions do not add handlers");
  }
  assert.equal(await page.locator("body p").count(), 3, "repeat interactions do not duplicate DOM nodes");
});

console.log("R55-T044 passed: one listener and stable DOM after three viewport updates.");

import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot } from "./browser-harness.mjs";

await runBrowserTest("R55-T049", async ({ baseUrl, browser, page }) => {
  const pageErrors = [];
  for (const width of [360, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) =>
      route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()
    );
    const target = await context.newPage();
    target.on("pageerror", (error) => pageErrors.push(error.message));
    await target.goto(`${baseUrl}/canvas/chroma-keying/`);
    await assert.equal(await target.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    assert.equal(await target.locator("#video").evaluate((video) => video.paused), true, "the demo does not start moving without user input");
    await target.keyboard.press("Tab");
    assert.equal(await target.locator("#video").evaluate((video) => video === document.activeElement), true);
    const focus = await target.locator("#video").evaluate((video) => {
      const style = getComputedStyle(video);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    assert.notEqual(focus.outlineStyle, "none", "video controls keep a visible focus ring");
    assert.ok(parseFloat(focus.outlineWidth) >= 3, "focus ring is at least 3px wide");
    assert.equal(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `layout fits ${width}px`);
    if (width === 360) await saveScreenshot(target, "R55-T049");
    await context.close();
  }
  await page.goto(`${baseUrl}/canvas/chroma-keying/`);
  await assert.equal(await page.locator("#motion-note").innerText(), "Motion starts only when you choose Play. Reduced-motion users can leave the video paused.");
  assert.deepEqual(pageErrors, [], "both reduced-motion contexts have no uncaught page errors");
});

console.log("R55-T049 passed: reduced-motion default, keyboard focus, and narrow/wide layouts.");

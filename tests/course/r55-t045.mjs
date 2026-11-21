import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot } from "./browser-harness.mjs";

await runBrowserTest("R55-T045", async ({ baseUrl, browser, page }) => {
  const snapshots = [];
  const extraContexts = [];
  const extraErrors = [];
  for (let run = 0; run < 2; run += 1) {
    let target = page;
    if (run === 1) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
      extraContexts.push(context);
      await context.route("**/*", (route) =>
        route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()
      );
      target = await context.newPage();
      target.on("pageerror", (error) => extraErrors.push(error.message));
    }
    await target.setViewportSize({ width: 1024, height: 768 });
    await target.goto(`${baseUrl}/visual-viewport-api/`);
    await target.waitForFunction(() => document.querySelector("#visual-info").textContent.includes("Visual viewport left:"));
    await target.evaluate(() => window.scrollTo(0, 120));
    await target.waitForFunction(() => document.querySelector("#window-info").textContent.includes("scrollY: 120.00"));
    snapshots.push({
      visual: await target.locator("#visual-info").innerText(),
      window: await target.locator("#window-info").innerText(),
      background: await target.locator("#output").evaluate((element) => getComputedStyle(element).backgroundColor),
      bounds: await target.locator("#output").evaluate((element) => {
        const { top, left } = element.getBoundingClientRect();
        return { top, left };
      }),
    });
    if (run === 0) await saveScreenshot(target, "R55-T045");
    if (target !== page) await target.context().close();
  }
  assert.deepEqual(snapshots[0], snapshots[1], "controlled viewport and scroll produce the same DOM and layout twice");
  assert.match(snapshots[0].window, /scrollY: 120\.00/);
  assert.equal(snapshots[0].background, "rgb(255, 255, 0)", "scroll updates the demo highlight");
  assert.deepEqual(extraErrors, [], "second fresh context has no uncaught page errors");
  await Promise.all(extraContexts.map((context) => context.close()));
});

console.log("R55-T045 passed: repeated local runs match at a fixed viewport and scroll position.");

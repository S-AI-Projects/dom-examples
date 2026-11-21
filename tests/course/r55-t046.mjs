import assert from "node:assert/strict";
import { runBrowserTest } from "./browser-harness.mjs";

await runBrowserTest("R55-T046", async ({ baseUrl, browser, page }) => {
  await page.goto(`${baseUrl}/mediaquerylist/`);
  await page.setViewportSize({ width: 480, height: 800 });
  await page.waitForFunction(() => document.querySelector("#feature-status").textContent.includes("narrow screen"));
  assert.equal(await page.locator("#feature-status").innerText(), "This is a narrow screen — less than 600px wide.");
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor), "rgb(255, 0, 0)");
  await page.setViewportSize({ width: 800, height: 800 });
  await page.waitForFunction(() => document.querySelector("#feature-status").textContent.includes("wide screen"));
  assert.equal(await page.locator("#feature-status").innerText(), "This is a wide screen — more than 600px wide.");

  const unsupported = await browser.newContext({ viewport: { width: 480, height: 800 } });
  await unsupported.route("**/*", (route) =>
    route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()
  );
  await unsupported.addInitScript(() => { window.matchMedia = undefined; });
  const fallbackPage = await unsupported.newPage();
  const errors = [];
  fallbackPage.on("pageerror", (error) => errors.push(error.message));
  await fallbackPage.goto(`${baseUrl}/mediaquerylist/`);
  assert.equal(
    await fallbackPage.locator("#feature-status").innerText(),
    "Media queries are unavailable in this browser. The example content remains available."
  );
  assert.deepEqual(errors, [], "unsupported feature path is explicit and error-free");
  await unsupported.close();
});

console.log("R55-T046 passed: narrow, wide, and unavailable matchMedia paths.");

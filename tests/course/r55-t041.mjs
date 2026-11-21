import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot } from "./browser-harness.mjs";

await runBrowserTest("R55-T041", async ({ baseUrl, page }) => {
  await page.goto(`${baseUrl}/web-speech-api/`);
  const skipLink = page.getByRole("link", { name: "Skip to examples" });
  await page.keyboard.press("Tab");
  await assert.equal(await skipLink.evaluate((element) => element === document.activeElement), true);
  const focusStyle = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { display: style.display, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  assert.notEqual(focusStyle.display, "none", "skip link is visible when focused");
  assert.notEqual(focusStyle.outlineStyle, "none", "keyboard focus has an indicator");
  await page.keyboard.press("Enter");
  await assert.equal(new URL(page.url()).hash, "#main-content");
  await assert.equal(await page.locator("main").evaluate((element) => element === document.activeElement), true);

  const links = page.locator("main a");
  const count = await links.count();
  assert.ok(count >= 5, "the example index keeps its destinations");
  const positiveTabIndex = await page.locator("[tabindex]").evaluateAll((elements) =>
    elements.filter((element) => Number(element.getAttribute("tabindex")) > 0).length
  );
  assert.equal(positiveTabIndex, 0, "the page does not reorder keyboard traversal with positive tabindex");
  await page.keyboard.press("Tab");
  assert.equal(await links.first().evaluate((element) => element === document.activeElement), true);
  const firstLinkFocus = await links.first().evaluate((element) => getComputedStyle(element).outlineStyle);
  assert.notEqual(firstLinkFocus, "none", "the first example link keeps a visible focus style");
  for (let index = 1; index < count; index += 1) {
    await page.keyboard.press("Tab");
    assert.equal(
      await links.nth(index).evaluate((element) => element === document.activeElement),
      true,
      `Tab reaches link ${index + 1} in document order`
    );
  }
  await saveScreenshot(page, "R55-T041");
  await links.first().focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/web-speech-api/phrase-matcher/index.html");
  assert.match(page.url(), /phrase-matcher\/index\.html$/);
});

console.log("R55-T041 passed: skip navigation, focus visibility, Tab order, and keyboard activation.");

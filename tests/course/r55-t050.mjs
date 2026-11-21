import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot } from "./browser-harness.mjs";

function assertOpacity(alpha, expected) {
  assert.equal(alpha, expected, "the typed-arithmetic overlay must track viewport width");
}

function alphaFromBackground(background) {
  const match = background.match(/rgba\(255, 255, 255, ([0-9.]+)\)/);
  assert.ok(match, `expected a white gradient overlay, got: ${background}`);
  return Number(match[1]);
}

await runBrowserTest("R55-T050", async ({ baseUrl, page }) => {
  await page.goto(`${baseUrl}/css-typed-arithmetic/`);
  const exampleLink = page.getByRole("link", { name: "Responsive background opacity" });
  await assert.equal(await exampleLink.getAttribute("href"), "responsive-background-opacity/index.html");
  await exampleLink.click();
  await page.setViewportSize({ width: 1000, height: 800 });
  const expected = 0.5;
  const correctBackground = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundImage);
  const correctAlpha = alphaFromBackground(correctBackground);
  assertOpacity(correctAlpha, expected);
  await saveScreenshot(page, "R55-T050");

  await page.route("**/responsive-background-opacity/style.css", async (route) => {
    const response = await route.fetch();
    const css = await response.text();
    await route.fulfill({ response, body: `${css}\n:root { --width-percentage: 0; }\n` });
  });
  await page.reload();
  const brokenBackground = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundImage);
  const brokenAlpha = alphaFromBackground(brokenBackground);
  let detected = false;
  try {
    assertOpacity(brokenAlpha, expected);
  } catch (error) {
    assert.match(error.message, /typed-arithmetic overlay must track viewport width/);
    detected = true;
  }
  assert.equal(detected, true, "the same assertion rejects a deliberately broken temporary style fixture");
});

console.log("R55-T050 passed: real typed-arithmetic output is correct and the temporary broken fixture is rejected.");

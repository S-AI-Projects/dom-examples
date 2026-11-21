import assert from "node:assert/strict";
import { runBrowserTest } from "./browser-harness.mjs";

await runBrowserTest("R55-T048", async ({ baseUrl, page }) => {
  await page.goto(`${baseUrl}/webgl-examples/tutorial/sample1/safe-text.html`);
  const input = page.getByLabel("Text to display");
  await input.fill('<img src=x onerror="window.__injected = true">');
  await page.getByRole("button", { name: "Render text" }).click();
  const output = page.locator("#text-output");
  assert.equal(await output.textContent(), '<img src=x onerror="window.__injected = true">');
  assert.equal(await output.locator("img").count(), 0, "HTML-looking text does not create an image element");
  assert.equal(await page.evaluate(() => window.__injected), undefined, "text fixture does not execute an event handler");
  assert.equal(await output.evaluate((element) => element.childElementCount), 0, "output contains text only");
});

console.log("R55-T048 passed: injected-looking fixture remains text and executes no handler.");

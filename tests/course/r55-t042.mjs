import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot } from "./browser-harness.mjs";

await runBrowserTest("R55-T042", async ({ baseUrl, page }) => {
  await page.goto(`${baseUrl}/channel-messaging-multimessage/`);
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `page has no unintended horizontal overflow at ${width}px`
    );
    const iframe = await page.locator("iframe").boundingBox();
    const input = await page.locator("#message-input").boundingBox();
    const button = await page.getByRole("button", { name: "Send Message" }).boundingBox();
    assert.ok(iframe.x >= 0 && iframe.x + iframe.width <= width, "the intentionally scrollable frame fits its layout slot");
    assert.ok(input.x >= 0 && input.x + input.width <= width, "message input is not clipped");
    assert.ok(button.x >= 0 && button.x + button.width <= width, "send button is not clipped");
    const order = await page.evaluate(() => {
      const tags = ["h1", "#message-output", "form", "iframe"].map((selector) =>
        document.querySelector(selector).getBoundingClientRect().top
      );
      return tags.every((top, index) => index === 0 || top >= tags[index - 1]);
    });
    assert.equal(order, true, "content keeps a readable top-to-bottom order");
    await saveScreenshot(page, "R55-T042", `${width}px.png`);
  }

  await page.locator("#message-input").fill("responsive message");
  await page.getByRole("button", { name: "Send Message" }).click();
  await page.waitForFunction(() => document.querySelector("#message-output").textContent.includes("responsive message"));
  await page.waitForFunction(() => document.querySelector("iframe").contentDocument.querySelectorAll("li").length === 1);
  assert.match(await page.locator("#message-output").innerText(), /responsive message/);
});

console.log("R55-T042 passed: 360px and 1280px layouts, content order, and message interaction.");

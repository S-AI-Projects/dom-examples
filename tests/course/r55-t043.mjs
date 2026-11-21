import assert from "node:assert/strict";
import { runBrowserTest } from "./browser-harness.mjs";

await runBrowserTest("R55-T043", async ({ baseUrl, browser, page }) => {
  await page.addInitScript(() => {
    window.MediaSource = { isTypeSupported: () => false };
  });
  await page.goto(`${baseUrl}/sourcebuffer/`);
  await page.getByRole("button", { name: "Load" }).click();
  await assert.equal(await page.locator("#status").innerText(), "This browser cannot play this example's video format.");

  async function exerciseFailureAndRecovery() {
    const recoveryContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await recoveryContext.route("**/*", (route) =>
      route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()
    );
    const recoveryPage = await recoveryContext.newPage();
    const recoveryErrors = [];
    recoveryPage.on("pageerror", (error) => recoveryErrors.push(error.message));
    await recoveryPage.addInitScript(() => {
    class MockSourceBuffer extends EventTarget {
      appendBuffer() {
        queueMicrotask(() => this.dispatchEvent(new Event("updateend")));
      }
    }
    class MockMediaSource extends EventTarget {
      static isTypeSupported() { return true; }
      constructor() {
        super();
        queueMicrotask(() => this.dispatchEvent(new Event("sourceopen")));
      }
      addSourceBuffer() { return new MockSourceBuffer(); }
      endOfStream() { this.readyState = "ended"; }
    }
    window.MediaSource = MockMediaSource;
    URL.createObjectURL = () => "blob:sourcebuffer-fixture";
    URL.revokeObjectURL = () => {};
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    });
    let responseStatus = 503;
    await recoveryPage.route("**/frag_bunny.mp4", (route) =>
      route.fulfill({ status: responseStatus, body: responseStatus === 200 ? "fixture video bytes" : "missing fixture" })
    );
    await recoveryPage.goto(`${baseUrl}/sourcebuffer/`);
    await recoveryPage.getByRole("button", { name: "Load" }).click();
    await recoveryPage.getByText("Unable to load the video. Check the local asset and try again.").waitFor();
    responseStatus = 200;
    await recoveryPage.getByRole("button", { name: "Load" }).click();
    await recoveryPage.getByText("Video loaded from the local fixture.").waitFor();
    assert.deepEqual(recoveryErrors, [], "request outcome does not produce uncaught page errors");
    await recoveryContext.close();
  }

  await exerciseFailureAndRecovery();
});

console.log("R55-T043 passed: unsupported format fallback, failed asset handling, and valid fixture recovery.");

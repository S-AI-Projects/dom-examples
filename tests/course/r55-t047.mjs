import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot } from "./browser-harness.mjs";

await runBrowserTest("R55-T047", async ({ baseUrl, page }) => {
  await page.addInitScript(() => {
    window.__fixtureReports = [{ type: "deprecation", body: { id: "fixture-warning", message: "Local test report" } }];
    window.ReportingObserver = class {
      constructor(callback) { this.callback = callback; }
      observe() { this.callback(window.__fixtureReports, this); }
      takeRecords() { return []; }
      disconnect() {}
    };
    Object.defineProperty(navigator, "getUserMedia", { configurable: true, value: () => {} });
  });
  await page.goto(`${baseUrl}/reporting-api/deprecation_report.html`);
  await page.getByRole("heading", { name: "Deprecation report walkthrough" }).waitFor();
  await assert.equal(await page.locator("video").count(), 1);
  await page.getByRole("button", { name: "Show reports" }).click();
  await page.getByText("Report 1, type: deprecation").waitFor();
  await page.getByText("id: fixture-warning").waitFor();
  await page.getByText("message: Local test report").waitFor();
  await saveScreenshot(page, "R55-T047");
});

console.log("R55-T047 passed: documented entry point, observer report fixture, and button walkthrough.");

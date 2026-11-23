import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T022";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  await page.goto(`${baseUrl}/navigation-api/index.html`, { waitUntil: "load" });

  const consoleElem = page.locator("#console");
  const cancelNav = page.locator("#cancel-navigation");
  const addDelay = page.locator("#add-delay");
  const dialogElem = page.locator("#are-you-sure");

  assert.equal(await consoleElem.count(), 1, "#console must exist");
  assert.equal(await cancelNav.count(), 1, "#cancel-navigation must exist");
  assert.equal(await addDelay.count(), 1, "#add-delay must exist");
  assert.equal(await dialogElem.count(), 1, "#are-you-sure dialog must exist");

  // Verify DOM order
  const orderValid = await page.evaluate(() => {
    const main = document.querySelector("main");
    const consoleEl = document.querySelector("#console");
    const cancelNavEl = document.querySelector("#cancel-navigation");
    const addDelayEl = document.querySelector("#add-delay");
    const footer = document.querySelector("footer");
    return (
      main.compareDocumentPosition(consoleEl) & Node.DOCUMENT_POSITION_FOLLOWING &&
      consoleEl.compareDocumentPosition(cancelNavEl) & Node.DOCUMENT_POSITION_FOLLOWING &&
      cancelNavEl.compareDocumentPosition(addDelayEl) & Node.DOCUMENT_POSITION_FOLLOWING &&
      addDelayEl.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
  assert.ok(orderValid, "DOM order must follow: main -> #console -> #cancel-navigation -> #add-delay -> footer");

  // Populate console with long message to simulate log/error output
  await page.evaluate(() => {
    const el = document.querySelector("#console");
    el.textContent = "Error: A very long unbreaking error log entry testing pre-wrap behavior: https://example.com/very/long/url/path/that/could/cause/horizontal/overflow/if/not/properly/wrapped/in/css/console/container";
  });

  const viewports = [
    { width: 360, height: 800, name: "mobile" },
    { width: 1280, height: 800, name: "desktop" },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const overflowInfo = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
      };
    });

    assert.equal(
      overflowInfo.hasHorizontalOverflow,
      false,
      `No unintended horizontal overflow at ${vp.width}x${vp.height} (scrollWidth=${overflowInfo.scrollWidth}, clientWidth=${overflowInfo.clientWidth})`
    );

    // Check control visibility and bounds
    for (const locator of [consoleElem, cancelNav, addDelay]) {
      const box = await locator.boundingBox();
      assert.ok(box, `Element must have layout box at ${vp.width}px`);
      assert.ok(box.x >= 0, `Element x-coord must be >= 0 at ${vp.width}px`);
      assert.ok(box.x + box.width <= vp.width + 1, `Element must fit horizontally within ${vp.width}px`);
    }

    await saveScreenshot(page, taskId, `${vp.name}.png`);
  }

  // Test dialog layout
  await page.evaluate(() => {
    document.querySelector("#are-you-sure").showModal();
  });

  const dialogBox = await dialogElem.boundingBox();
  assert.ok(dialogBox, "Dialog must have a visible layout box when open");
  assert.ok(dialogBox.width <= 1280, "Dialog must fit within viewport");

  await recordEvidence(taskId, {
    testedViewports: ["360x800", "1280x800"],
    overflowCheckPassed: true,
    contentOrderVerified: true,
    dialogRendered: true,
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: layout tested at 360x800 and 1280x800 without unintended horizontal overflow.`);

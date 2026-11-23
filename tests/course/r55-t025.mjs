import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T025";

await runBrowserTest(taskId, async ({ baseUrl, page, pageErrors, consoleErrors }) => {
  // Lock viewport deterministically
  await page.setViewportSize({ width: 1280, height: 800 });

  // Lock fonts and layout deterministically before page styles load
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.id = "deterministic-fixtures";
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: monospace; font-size: 16px; line-height: 1.5; }
      #host { display: block; padding: 10px; }
    `;
    document.addEventListener("DOMContentLoaded", () => {
      document.head.prepend(style);
    });
  });

  await page.goto(`${baseUrl}/shadow-dom/shadowrootmode/simple.html`, { waitUntil: "load" });

  const hostLocator = page.locator("#host");
  assert.equal(await hostLocator.count(), 1, "#host must exist in the document");

  // 1. Verify open declarative shadow root attachment
  const shadowInfo = await hostLocator.evaluate((el) => {
    const sr = el.shadowRoot;
    if (!sr) return null;
    const span = sr.querySelector("span");
    return {
      hasShadowRoot: true,
      mode: sr.mode,
      shadowSpanText: span ? span.textContent : null,
      lightSpanCount: document.querySelectorAll("span").length,
    };
  });

  assert.ok(shadowInfo, "#host must possess a shadowRoot");
  assert.equal(shadowInfo.hasShadowRoot, true, "Declarative shadow root is attached");
  assert.equal(shadowInfo.mode, "open", "shadow root mode must be 'open'");
  assert.equal(shadowInfo.shadowSpanText, "I'm in the shadow DOM", "shadow span text matches expected string");
  assert.equal(shadowInfo.lightSpanCount, 0, "light DOM must encapsulate shadow elements (span not found globally)");

  // 2. Deterministic layout metrics
  const hostBox = await hostLocator.boundingBox();
  assert.ok(hostBox, "#host must have a computed bounding box");
  assert.ok(hostBox.width > 0 && hostBox.height > 0, "host element has positive dimensions");
  assert.equal(hostBox.x, 0, "host element aligned to left margin with deterministic fixtures");

  await saveScreenshot(page, taskId, "after.png");

  await recordEvidence(taskId, {
    baseline: "Page contains #host with declarative <template shadowrootmode='open'>.",
    fixtures: {
      viewport: "1280x800",
      fontFixture: "monospace 16px locked",
      network: "local only, no external calls",
    },
    shadowDOMVerified: shadowInfo,
    layoutBox: hostBox,
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: declarative shadow DOM verified with deterministic local fixtures.`);

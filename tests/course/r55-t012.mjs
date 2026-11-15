import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");

const BASE_URL = "http://127.0.0.1:4174/edit-context/html-editor/";
const OUTPUT_DIR = "work/R55-T012";

async function waitForServer(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error("Local server did not start");
}

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const server = spawn("python3", ["-m", "http.server", "4174"], {
    stdio: "ignore"
  });

  let browser;

  try {
    await waitForServer(BASE_URL);

    browser = await chromium.launch({ headless: true });

    const results = [];

    for (const viewport of [
      { width: 360, height: 800, name: "mobile" },
      { width: 1280, height: 800, name: "desktop" }
    ]) {
      const page = await browser.newPage({
        viewport: {
          width: viewport.width,
          height: viewport.height
        }
      });

      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));

      await page.goto(BASE_URL);
      await page.waitForTimeout(300);

      const measurements = await page.evaluate(() => {
        const editor = document.querySelector("#html-editor");
        if (!editor) throw new Error("#html-editor was not found");

        const rect = editor.getBoundingClientRect();
        const style = getComputedStyle(editor);

        return {
          viewportWidth: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          documentClientWidth: document.documentElement.clientWidth,
          editorLeft: rect.left,
          editorRight: rect.right,
          editorWidth: rect.width,
          editorScrollWidth: editor.scrollWidth,
          editorClientWidth: editor.clientWidth,
          overflow: style.overflow,
          whiteSpace: style.whiteSpace,
          editContextSupported: "EditContext" in window
        };
      });

      assert.equal(
        measurements.documentWidth,
        measurements.documentClientWidth,
        `${viewport.name}: page has horizontal overflow`
      );

      assert.ok(
        measurements.editorLeft >= 0,
        `${viewport.name}: editor extends beyond the left edge`
      );

      assert.ok(
        measurements.editorRight <= viewport.width + 1,
        `${viewport.name}: editor extends beyond the right edge`
      );

      assert.equal(measurements.overflow, "auto");
      assert.equal(measurements.whiteSpace, "pre");
      assert.equal(measurements.editContextSupported, true);
      assert.deepEqual(pageErrors, []);

      await page.screenshot({
        path: `${OUTPUT_DIR}/changed-${viewport.name}.png`,
        fullPage: true
      });

      results.push({
        viewport: `${viewport.width}x${viewport.height}`,
        measurements,
        pageErrors
      });

      await page.close();
    }

    const keyboardPage = await browser.newPage({
      viewport: { width: 360, height: 800 }
    });

    const keyboardErrors = [];
    keyboardPage.on("pageerror", error =>
      keyboardErrors.push(error.message)
    );

    await keyboardPage.goto(BASE_URL);
    await keyboardPage.waitForTimeout(300);

    const editor = keyboardPage.locator("#html-editor");
    await editor.click();
    await keyboardPage.keyboard.press("End");
    await keyboardPage.keyboard.press("Enter");
    await keyboardPage.keyboard.press("Tab");

    const keyboardResult = await editor.innerText();

    assert.ok(
      keyboardResult.endsWith("\n\t"),
      "Enter and Tab should insert a newline and tab"
    );

    assert.deepEqual(keyboardErrors, []);

    results.push({
      keyboardTest: "PASS",
      newlineAndTabInserted: true,
      pageErrors: keyboardErrors
    });

    await keyboardPage.close();

    fs.writeFileSync(
      `${OUTPUT_DIR}/changed-results.json`,
      JSON.stringify(results, null, 2) + "\n"
    );

    console.log("R55-T012: PASS");
    console.log(JSON.stringify(results, null, 2));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});

function assertEditorExists(editor) {
  if (!editor) throw new Error("#html-editor was not found");
}

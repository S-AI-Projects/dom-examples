import assert from "node:assert/strict";
import { runBrowserTest, saveScreenshot, recordEvidence } from "./browser-harness.mjs";

const taskId = "R55-T026";

await runBrowserTest(taskId, async ({ baseUrl, context, page, pageErrors, consoleErrors }) => {
  // --- Test Path 1: Feature Present ---
  await page.goto(`${baseUrl}/streams/simple-pump/index.html`, { waitUntil: "load" });

  const targetImg = page.locator("#target");
  const statusElem = page.locator("#stream-status");

  assert.equal(await targetImg.count(), 1, "#target image element must exist");
  assert.equal(await statusElem.count(), 1, "Status element must exist");

  // Wait for stream to pump and image src to be set to a blob: URL
  await page.waitForFunction(() => {
    const img = document.getElementById("target");
    return img && img.src && img.src.startsWith("blob:");
  });

  const imgSrc = await targetImg.getAttribute("src");
  assert.ok(imgSrc.startsWith("blob:"), "Target image src must be a valid blob URL");
  const successStatus = await statusElem.innerText();
  assert.match(successStatus, /Stream pumped successfully/, "Success message displayed on completed stream");

  await saveScreenshot(page, taskId, "feature-present.png");

  // --- Test Path 2: Feature Absent (Unsupported Environment) ---
  const absentPage = await context.newPage();
  const absentErrors = [];
  absentPage.on("pageerror", (err) => absentErrors.push(err.message));

  await absentPage.addInitScript(() => {
    delete window.ReadableStream;
  });

  await absentPage.goto(`${baseUrl}/streams/simple-pump/index.html`, { waitUntil: "load" });

  const absentStatus = absentPage.locator("#stream-status");
  const absentTarget = absentPage.locator("#target");

  assert.equal(
    await absentStatus.innerText(),
    "ReadableStream API is not supported in this browser.",
    "Explicit, clear message shown when ReadableStream is absent"
  );

  const isTargetHidden = await absentTarget.evaluate((img) => getComputedStyle(img).display === "none");
  assert.equal(isTargetHidden, true, "#target element hidden gracefully when unsupported");
  assert.deepEqual(absentErrors, [], "No uncaught errors on unsupported path");

  await saveScreenshot(absentPage, taskId, "feature-absent.png");
  await absentPage.close();

  await recordEvidence(taskId, {
    featurePresent: {
      blobUrlAssigned: true,
      status: successStatus,
    },
    featureAbsent: {
      handledExplicitly: true,
      statusMessage: "ReadableStream API is not supported in this browser.",
      targetHidden: true,
    },
    pageErrors,
    consoleErrors,
  });
});

console.log(`${taskId} passed: both feature-present and feature-absent paths verified gracefully.`);

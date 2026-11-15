import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:8000/abort-api/';

async function createPage(browser, options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const pageErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(BASE_URL);

  return { context, page, pageErrors };
}

async function testInitialState(browser) {
  const { context, page, pageErrors } = await createPage(browser);

  await page.getByRole('heading', {
    name: 'Simple offline video player'
  }).waitFor();

  assert.equal(
    await page.getByRole('button', { name: 'Download video' }).isVisible(),
    true
  );

  assert.equal(
    await page.getByRole('button', { name: 'Cancel download' }).isVisible(),
    false
  );

  assert.equal(await page.locator('video').count(), 0);
  assert.equal(await page.locator('.videoWrapper').isVisible(), false);

  await page.keyboard.press('Tab');

  const focus = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    text: document.activeElement.innerText,
    outline: getComputedStyle(document.activeElement).outlineStyle
  }));

  assert.equal(focus.tag, 'BUTTON');
  assert.equal(focus.text, 'Download video');
  assert.notEqual(focus.outline, 'none');

  assert.deepEqual(pageErrors, []);
  await context.close();

  console.log('PASS: initial state and keyboard focus');
}

async function testReducedMotion(browser) {
  for (const preference of ['no-preference', 'reduce']) {
    const { context, page, pageErrors } = await createPage(browser, {
      reducedMotion: preference
    });

    const result = await page.evaluate(() => ({
      reducedMotion: matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches,
      animations: document.getAnimations().length
    }));

    assert.equal(result.reducedMotion, preference === 'reduce');
    assert.equal(result.animations, 0);
    assert.deepEqual(pageErrors, []);

    await context.close();
  }

  console.log('PASS: reduced-motion preference');
}

async function testResponsiveLayout(browser) {
  const { context, page, pageErrors } = await createPage(browser);

  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });

    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      wrapper: document.querySelector('.wrapper')
        .getBoundingClientRect().width
    }));

    assert.equal(result.viewport, width);
    assert.ok(result.document <= result.viewport);
    assert.ok(result.wrapper <= result.viewport);
    assert.ok(result.wrapper <= 800);
  }

  assert.deepEqual(pageErrors, []);
  await context.close();

  console.log('PASS: responsive layout at 375px and 1280px');
}

async function testSuccessfulDownload(browser) {
  const { context, page, pageErrors } = await createPage(browser);

  await page.route('**/sintel.mp4', route =>
    route.fulfill({
      status: 200,
      contentType: 'video/mp4',
      body: Buffer.from('test-video-content')
    })
  );

  await page.getByRole('button', { name: 'Download video' }).click();

  await page.locator('video').waitFor();

  assert.equal(await page.locator('video').isVisible(), true);
  assert.equal(await page.locator('.videoWrapper').isVisible(), true);

  assert.equal(
    await page.getByRole('link', { name: 'www.sintel.org' }).isVisible(),
    true
  );

  assert.equal(
    await page.getByRole('button', { name: 'Cancel download' }).isVisible(),
    false
  );

  assert.match(
    await page.locator('.reports').innerText(),
    /Video ready to play/
  );

  await page.keyboard.press('Tab');

  const focus = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    outline: getComputedStyle(document.activeElement).outlineStyle
  }));

  assert.equal(focus.tag, 'A');
  assert.notEqual(focus.outline, 'none');

  assert.deepEqual(pageErrors, []);
  await context.close();

  console.log('PASS: successful download and Sintel link focus');
}

async function testCancellation(browser) {
  const { context, page, pageErrors } = await createPage(browser);

  await page.route('**/sintel.mp4', route =>
    new Promise(resolve => {
      setTimeout(async () => {
        await route.fulfill({
          status: 200,
          body: 'delayed test response'
        });
        resolve();
      }, 5000);
    })
  );

  await page.getByRole('button', { name: 'Download video' }).focus();
  await page.keyboard.press('Enter');

  const cancelButton = page.getByRole('button', {
    name: 'Cancel download'
  });

  await cancelButton.waitFor({ state: 'visible' });

  await page.keyboard.press('Tab');

  const focus = await page.evaluate(() => ({
    text: document.activeElement.innerText,
    outline: getComputedStyle(document.activeElement).outlineStyle
  }));

  assert.equal(focus.text, 'Cancel download');
  assert.notEqual(focus.outline, 'none');

  await page.keyboard.press('Enter');

  await cancelButton.waitFor({ state: 'hidden' });

  assert.equal(
    await page.getByRole('button', { name: 'Download video' }).isVisible(),
    true
  );

  assert.match(
    await page.locator('.reports').innerText(),
    /Download error:/
  );

  assert.equal(await page.locator('video').count(), 0);
  assert.deepEqual(pageErrors, []);

  await context.close();

  console.log('PASS: download cancellation and Cancel button focus');
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    await testInitialState(browser);
    await testReducedMotion(browser);
    await testResponsiveLayout(browser);
    await testSuccessfulDownload(browser);
    await testCancellation(browser);

    console.log('\nAll R55-T019 regression tests passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('\nR55-T019 test failure:', error);
  process.exit(1);
});
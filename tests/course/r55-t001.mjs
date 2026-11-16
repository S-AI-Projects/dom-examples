import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');

function startServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    let filePath = path.join(repoRoot, pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

async function launchBrowser() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (fs.existsSync(chromePath) ? chromePath : undefined);
  return await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
}

async function runTest() {
  const { server, baseUrl } = await startServer();
  let browser;
  const pageErrors = [];

  try {
    browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(`${baseUrl}/resize-event/index.html`);
    await page.waitForLoadState('domcontentloaded');

    // 1. Reject unexpected page errors
    assert.equal(pageErrors.length, 0, `Page errors detected: ${pageErrors.map(e => e.message).join(', ')}`);

    // 2. Check initial dimensions in anchors #height and #width
    const heightEl = page.locator('#height');
    const widthEl = page.locator('#width');
    await assert.doesNotReject(heightEl.waitFor({ state: 'attached' }));
    await assert.doesNotReject(widthEl.waitFor({ state: 'attached' }));

    const initialWidthText = await widthEl.textContent();
    const initialHeightText = await heightEl.textContent();
    assert.ok(parseInt(initialWidthText, 10) > 0, 'Width output must be greater than 0');
    assert.ok(parseInt(initialHeightText, 10) > 0, 'Height output must be greater than 0');

    // 3. Test resize event updates
    await page.setViewportSize({ width: 750, height: 500 });
    await page.waitForFunction(() => document.querySelector('#width')?.textContent === '750' && document.querySelector('#height')?.textContent === '500');
    const updatedWidth = await widthEl.textContent();
    const updatedHeight = await heightEl.textContent();
    assert.equal(updatedWidth, '750', 'Width output should update to 750 after resize');
    assert.equal(updatedHeight, '500', 'Height output should update to 500 after resize');

    // 4. Test keyboard interaction: Tab traversal & visible focus
    const skipLink = page.locator('.skip-link');
    await assert.doesNotReject(skipLink.waitFor({ state: 'attached' }));

    // Focus via Tab key
    await page.keyboard.press('Tab');
    const isSkipFocused = await skipLink.evaluate(el => el === document.activeElement);
    assert.ok(isSkipFocused, 'Skip link must receive focus on Tab');

    // Check visible focus: top offset should be >= 0 when focused
    const skipBoundingBox = await skipLink.boundingBox();
    assert.ok(skipBoundingBox && skipBoundingBox.y >= 0, 'Skip link must be visible when focused');

    // 5. Test no positive tabindex anywhere
    const positiveTabindices = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      return allElements.filter(el => {
        const tabIndex = el.getAttribute('tabindex');
        return tabIndex !== null && parseInt(tabIndex, 10) > 0;
      }).map(el => el.outerHTML);
    });
    assert.equal(positiveTabindices.length, 0, `Found elements with positive tabindex: ${positiveTabindices.join(', ')}`);

    // 6. Test keyboard activation with Enter key
    await page.keyboard.press('Enter');
    const activeIdAfterEnter = await page.evaluate(() => document.activeElement ? document.activeElement.id : null);
    assert.equal(activeIdAfterEnter, 'main', 'Pressing Enter on skip link must move focus to main content region');

    console.log('R55-T001 check passed: Keyboard use and resize event verified.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T001 check failed:', err);
  process.exit(1);
});

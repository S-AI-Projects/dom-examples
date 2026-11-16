import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T003');

function startServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png'
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
  fs.mkdirSync(workDir, { recursive: true });
  const { server, baseUrl } = await startServer();
  let browser;
  const pageErrors = [];

  try {
    browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('pageerror', (err) => pageErrors.push(err));

    // Stub window.PaymentRequest with mockable behavior
    await page.addInitScript(() => {
      window.__paymentMode = 'reject'; // 'reject' | 'resolve'
      window.PaymentRequest = class MockPaymentRequest {
        constructor(methods, details) {
          this.methods = methods;
          this.details = details;
        }
        async show() {
          if (window.__paymentMode === 'reject') {
            throw new Error('User cancelled payment request');
          }
          return {
            complete: async (status) => {}
          };
        }
      };
    });

    await page.goto(`${baseUrl}/payment-request/recommend-payment-app.html`);
    await page.waitForLoadState('domcontentloaded');

    // 1. Initial State: verify #intro is visible, #success and #legacy are hidden
    const intro = page.locator('#intro');
    const legacy = page.locator('#legacy');
    const success = page.locator('#success');
    const emptyCart = page.locator('#empty-cart-state');

    assert.ok(await intro.isVisible(), 'Intro panel must be visible initially');
    assert.equal(await legacy.isVisible(), false, 'Legacy panel must be hidden initially');
    assert.equal(await success.isVisible(), false, 'Success panel must be hidden initially');
    assert.equal(await emptyCart.isVisible(), false, 'Empty cart panel must be hidden initially');

    // 2. Exercise Empty Cart Fixture
    await page.locator('#clear-cart-button').click();
    assert.ok(await emptyCart.isVisible(), 'Empty cart panel must display when cart is emptied');
    assert.equal(await intro.isVisible(), false, 'Intro panel must be hidden when empty');

    // Recover from Empty Cart
    await page.locator('#restore-cart-button').click();
    assert.ok(await intro.isVisible(), 'Intro panel must recover when fixture is restored');
    assert.equal(await emptyCart.isVisible(), false, 'Empty cart panel must hide on restore');

    // 3. Exercise Error / Failure State
    await page.evaluate(() => { window.__paymentMode = 'reject'; });
    await page.locator('#checkout-button').click();
    await page.waitForFunction(() => {
      const el = document.getElementById('legacy');
      return el && window.getComputedStyle(el).display !== 'none';
    });

    assert.ok(await legacy.isVisible(), 'Legacy error panel must display when payment fails');
    const errorText = await page.locator('#error-message').textContent();
    assert.ok(errorText.includes('cancelled') || errorText.includes('error'), 'Error message must explain failure');

    // Recover from Error State
    await page.locator('#retry-button').click();
    assert.ok(await intro.isVisible(), 'Intro panel must recover when Retry is clicked');
    assert.equal(await legacy.isVisible(), false, 'Legacy panel must hide after retry');

    // 4. Exercise Success State
    await page.evaluate(() => { window.__paymentMode = 'resolve'; });
    await page.locator('#checkout-button').click();
    await page.waitForFunction(() => {
      const el = document.getElementById('success');
      return el && window.getComputedStyle(el).display !== 'none';
    });

    assert.ok(await success.isVisible(), 'Success panel must display on successful payment');

    // 5. Assert no uncaught page errors occurred
    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    console.log('R55-T003 check passed: Empty state, error display, and recovery verified.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T003 check failed:', err);
  process.exit(1);
});

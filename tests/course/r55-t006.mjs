import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T006');

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

    // --- TEST 1: Feature Absent Path ---
    const ctxAbsent = await browser.newContext();
    const pageAbsent = await ctxAbsent.newPage();
    pageAbsent.on('pageerror', (err) => pageErrors.push(err));

    // Force CSS.supports to return false for carousel features
    await pageAbsent.addInitScript(() => {
      const origSupports = CSS.supports;
      CSS.supports = function(prop, val) {
        if (typeof prop === 'string' && prop.includes('scroll-marker')) return false;
        return origSupports.apply(this, arguments);
      };
    });

    await pageAbsent.goto(`${baseUrl}/css-carousels/scroll-button-scroll-marker/index.html`);
    await pageAbsent.waitForLoadState('domcontentloaded');

    const noticeEl = pageAbsent.locator('#unsupported-notice');
    assert.ok(await noticeEl.isVisible(), 'Unsupported notice must be visible when feature is absent');
    const noticeText = await noticeEl.textContent();
    assert.ok(noticeText.includes('does not currently support'), 'Fallback text must explain lack of support');

    // Controls must remain interactive in fallback mode
    const links = pageAbsent.locator('ul li a');
    const buttons = pageAbsent.locator('ul li button');
    assert.equal(await links.count(), 4, 'Must have 4 links present');
    assert.equal(await buttons.count(), 4, 'Must have 4 buttons present');
    await buttons.first().click();

    await ctxAbsent.close();

    // --- TEST 2: Feature Present Path ---
    const ctxPresent = await browser.newContext();
    const pagePresent = await ctxPresent.newPage();
    pagePresent.on('pageerror', (err) => pageErrors.push(err));

    // Stub CSS.supports to return true
    await pagePresent.addInitScript(() => {
      const origSupports = CSS.supports;
      CSS.supports = function(prop, val) {
        if (typeof prop === 'string' && prop.includes('scroll-marker')) return true;
        return origSupports.apply(this, arguments);
      };
    });

    await pagePresent.goto(`${baseUrl}/css-carousels/scroll-button-scroll-marker/index.html`);
    await pagePresent.waitForLoadState('domcontentloaded');

    const noticePresent = pagePresent.locator('#unsupported-notice');
    assert.equal(await noticePresent.isVisible(), false, 'Unsupported notice must be hidden when feature is supported');

    const hasClass = await pagePresent.evaluate(() => document.body.classList.contains('has-css-carousel'));
    assert.ok(hasClass, 'Body must have has-css-carousel class when supported');

    await ctxPresent.close();

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    console.log('R55-T006 check passed: Both feature-present and feature-absent paths verified.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T006 check failed:', err);
  process.exit(1);
});

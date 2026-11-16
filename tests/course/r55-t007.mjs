import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T007');

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
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
    const page = await context.newPage();
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto(`${baseUrl}/css-carousels/scroll-button-scroll-marker/index.html`);
    await page.waitForLoadState('domcontentloaded');

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    // Walkthrough Step 1: Verify Initial Page 1 Entry Point
    const carousel = page.locator('ul');
    assert.ok(await carousel.isVisible(), 'Carousel <ul> element must be visible');
    const initialScrollLeft = await carousel.evaluate(el => el.scrollLeft);
    assert.equal(initialScrollLeft, 0, 'Initial scroll position must be 0 (Page 1)');

    const item1 = page.locator('#carousel-item-1');
    assert.ok(await item1.isVisible(), 'Page 1 must be visible initially');

    // Walkthrough Step 2: Button Interaction
    const btn1 = page.locator('#carousel-item-1 button');
    assert.equal(await btn1.textContent(), 'Press me', 'Button text must initially be "Press me"');
    await btn1.click();
    assert.equal(await btn1.textContent(), 'Pressed (Page 1)', 'Button text must update to "Pressed (Page 1)"');

    // Walkthrough Step 3: Scroll to Page 2
    const item2 = page.locator('#carousel-item-2');
    await item2.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    const updatedScrollLeft = await carousel.evaluate(el => el.scrollLeft);
    assert.ok(updatedScrollLeft > 0, 'Carousel scrollLeft must be greater than 0 after scrolling to Page 2');

    const heading2 = await page.locator('#carousel-item-2 h2').textContent();
    assert.equal(heading2, 'Page 2', 'Page 2 heading must match documented walkthrough');

    // Save screenshot of walkthrough Step 3
    const screenshotPath = path.join(workDir, 'walkthrough-page2.png');
    await page.screenshot({ path: screenshotPath });
    assert.ok(fs.existsSync(screenshotPath), 'Walkthrough screenshot must be written to disk');

    console.log('R55-T007 check passed: Walkthrough executed and verified successfully.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T007 check failed:', err);
  process.exit(1);
});

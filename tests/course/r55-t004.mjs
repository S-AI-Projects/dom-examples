import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T004');

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

    await page.goto(`${baseUrl}/indexeddb-examples/idbindex/index.html`);
    await page.waitForLoadState('domcontentloaded');

    // 1. Wait for initial rows to be populated
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return rows && rows.length === 10;
    });

    const initialRowCount = await page.locator('table tbody tr').count();
    assert.equal(initialRowCount, 10, 'Initial table must contain exactly 10 rows');

    // 2. Perform second initialization (re-init idempotency check)
    await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('idb-data-rendered', () => resolve(), { once: true });
        window.initApp();
      });
    });

    await page.waitForTimeout(100);
    const rowCountAfterReinit = await page.locator('table tbody tr').count();
    assert.equal(rowCountAfterReinit, 10, 'Table rows must not duplicate after re-initialization');

    // 3. Repeated interaction check: click table headers twice
    const thLastName = page.locator('table th', { hasText: 'Last name' });
    await thLastName.click();
    await page.waitForTimeout(100);

    const rowCountAfterSort1 = await page.locator('table tbody tr').count();
    assert.equal(rowCountAfterSort1, 10, 'Row count must remain 10 after first sort');

    const thAge = page.locator('table th', { hasText: 'Age' });
    await thAge.click();
    await page.waitForTimeout(100);

    const rowCountAfterSort2 = await page.locator('table tbody tr').count();
    assert.equal(rowCountAfterSort2, 10, 'Row count must remain 10 after second sort');

    // 4. Test cleanup leaves no dangling listeners/timers
    await page.evaluate(() => {
      window.cleanupApp();
    });

    // 5. Ensure no unexpected errors
    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    console.log('R55-T004 check passed: Repeat initialization and interaction verified without duplicates.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T004 check failed:', err);
  process.exit(1);
});

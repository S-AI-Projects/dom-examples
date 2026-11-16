import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T005');

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

async function runDeterministicSequence(browser, baseUrl, pageErrors) {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 800, height: 600 }
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => pageErrors.push(err));

  await page.goto(`${baseUrl}/touchevents/Multi-touch_interaction.html`);
  await page.waitForLoadState('domcontentloaded');

  // Helper to dispatch synthetic touch events with precise touch lists
  await page.evaluate(() => {
    window.dispatchSyntheticTouch = (targetId, touchPoints) => {
      const el = document.getElementById(targetId);
      const touches = touchPoints.map((tp, idx) => {
        return new Touch({
          identifier: idx + 1,
          target: el,
          clientX: tp.x,
          clientY: tp.y,
          pageX: tp.x,
          pageY: tp.y
        });
      });
      const touchEvent = new TouchEvent('touchstart', {
        cancelable: true,
        bubbles: true,
        touches: touches,
        targetTouches: touches,
        changedTouches: touches
      });
      el.dispatchEvent(touchEvent);
    };
  });

  // 1. Single touch on #target1 (x=100, y=100)
  await page.evaluate(() => {
    window.dispatchSyntheticTouch('target1', [{ x: 100, y: 100 }]);
  });

  // 2. Two touches on #target2
  await page.evaluate(() => {
    window.dispatchSyntheticTouch('target2', [{ x: 100, y: 200 }, { x: 150, y: 200 }]);
  });

  // 3. Three touches on #target3
  await page.evaluate(() => {
    window.dispatchSyntheticTouch('target3', [{ x: 100, y: 300 }, { x: 150, y: 300 }, { x: 200, y: 300 }]);
  });

  // Target 4 remains untouched

  // Extract asserted DOM state
  const state = await page.evaluate(() => {
    return {
      t1Bg: document.getElementById('target1').style.background,
      t2Bg: document.getElementById('target2').style.background,
      t3Bg: document.getElementById('target3').style.background,
      t4Bg: document.getElementById('target4').style.background,
      t1Text: document.getElementById('target1').textContent.trim(),
      t2Text: document.getElementById('target2').textContent.trim(),
      t3Text: document.getElementById('target3').textContent.trim(),
      t4Text: document.getElementById('target4').textContent.trim()
    };
  });

  await context.close();
  return state;
}

async function runTest() {
  fs.mkdirSync(workDir, { recursive: true });
  const { server, baseUrl } = await startServer();
  let browser;
  const pageErrors = [];

  try {
    browser = await launchBrowser();

    // Context 1
    const state1 = await runDeterministicSequence(browser, baseUrl, pageErrors);

    // Context 2
    const state2 = await runDeterministicSequence(browser, baseUrl, pageErrors);

    // Assert exact determinism between the two fresh contexts
    assert.deepEqual(state1, state2, 'Two fresh browser contexts must produce identical DOM states');

    // Assert correct gesture mapping
    assert.equal(state1.t1Bg, 'yellow', 'Single touch must turn background yellow');
    assert.equal(state1.t2Bg, 'pink', 'Two simultaneous touches must turn background pink');
    assert.equal(state1.t3Bg, 'lightblue', 'More than two touches must turn background lightblue');
    assert.equal(state1.t4Bg, '', 'Untouched target background must remain default white');

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    console.log('R55-T005 check passed: Deterministic browser test verified across two fresh contexts.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T005 check failed:', err);
  process.exit(1);
});

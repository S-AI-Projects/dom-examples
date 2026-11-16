import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T010');

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

async function dispatchSingleTouch(page, targetId) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    const touch = new Touch({
      identifier: 1,
      target: el,
      clientX: 50,
      clientY: 50,
      pageX: 50,
      pageY: 50
    });
    const touchEvent = new TouchEvent('touchstart', {
      cancelable: true,
      bubbles: true,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch]
    });
    el.dispatchEvent(touchEvent);
  }, targetId);
}

async function runTest() {
  fs.mkdirSync(workDir, { recursive: true });
  const { server, baseUrl } = await startServer();
  let browser;
  const pageErrors = [];

  try {
    browser = await launchBrowser();

    // --- PHASE 1: Verify correct, unmutated application passes ---
    const ctxCorrect = await browser.newContext({ hasTouch: true });
    const pageCorrect = await ctxCorrect.newPage();
    pageCorrect.on('pageerror', (err) => pageErrors.push(err));

    await pageCorrect.goto(`${baseUrl}/touchevents/Multi-touch_interaction.html`);
    await pageCorrect.waitForLoadState('domcontentloaded');

    await dispatchSingleTouch(pageCorrect, 'target1');
    const correctBg = await pageCorrect.evaluate(() => document.getElementById('target1').style.background);
    assert.equal(correctBg, 'yellow', 'Unmutated page must change target1 background to yellow on touch');

    await pageCorrect.screenshot({ path: path.join(workDir, 'correct-state.png') });
    await ctxCorrect.close();

    // --- PHASE 2: Verify deliberate fixture mutation fails for intended behavioral reason ---
    const ctxMutated = await browser.newContext({ hasTouch: true });
    const pageMutated = await ctxMutated.newPage();

    await pageMutated.goto(`${baseUrl}/touchevents/Multi-touch_interaction.html`);
    await pageMutated.waitForLoadState('domcontentloaded');

    // Introduce deliberate mutation: sever event binding on target1 in temporary fixture
    await pageMutated.evaluate(() => {
      const el = document.getElementById('target1');
      if (el) el.ontouchstart = null;
    });

    await dispatchSingleTouch(pageMutated, 'target1');
    const mutatedBg = await pageMutated.evaluate(() => document.getElementById('target1').style.background);

    // Assert that the mutation broke the behavior
    let mutationCaught = false;
    try {
      assert.equal(mutatedBg, 'yellow', 'Mutation check');
    } catch (e) {
      mutationCaught = true;
      assert.equal(mutatedBg, '', 'Mutated background must remain default/empty because handler was severed');
    }
    assert.ok(mutationCaught, 'Regression test must catch deliberate event binding mutation and distinguish broken state');

    await pageMutated.screenshot({ path: path.join(workDir, 'mutated-state.png') });
    await ctxMutated.close();

    // --- PHASE 3: Ensure final application contains no mutation on disk ---
    const htmlSource = fs.readFileSync(path.join(repoRoot, 'touchevents/Multi-touch_interaction.html'), 'utf-8');
    assert.ok(htmlSource.includes('set_handlers("target1")'), 'Application file must retain original event binding');
    assert.ok(htmlSource.includes('ev.target.style.background = "yellow"'), 'Application file must retain original style logic');

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    console.log('R55-T010 check passed: Plausible UI regression caught and verified against unmutated code.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T010 check failed:', err);
  process.exit(1);
});

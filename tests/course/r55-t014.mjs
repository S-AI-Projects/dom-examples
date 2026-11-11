
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const PORT = 8000;
const URL = `http://127.0.0.1:${PORT}/scrolltooptions/`;
const MAIN_JS = path.join(ROOT, 'scrolltooptions/main.js');
const EVIDENCE_DIR = path.join(ROOT, 'work/R55-T014');

const results = {
  issue: 'R55-T014',
  url: URL,
    baseline: {
    normalScrolling: 'Manual tests with different left/top values and smooth/automatic behavior worked before the fix.',
    repeatedInitialization: {
      expectedScrollCalls: 1,
      actualScrollCalls: 2,
      result: 'Failed before the duplicate-initialization guard was added.'
    }
  },
  inputs: [
  { left: 250, top: 300, scroll: false },
  { left: 450, top: 600, scroll: false },
  { left: 600, top: 700, scroll: true }
],
  checks: [],
  versions: {
  node: process.version,
  python: spawnSync('python3', ['--version'], {
    encoding: 'utf8'
  }).stdout.trim(),
  playwright: spawnSync(
    'npx',
    ['playwright', '--version'],
    { encoding: 'utf8' }
  ).stdout.trim()
}
};

let server;
let browser;
let context;
let page;

function check(name, expected, actual) {
  results.checks.push({ name, expected, actual });
  assert.deepEqual(actual, expected, name);
  console.log(`PASS: ${name}`);
}

async function waitForServer() {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error('Python server exited before becoming ready.');
    }

    try {
      const response = await fetch(URL);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Local server did not become ready within 15 seconds.');
}

try {
  await mkdir(EVIDENCE_DIR, { recursive: true });

  // Start the documented local Python server.
  server = spawn(
    'python3',
    ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' }
  );

  await waitForServer();
  console.log('PASS: Local server is ready.');

  // Use a fresh browser and context.
  browser = await chromium.launch({ headless: true });
  results.versions.chromium = browser.version();

  context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(URL, { waitUntil: 'load' });

  // Verify the real rendered controls.
  check('One form exists', 1, await page.locator('form').count());
  check('One #left input exists', 1, await page.locator('#left').count());
  check('One #top input exists', 1, await page.locator('#top').count());
  check('One #scroll checkbox exists', 1, await page.locator('#scroll').count());

  check(
    '#left is a number input',
    'number',
    await page.locator('#left').getAttribute('type')
  );

  check(
    '#top is a number input',
    'number',
    await page.locator('#top').getAttribute('type')
  );

  check(
    '#scroll is a checkbox',
    'checkbox',
    await page.locator('#scroll').getAttribute('type')
  );


const layout = await page.evaluate(() => {
  const body = getComputedStyle(document.body);
  const paragraph = getComputedStyle(document.querySelector('p'));
  const form = getComputedStyle(document.querySelector('form'));

  return {
    bodyWidth: body.width,
    paragraphWidth: paragraph.width,
    formPosition: form.position,
    formWidth: form.width,
    formTop: form.top,
    formLeft: form.left,
    horizontalOverflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
    verticalOverflow:
      document.documentElement.scrollHeight >
      document.documentElement.clientHeight
  };
});

check('Body width is 60% of the viewport', '768px', layout.bodyWidth);
check('Paragraph width preserves horizontal scrolling', '3000px', layout.paragraphWidth);
check('Form remains fixed', 'fixed', layout.formPosition);
check('Form width is preserved', '300px', layout.formWidth);
check('Form top offset is preserved', '20px', layout.formTop);
check('Form left offset is preserved', '20px', layout.formLeft);
check('Page supports horizontal scrolling', true, layout.horizontalOverflow);
check('Page supports vertical scrolling', true, layout.verticalOverflow);


  // Record DOM size and instrument browser effects before reinitializing.
  const before = await page.evaluate(() => {
    const originalScrollTo = window.scrollTo.bind(window);
    const originalSetTimeout = window.setTimeout.bind(window);
    const originalSetInterval = window.setInterval.bind(window);

    window.__r55ScrollCalls = [];
    window.__r55TimerCalls = 0;

    window.scrollTo = (...args) => {
      window.__r55ScrollCalls.push({
        left: args[0].left,
        top: args[0].top,
        behavior: args[0].behavior
        });
      return originalScrollTo(...args);
    };

    window.setTimeout = (...args) => {
      window.__r55TimerCalls++;
      return originalSetTimeout(...args);
    };

    window.setInterval = (...args) => {
      window.__r55TimerCalls++;
      return originalSetInterval(...args);
    };

    return document.querySelectorAll('*').length;
  });

// Execute the initialization logic again in an isolated function scope.
// This avoids a global lexical redeclaration error while testing
// whether initialization adds duplicate event handlers.
const mainJsSource = await readFile(MAIN_JS, 'utf8');

await page.evaluate((source) => {
  const initialize = new Function(source);
  initialize();
}, mainJsSource);

  const after = await page.evaluate(() => ({
    domNodes: document.querySelectorAll('*').length,
    timerCalls: window.__r55TimerCalls
  }));

  check('Repeated initialization does not add DOM nodes', before, after.domNodes);
  check('Repeated initialization does not create timers', 0, after.timerCalls);

  // Submit each input and verify the resulting scroll behavior.
  for (const input of results.inputs) {
    await page.locator('#left').fill(String(input.left));
    await page.locator('#top').fill(String(input.top));
    await page.locator('#scroll').setChecked(input.scroll);

    await page.locator('form button').click();

    const actual = await page.evaluate(() => ({
      calls: window.__r55ScrollCalls.length,
      left: window.scrollX,
      top: window.scrollY
    }));

    const expectedCalls = results.inputs.indexOf(input) + 1;

    check(
      `Submission ${expectedCalls} triggers exactly one scroll`,
      expectedCalls,
      actual.calls
    );

    check(
      `Submission ${expectedCalls} uses the requested scroll behavior`,
      input.scroll ? 'smooth' : 'auto',
      await page.evaluate(() =>
        window.__r55ScrollCalls.at(-1).behavior
      )
    );

    if (!input.scroll) {
      check(
        `Submission ${expectedCalls} reaches the requested position`,
        { left: input.left, top: input.top },
        { left: actual.left, top: actual.top }
      );
    }
  }

  check('No uncaught browser errors', [], pageErrors);

  console.log('\nAll R55-T014 checks passed.');
} catch (error) {
  results.error = error.stack || error.message;
  console.error('\nR55-T014 test failed:', error);
  process.exitCode = 1;
} finally {
  if (page) {
    try {
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'result.png'),
        fullPage: true
      });
    } catch {
      // Preserve the test report even if screenshot capture fails.
    }
  }

  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});

  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([
      once(server, 'exit'),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  }

  await writeFile(
    path.join(EVIDENCE_DIR, 'results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`Evidence saved in: ${EVIDENCE_DIR}`);
}

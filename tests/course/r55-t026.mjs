
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

async function getPort() {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });

  return port;
}

async function waitForServer(url, process) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (process.exitCode !== null) {
      throw new Error('Local server stopped unexpectedly.');
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }

    await delay(200);
  }

  throw new Error('Local server did not become ready.');
}

async function run() {
  const port = await getPort();
  const baseURL = `http://127.0.0.1:${port}`;
  const pageURL = `${baseURL}/streams/simple-pump/`;

  let server;
  let browser;

  try {
    server = spawn(
      'python3',
      ['-m', 'http.server', String(port), '--bind', '127.0.0.1'],
      { cwd: root, stdio: 'ignore' }
    );

    await waitForServer(baseURL, server);

    browser = await chromium.launch({ headless: true });

    // Test 1: Streams API is supported.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];

      page.on('pageerror', error => pageErrors.push(error.message));

      await page.goto(pageURL);
      await page.locator('#target').waitFor({ state: 'visible' });

      await page.waitForFunction(() => {
        const image = document.querySelector('#target');
        return image.complete && image.naturalWidth > 0;
      });

      assert.equal(
        await page.locator('#target').evaluate(image => image.naturalWidth > 0),
        true,
        'The streamed tortoise image should load.'
      );

      assert.deepEqual(pageErrors, [], 'Supported path should have no page errors.');

      console.log('PASS: Streams API supported path');

      await context.close();
    }

    // Test 2: Streams API is unavailable.
    {
      const context = await browser.newContext();

      await context.addInitScript(() => {
        Object.defineProperty(window, 'ReadableStream', {
          configurable: true,
          value: undefined
        });
      });

      const page = await context.newPage();
      const pageErrors = [];

      page.on('pageerror', error => pageErrors.push(error.message));

      await page.goto(pageURL);

      await page.locator('#status').waitFor({ state: 'visible' });

      assert.match(
        await page.locator('#status').innerText(),
        /does not support the Streams API/i,
        'Unsupported browser should show a clear fallback message.'
      );
      assert.equal(
  await page.locator('#target').isHidden(),
  true,
  'The streamed image should be hidden when Streams API is unavailable.'
);

      assert.deepEqual(pageErrors, [], 'Unsupported path should have no page errors.');

      console.log('PASS: Streams API unsupported path');

      await context.close();
    }

    console.log('All R55-T026 checks passed.');
  } finally {
    if (browser) await browser.close();

    if (server && server.exitCode === null) {
      server.kill();
      await Promise.race([
        new Promise(resolve => server.once('exit', resolve)),
        delay(2000)
      ]);
    }
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

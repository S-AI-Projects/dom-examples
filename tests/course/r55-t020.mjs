import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = "/indexeddb-examples/idbindex/index.html";
const expectedSortedNames = [
  "Bagshot",
  "Bungle",
  "Crane",
  "Damage",
  "Day",
  "James",
  "Maul",
  "Strife",
  "Trask",
  "Umlaut",
];

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

function startServer() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const filePath = path.resolve(root, `.${pathname}`);

    if (!filePath.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, contents) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      });
      res.end(contents);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function waitForContacts(page) {
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 10,
    null,
    { timeout: 10000 },
  );
}

async function getLastNames(page) {
  return page.locator("tbody tr td:nth-child(2)").allTextContents();
}

async function checkCorrectPage(browser, url) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  // External fonts are not required for this behavior test.
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());

  try {
    await page.goto(`${url}${pagePath}`);
    await waitForContacts(page);

    const initialNames = await getLastNames(page);
    const expectedInitialNames = [
      "Damage", "Maul", "Bungle", "James", "Umlaut",
      "Crane", "Day", "Trask", "Strife", "Bagshot",
    ];

    if (JSON.stringify(initialNames) !== JSON.stringify(expectedInitialNames)) {
      throw new Error(`Unexpected initial table order: ${initialNames.join(", ")}`);
    }
    console.log("PASS: all 10 contacts appear initially in ID order");

    const table = page.locator("table");
    const tableBox = await table.boundingBox();
    const tableStyle = await table.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: style.width,
        borderCollapse: style.borderCollapse,
      };
    });
    const headingCursor = await page.locator("th").first().evaluate(
      (element) => getComputedStyle(element).cursor,
    );

    if (!tableBox || tableStyle.borderCollapse !== "collapse" || headingCursor !== "pointer") {
      throw new Error("The table layout or clickable heading styling is incorrect");
    }

    console.log("PASS: table layout and clickable heading styling match the CSS");

    await page.getByRole("columnheader", { name: "Last name" }).click();

    await page.waitForFunction(() => {
      const names = Array.from(
        document.querySelectorAll("tbody tr td:nth-child(2)"),
        (cell) => cell.textContent,
      );
      return names[0] === "Bagshot";
    });

    const sortedNames = await getLastNames(page);
    if (JSON.stringify(sortedNames) !== JSON.stringify(expectedSortedNames)) {
      throw new Error(`Last-name sorting was incorrect: ${sortedNames.join(", ")}`);
    }
    console.log("PASS: clicking Last name sorts all contacts alphabetically");

    if (pageErrors.length) {
      throw new Error(`Unexpected browser errors: ${pageErrors.join("; ")}`);
    }
    console.log("PASS: no uncaught page errors on the correct page");
  } finally {
    await context.close();
  }
}

async function checkBrokenFixture(browser, url) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());

  // Deliberately move the handler from click to dblclick in this test-only fixture.
  await page.route("**/indexeddb-examples/idbindex/scripts/main.js", async (route) => {
    const response = await route.fetch();
    const originalScript = await response.text();
    const brokenScript = originalScript.replace(
      "activeThead.onclick = function (e)",
      "activeThead.ondblclick = function (e)",
    );

    if (brokenScript === originalScript) {
      throw new Error("Could not apply the deliberate event-binding mutation");
    }

    await route.fulfill({
      response,
      body: brokenScript,
    });
  });

  try {
    await page.goto(`${url}${pagePath}`);
    await waitForContacts(page);

    const beforeClick = await getLastNames(page);
    await page.getByRole("columnheader", { name: "Last name" }).click();
    await page.waitForTimeout(150);

    const afterClick = await getLastNames(page);

    if (JSON.stringify(afterClick) !== JSON.stringify(beforeClick)) {
      throw new Error("The broken fixture unexpectedly changed the table after click");
    }

    if (JSON.stringify(afterClick) === JSON.stringify(expectedSortedNames)) {
      throw new Error("The regression assertion failed to distinguish the broken fixture");
    }

    console.log("PASS: deliberate click-binding mutation is detected because sorting does not occur");

    if (pageErrors.length) {
      throw new Error(`Unexpected browser errors in broken fixture: ${pageErrors.join("; ")}`);
    }
    console.log("PASS: broken fixture produced no uncaught page errors");
  } finally {
    await context.close();
  }
}

async function main() {
  let server;
  let browser;

  try {
    const started = await startServer();
    server = started.server;
    browser = await chromium.launch({ headless: true });

    await checkCorrectPage(browser, started.url);
    await checkBrokenFixture(browser, started.url);

    console.log("\nAll R55-T020 regression checks passed.");
  } finally {
    if (browser) await browser.close();
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }
}

main().catch((error) => {
  console.error("\nR55-T020 failed:", error);
  process.exitCode = 1;
});

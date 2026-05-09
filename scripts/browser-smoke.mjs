/**
 * Browser smoke test for xianxia-text-game.
 *
 * Uses Playwright (already installed on the server) to start the Vite preview
 * server, load the app in a headless Chromium, and verify basic functionality.
 *
 * Original version used raw CDP + Windows Chrome/Edge paths.
 * This version adapted for Linux + Playwright (Super Z environment).
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = process.cwd();
const appPort = Number(process.env.SMOKE_APP_PORT ?? 4173);
const appUrl = `http://127.0.0.1:${appPort}`;

function viteBin() {
  return path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
}

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function stopProcess(child) {
  if (!child || child.killed) return;
  child.kill();
  const closed = new Promise((resolve) => {
    child.once('close', resolve);
    setTimeout(resolve, 2500);
  });
  await closed;
}

function assertIncludes(text, needle) {
  if (!text.includes(needle)) {
    throw new Error(`Expected page text to include "${needle}".`);
  }
}

async function run() {
  // Start Vite preview server
  const server = spawn(process.execPath, [viteBin(), 'preview', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });

  let browser;
  let page;

  try {
    await waitForHttp(appUrl);

    // Dynamically import Playwright
    const require = createRequire(import.meta.url);
    let playwright;
    try {
      const { chromium } = await import('playwright');
      playwright = { chromium };
    } catch {
      throw new Error('Playwright not found. Install with: npx playwright install chromium');
    }

    browser = await playwright.chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(appUrl, { waitUntil: 'load' });

    // Test 1: Origin selection screen
    let bodyText = await page.locator('body').innerText();
    assertIncludes(bodyText, '文字修仙');
    assertIncludes(bodyText, '选择出身');
    assertIncludes(bodyText, '山居采药人');
    assertIncludes(bodyText, '乡塾读书人');

    // Test 2: Select origin
    await page.locator('[data-origin-id="village_scholar"]').click();
    await page.waitForTimeout(200);

    bodyText = await page.locator('body').innerText();
    assertIncludes(bodyText, '状态');
    assertIncludes(bodyText, '行动');
    assertIncludes(bodyText, '仙途记录');
    assertIncludes(bodyText, '枯坐');

    // Test 3: Perform an action
    const sitButton = page.locator('button').filter({ hasText: '枯坐' });
    await sitButton.click();
    await page.waitForTimeout(200);

    bodyText = await page.locator('body').innerText();
    assertIncludes(bodyText, '神识');
    assertIncludes(bodyText, '进行了枯坐');

    // Test 4: Dismiss event dialog if present
    const eventChoice = page.locator('.event-dialog .choice-button');
    if (await eventChoice.count() > 0) {
      await eventChoice.first().click();
      await page.waitForTimeout(200);
    }

    // Test 5: Location switch
    await page.locator('button').filter({ hasText: '山路' }).click();
    await page.waitForTimeout(200);

    bodyText = await page.locator('body').innerText();
    assertIncludes(bodyText, '所在：山路');

    // Test 6: No horizontal overflow
    const layout = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));

    if (layout.canScrollX) {
      throw new Error(`Unexpected horizontal overflow: ${layout.scrollWidth}px > ${layout.width}px`);
    }

    console.log('browser smoke passed');
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await stopProcess(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

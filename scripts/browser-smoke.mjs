/**
 * Lightweight HTTP smoke test for xianxia-text-game.
 *
 * This script uses only Node.js built-in APIs (fetch, child_process) — no
 * Playwright, no browser, no extra dependencies. It verifies that the Vite
 * preview server starts, serves the built HTML, and the page contains expected
 * static content.
 *
 * Full browser-level testing (clicking buttons, checking rendered React UI,
 * layout overflow, etc.) requires Playwright and is NOT covered here. Install
 * Playwright separately if you need that level of testing.
 *
 * Usage: npm run smoke   (after npm ci && npm run build)
 */

import { spawn } from 'node:child_process';
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
      lastError = new Error(`HTTP ${response.status} from ${url}`);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle) {
  if (!text.includes(needle)) {
    throw new Error(`Expected text to include "${needle}".`);
  }
}

async function run() {
  // Start Vite preview server
  const server = spawn(
    process.execPath,
    [viteBin(), 'preview', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'],
    { cwd: root, stdio: 'ignore' },
  );

  try {
    // ── Test 1: Server responds ────────────────────────────────────────
    const response = await waitForHttp(appUrl);
    console.log('✓ Server responded with HTTP 200');

    // ── Test 2: HTML contains expected static content ──────────────────
    const html = await response.text();

    // The <title> tag is in the static index.html
    assertIncludes(html, '<title>文字修仙</title>');
    console.log('✓ Page title contains "文字修仙"');

    // The mount point exists
    assertIncludes(html, 'id="app"');
    console.log('✓ App mount point <div id="app"> exists');

    // The main script tag is present (Vite injects the built JS)
    assert(/<script.*src.*assets\/.*\.js/.test(html), 'Expected a <script> tag pointing to built JS assets');
    console.log('✓ Built JS bundle referenced in HTML');

    // CSS bundle reference exists
    const hasCss = /<link.*href.*assets\/.*\.css/.test(html);
    // CSS may or may not be extracted depending on Vite config; just log
    if (hasCss) {
      console.log('✓ Built CSS bundle referenced in HTML');
    } else {
      console.log('ℹ No separate CSS bundle (may be inlined by Vite)');
    }

    // ── Test 3: Static asset (favicon) is served ───────────────────────
    const faviconRes = await fetch(`${appUrl}/favicon.svg`);
    assert(faviconRes.ok, `Favicon request failed: HTTP ${faviconRes.status}`);
    const faviconBody = await faviconRes.text();
    assert(faviconBody.length > 0, 'Favicon body is empty');
    console.log('✓ Static asset /favicon.svg served correctly');

    // ── Test 4: Built JS asset is fetchable ───────────────────────────
    // Vite's SPA server serves index.html for all routes, so we extract
    // the actual asset URL and verify it is a real JS file.
    const jsMatch = html.match(/src="(\/assets\/[^"']+\.js)"/);
    assert(jsMatch, 'Could not find JS asset URL in HTML');
    const jsAssetUrl = `${appUrl}${jsMatch[1]}`;
    const jsRes = await fetch(jsAssetUrl);
    assert(jsRes.ok, `JS asset fetch failed: HTTP ${jsRes.status} for ${jsAssetUrl}`);
    const jsBody = await jsRes.text();
    assert(jsBody.length > 0, 'JS asset body is empty');
    const jsContentType = jsRes.headers.get('content-type') ?? '';
    assert(
      jsContentType.includes('javascript') || jsContentType.includes('application/octet-stream'),
      `Expected JS content-type, got "${jsContentType}"`,
    );
    console.log(`✓ Built JS asset (${jsMatch[1]}) served correctly (${jsBody.length} bytes)`);

    // ── Test 5: Response headers look correct ──────────────────────────
    // (already fetched main page as `response`, but re-fetch for clean headers)
    const mainRes = await fetch(appUrl);
    const contentType = mainRes.headers.get('content-type') ?? '';
    assert(
      contentType.includes('text/html'),
      `Expected content-type to include text/html, got "${contentType}"`,
    );
    console.log('✓ Response Content-Type includes text/html');

    // ── Summary ────────────────────────────────────────────────────────
    console.log('\nAll smoke tests passed.');
  } finally {
    await stopProcess(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

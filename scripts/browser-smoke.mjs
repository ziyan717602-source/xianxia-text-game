import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const appPort = Number(process.env.SMOKE_APP_PORT ?? 4173);
const debugPort = Number(process.env.SMOKE_DEBUG_PORT ?? 9223);
const appUrl = `http://127.0.0.1:${appPort}`;

const browserCandidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function findBrowser() {
  const browser = browserCandidates.find((candidate) => existsSync(candidate));
  if (!browser) {
    throw new Error('No Chromium-based browser found. Set BROWSER_PATH to chrome.exe or msedge.exe.');
  }
  return browser;
}

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

function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const eventWaiters = new Map();

  socket.addEventListener('message', (message) => {
    const payload = JSON.parse(message.data);
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) reject(new Error(payload.error.message));
      else resolve(payload.result);
      return;
    }

    const waiters = eventWaiters.get(payload.method);
    if (!waiters || waiters.length === 0) return;
    waiters.splice(0).forEach((resolve) => resolve(payload.params));
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    async send(method, params = {}) {
      await opened;
      const messageId = ++id;
      socket.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
      });
    },
    waitFor(method, timeoutMs = 5000) {
      return new Promise((resolve, reject) => {
        const waiters = eventWaiters.get(method) ?? [];
        waiters.push(resolve);
        eventWaiters.set(method, waiters);
        setTimeout(() => reject(new Error(`Timed out waiting for CDP event ${method}`)), timeoutMs);
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }

  return result.result.value;
}

async function stopProcess(child) {
  if (!child || child.killed) return;

  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill();
  }

  const closed = new Promise((resolve) => {
    child.once('close', resolve);
    setTimeout(resolve, 2500);
  });

  await closed;
}

async function removeDirWithRetry(dir) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 7) {
        console.warn(`Could not remove temporary browser profile ${dir}: ${error.message}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

function escapePowerShellSingleQuoted(value) {
  return value.replaceAll("'", "''");
}

function killWindowsProcessesByCommandLine(markers) {
  if (process.platform !== 'win32') return;

  const markerList = markers
    .filter(Boolean)
    .map((marker) => `'${escapePowerShellSingleQuoted(marker)}'`)
    .join(',');

  const command = `
    $markers = @(${markerList});
    $targets = Get-CimInstance Win32_Process -Filter "name='msedge.exe' or name='node.exe'" |
      Where-Object {
        $commandLine = $_.CommandLine;
        $markers | Where-Object { $commandLine -like "*$_*" }
      };
    foreach ($target in $targets) {
      Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
    }
  `;

  spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: 'ignore' });
}

function assertIncludes(text, needle) {
  if (!text.includes(needle)) {
    throw new Error(`Expected page text to include "${needle}".`);
  }
}

async function run() {
  const server = spawn(process.execPath, [viteBin(), '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
    windowsHide: true,
  });
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'xianxia-smoke-'));
  const browser = spawn(findBrowser(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], {
    stdio: 'ignore',
    windowsHide: true,
  });

  let cdp;

  try {
    await waitForHttp(appUrl);
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);

    const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(appUrl)}`, {
      method: 'PUT',
    });
    const target = await targetResponse.json();
    cdp = connectCdp(target.webSocketDebuggerUrl);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.waitFor('Page.loadEventFired');

    let bodyText = await evaluate(cdp, 'document.body.innerText');
    assertIncludes(bodyText, '文字修仙');
    assertIncludes(bodyText, '选择出身');
    assertIncludes(bodyText, '山居采药人');
    assertIncludes(bodyText, '乡塾读书人');

    await evaluate(cdp, `
      document.querySelector('[data-origin-id="village_scholar"]').click()
    `);
    await new Promise((resolve) => setTimeout(resolve, 200));

    bodyText = await evaluate(cdp, 'document.body.innerText');
    assertIncludes(bodyText, '状态');
    assertIncludes(bodyText, '行动');
    assertIncludes(bodyText, '仙途记录');
    assertIncludes(bodyText, '枯坐');

    await evaluate(cdp, `
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent.trim() === '枯坐')
        .click()
    `);
    await new Promise((resolve) => setTimeout(resolve, 200));

    bodyText = await evaluate(cdp, 'document.body.innerText');
    assertIncludes(bodyText, '神识');
    assertIncludes(bodyText, '进行了枯坐');

    await evaluate(cdp, `
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent.trim() === '山路')
        .click()
    `);
    await new Promise((resolve) => setTimeout(resolve, 200));

    bodyText = await evaluate(cdp, 'document.body.innerText');
    assertIncludes(bodyText, '所在：山路');

    const layout = await evaluate(cdp, `({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    })`);

    if (layout.canScrollX) {
      throw new Error(`Unexpected horizontal overflow: ${layout.scrollWidth}px > ${layout.width}px`);
    }

    console.log('browser smoke passed');
  } finally {
    if (cdp) {
      await cdp.send('Browser.close').catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 1000));
      cdp.close();
    }
    await stopProcess(browser);
    await stopProcess(server);
    killWindowsProcessesByCommandLine([
      userDataDir,
      `remote-debugging-port=${debugPort}`,
      `vite.js" --host 127.0.0.1 --port ${appPort}`,
    ]);
    await removeDirWithRetry(userDataDir);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

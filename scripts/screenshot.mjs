#!/usr/bin/env node
/**
 * 截图脚本（用于文档配图）。
 * 前置：`pnpm dev` 已启动。产物：docs/host.png、docs/shop.png
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEBUG_PORT = 9334;
const OUT_DIR = path.join(process.cwd(), 'docs', 'shared-store-principle');

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return r.result?.value;
  }
  async waitFor(expr, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.evaluate(expr)) return;
      await sleep(200);
    }
    throw new Error('等待超时: ' + expr);
  }
  async shot(file) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(data, 'base64'));
  }
}

async function main() {
  const browser = process.env.BROWSER || CANDIDATES.find((p) => existsSync(p));
  if (!browser) throw new Error('未找到 Chrome/Edge');
  mkdirSync(OUT_DIR, { recursive: true });

  const profile = path.join(os.tmpdir(), `mf-shot-${Date.now()}`);
  const child = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
      '--no-first-run',
      '--hide-scrollbars',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  );

  try {
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) break;
      } catch {
        /* retry */
      }
      await sleep(250);
    }

    const target = await (
      await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })
    ).json();

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error('CDP 连接失败'));
    });

    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 880,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (const [url, file] of [
      ['http://localhost:5173/shop', 'host.png'],
      ['http://localhost:5174/', 'shop.png'],
    ]) {
      await cdp.send('Page.navigate', { url });
      await cdp.waitFor('!!document.querySelector("[data-testid=\\"remote-cart\\"]")');
      await sleep(600);
      await cdp.shot(path.join(OUT_DIR, file));
      console.log('saved', path.join('docs', 'shared-store-principle', file));
    }

    ws.close();
  } finally {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else child.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    await sleep(300);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

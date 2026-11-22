// 打印 Module Federation 的共享作用域注册表，用于排查「是不是同一个实例」
// 用法：pnpm inspect（需先 pnpm dev）
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9337;
const HOST_URL = 'http://localhost:5173/';
const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const expr = `(() => {
  const F = window.__FEDERATION__;
  if (!F) return { error: 'no __FEDERATION__' };
  const pick = ['@demo/shared-state', 'zustand', 'react'];
  const out = {};
  for (const instName of Object.keys(F.__SHARE__ || {})) {
    const scopes = F.__SHARE__[instName] || {};
    out[instName] = {};
    for (const scopeName of Object.keys(scopes)) {
      const el = scopes[scopeName] || {};
      const detail = {};
      for (const pkg of pick) {
        if (!el[pkg]) continue;
        detail[pkg] = Object.entries(el[pkg]).map(([v, r]) => ({
          version: v,
          from: r && r.from,
          loaded: r && r.loaded,
          singleton: r && r.shareConfig && r.shareConfig.singleton,
          requiredVersion: r && r.shareConfig && r.shareConfig.requiredVersion,
          strictVersion: r && r.shareConfig && r.shareConfig.strictVersion,
        }));
      }
      out[instName][scopeName] = { packageCount: Object.keys(el).length, detail };
    }
  }
  return {
    instances: (F.__INSTANCES__ || []).map((i) => i.name),
    shareScopes: out,
    dom: {
      host: document.querySelector('[data-testid="host-store-id"]')?.textContent,
      remote: document.querySelector('[data-testid="cart-store-id"]')?.textContent,
    },
  };
})()`;

const browser = process.env.BROWSER || CANDIDATES.find((p) => existsSync(p));
if (!browser) {
  console.error('未找到 Chrome/Edge');
  process.exit(1);
}

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
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(r.result?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

const profile = path.join(os.tmpdir(), `mf-inspect-${Date.now()}`);
const child = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--remote-debugging-port=${PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore', windowsHide: true },
);

try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('CDP 连接失败'));
  });

  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: HOST_URL });

  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (await cdp.evaluate('!!document.querySelector("[data-testid=\\"remote-cart\\"]")')) {
      ready = true;
      break;
    }
    await sleep(250);
  }
  if (!ready) throw new Error('远程模块未加载，请确认 shop 已启动（5174）');
  await sleep(500);

  console.log(JSON.stringify(await cdp.evaluate(expr), null, 2));
  ws.close();
} catch (err) {
  console.error('✗ ' + err.message);
  process.exitCode = 1;
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

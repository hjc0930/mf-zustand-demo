#!/usr/bin/env node
/**
 * 无头浏览器验收脚本。
 *
 * 前置：`pnpm dev` 已启动（host:5173 / shop:5174）
 * 运行：`pnpm verify`
 *
 * 做的事：启动一个无头 Chrome/Edge，真实点击按钮，断言
 * 宿主与远程读到的是同一份 Zustand 状态，以及远程独立运行时的兜底。
 */
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const HOST_URL = 'http://localhost:5173/';
const SHOP_URL = 'http://localhost:5174/';
const DEBUG_PORT = 9333;

const BROWSER_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const results = [];
function check(name, actual, expected) {
  const pass = String(actual) === String(expected);
  results.push({ name, actual, expected, pass });
  return pass;
}
function checkContains(name, actual, expected) {
  const pass = typeof actual === 'string' && actual.includes(expected);
  results.push({ name, actual, expected: `包含「${expected}」`, pass });
  return pass;
}

function findBrowser() {
  for (const p of BROWSER_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  throw new Error('没有找到 Chrome / Edge，可手动设置 BROWSER 环境变量');
}

async function waitFor(fn, { timeout = 30000, interval = 250, label = 'condition' } = {}) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeout) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (err) {
      lastErr = err;
    }
    await sleep(interval);
  }
  throw new Error(`等待超时：${label}${lastErr ? ` (${lastErr.message})` : ''}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
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
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `页面执行出错: ${res.exceptionDetails.text} ${
          res.result?.description ?? ''
        }`,
      );
    }
    return res.result.value;
  }

  text(sel) {
    return this.evaluate(
      `document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() ?? null`,
    );
  }

  async click(sel) {
    const ok = await this.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(sel)});
        if (!el) return false; el.click(); return true; })()`,
    );
    if (!ok) throw new Error(`找不到可点击元素: ${sel}`);
    await sleep(150);
  }

  async waitForElement(sel, timeout = 30000) {
    return waitFor(
      () => this.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`),
      { timeout, label: `元素 ${sel}` },
    );
  }
}

async function openTarget() {
  // 新标签页，避免复用 about:blank 的奇怪状态
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(HOST_URL)}`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`创建调试标签页失败: ${res.status}`);
  return res.json();
}

async function main() {
  for (const url of [HOST_URL, SHOP_URL]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      throw new Error(`\n${url} 不可访问。请先在另一个终端运行：pnpm dev\n`);
    }
  }

  const browser = process.env.BROWSER || findBrowser();
  const profile = path.join(os.tmpdir(), `mf-verify-${Date.now()}`);

  console.log(`\n▶ 启动无头浏览器：${browser}`);
  const child = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      // GitHub Actions 的 Linux runner 里需要显式关掉沙箱
      ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--mute-audio',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  );

  let exitCode = 0;
  try {
    await waitFor(
      async () => {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        return res.ok;
      },
      { timeout: 20000, label: '浏览器调试端口' },
    );

    const target = await openTarget();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('CDP WebSocket 连接失败'));
    });

    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: `${HOST_URL}shop` });

    await cdp.waitForElement('[data-testid="remote-cart"]', 40000);
    await sleep(400);

    // ---------- 1. 初始状态：宿主与远程读到同一份状态 ----------
    check('宿主显示用户', await cdp.text('[data-testid="host-user"]'), '张三');
    check('远程读到的用户', await cdp.text('[data-testid="cart-user"]'), '张三');
    check('远程读到的主题', await cdp.text('[data-testid="cart-theme"]'), 'light');
    checkContains('远程运行模式', await cdp.text('[data-testid="cart-mode"]'), '共享单例');

    // 关键断言：两边显示的是同一个 store 实例（storeId 由 createAppStore 随机生成）
    const hostStoreId = await cdp.text('[data-testid="host-store-id"]');
    const cartStoreId = await cdp.text('[data-testid="cart-store-id"]');
    check('宿主与远程是同一个实例', hostStoreId, cartStoreId);

    // C1：远程清单来自运行时配置，而不是构建期写死（也不能走兜底）
    const remotes = await cdp.evaluate(
      'window.__MF_REMOTES__ ? JSON.parse(JSON.stringify(window.__MF_REMOTES__)) : null',
    );
    check('远程清单来源', remotes?.source, 'remote-config');
    check(
      '清单里注册了 shop',
      Array.isArray(remotes?.list) && remotes.list.some((r) => r.name === 'shop'),
      true,
    );

    // ---------- 2. 远程写 → 宿主读 ----------
    await cdp.click('[data-testid="cart-add"]');
    await cdp.click('[data-testid="cart-add"]');
    check('远程点 2 次后远程计数', await cdp.text('[data-testid="cart-count"]'), '2');
    check(
      '宿主顶部同步计数',
      (await cdp.text('[data-testid="host-cart-count"]'))?.replace(/\s+/g, ''),
      '购物车2',
    );

    // ---------- 3. 宿主写 → 远程读 ----------
    await cdp.click('[data-testid="host-toggle-theme"]');
    check('宿主切主题后宿主', await cdp.text('[data-testid="host-theme"]'), 'dark');
    check('宿主切主题后远程', await cdp.text('[data-testid="cart-theme"]'), 'dark');

    await cdp.click('[data-testid="host-switch-user"]');
    check('宿主切用户后远程', await cdp.text('[data-testid="cart-user"]'), '李四');

    // ---------- 4. 宿主清空 → 远程归零 ----------
    await cdp.click('[data-testid="host-clear-cart"]');
    check('宿主清空后远程计数', await cdp.text('[data-testid="cart-count"]'), '0');

    // ---------- 5. 运行时只有一份 store ----------
    const state = await cdp.evaluate('JSON.parse(JSON.stringify(window.__HOST_STORE__.getState()))');
    check('window.__HOST_STORE__ 的 cartCount', state?.cartCount, 0);
    check('window.__HOST_STORE__ 的 user', state?.user?.name, '李四');

    const hasRuntime = await cdp.evaluate('typeof window.__FEDERATION__ !== "undefined"');
    check('MF 运行时已加载', hasRuntime, true);

    // ---------- 5.5 路由：宿主集中（/shop/*）+ 远程相对路由 ----------
    await cdp.click('[data-testid="shop-nav-orders"]');
    await cdp.waitForElement('[data-testid="orders-page"]', 15000);
    checkContains('远程子路由 /shop/orders', await cdp.text('[data-testid="orders-page"]'), '订单列表');

    await cdp.click('[data-testid="order-link-1001"]');
    await cdp.waitForElement('[data-testid="order-detail"]', 15000);
    checkContains('远程动态路由 /shop/orders/1001', await cdp.text('[data-testid="order-detail"]'), '#1001');

    // 深链：直接访问 /shop/orders/42 并刷新，宿主一级 + 远程二级都要能对上
    await cdp.send('Page.navigate', { url: `${HOST_URL}shop/orders/42` });
    await cdp.waitForElement('[data-testid="order-detail"]', 25000);
    checkContains('深链刷新后渲染详情', await cdp.text('[data-testid="order-detail"]'), '#42');

    // ---------- 6. 远程独立运行：页面内同样是一份单例 ----------
    await cdp.send('Page.navigate', { url: SHOP_URL });
    await cdp.waitForElement('[data-testid="remote-cart"]', 30000);
    await sleep(300);
    checkContains('独立入口提示', await cdp.text('[data-testid="standalone-tip"]'), '独立入口');
    check('独立运行时使用游客', await cdp.text('[data-testid="cart-user"]'), '游客');
    await cdp.click('[data-testid="cart-add"]');
    check('独立运行时可独立计数', await cdp.text('[data-testid="cart-count"]'), '1');

    ws.close();
  } catch (err) {
    console.error(`\n✗ 验收中断：${err.message}`);
    exitCode = 1;
  } finally {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill('SIGKILL');
      }
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

  // ---------- 报表 ----------
  const pad = (s, n) => String(s).padEnd(n, ' ');
  console.log('\n验收结果\n' + '─'.repeat(74));
  for (const r of results) {
    console.log(
      `${r.pass ? '✓' : '✗'} ${pad(r.name, 26)} 实际: ${pad(r.actual, 18)} 期望: ${r.expected}`,
    );
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log('─'.repeat(74));
  console.log(`通过 ${results.length - failed} / ${results.length}`);
  if (failed > 0) exitCode = 1;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});

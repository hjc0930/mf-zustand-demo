// 用 @module-federation/runtime 而不是 enhanced/runtime：
// 前者正是 Vite 插件依赖的同一个包（版本对齐 2.9.3），
// 能保证模块级 API 作用在插件创建的那个默认实例上，且不会把第二份 runtime 打进产物。
import {
  loadRemote,
  preloadRemote,
  registerRemotes,
} from '@module-federation/runtime';

/**
 * C1 方案：**构建期不声明 remotes**，远程清单在运行时获取。
 *
 * 与「构建期声明」的区别：
 * - vite.config 里没有 remotes，宿主打包时完全不知道 shop 在哪；
 * - 远程地址来自 /mf-remotes.json（真实项目换成配置中心接口）；
 * - 业务代码不能用 import('shop/Cart')，只能 loadRemote('shop/Cart')。
 *
 * shared 仍然在构建期配置（见 @demo/shared-state/mf-config），
 * 这是 C1 与「纯运行时（无插件）」的本质区别。
 */

export interface RemoteDescriptor {
  name: string;
  entry: string;
  /** Vite 构建的远程是 'module'；Webpack/Rspack 容器是 'var' */
  type?: 'module' | 'var';
}

/** 兜底：配置服务不可用时，仍能从本地地址把应用跑起来 */
const FALLBACK_REMOTES: RemoteDescriptor[] = [
  { name: 'shop', entry: 'http://localhost:5174/remoteEntry.js', type: 'module' },
];

interface ResolvedRemotes {
  source: 'remote-config' | 'fallback';
  list: RemoteDescriptor[];
}

let bootstrapped: Promise<void> | null = null;

async function fetchRemotes(): Promise<ResolvedRemotes> {
  try {
    const res = await fetch('/mf-remotes.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const list = (await res.json()) as RemoteDescriptor[];
    if (!Array.isArray(list) || list.length === 0) throw new Error('远程清单为空');

    return { source: 'remote-config', list };
  } catch (err) {
    console.warn('[mf] 远程清单获取失败，回退兜底地址', err);
    return { source: 'fallback', list: FALLBACK_REMOTES };
  }
}

/**
 * 幂等：整个页面只注册一次。
 * 必须在远程「首次加载之前」完成，所以调用点放在 lazy 的 loader 里。
 */
export function bootstrapRemotes(): Promise<void> {
  bootstrapped ??= fetchRemotes().then(({ source, list }) => {
    // force: true 才允许覆盖已存在的注册（含构建期注入的同名远程）
    registerRemotes(list, { force: true });

    // 调试用：控制台与自动化测试可确认「清单从哪来、注册了谁」
    (window as unknown as Record<string, unknown>).__MF_REMOTES__ = { source, list };

    console.info(
      '[mf] 已注册远程：',
      list.map((r) => `${r.name} → ${r.entry}`).join(', '),
    );
  });

  return bootstrapped;
}

export async function loadExposed<T>(name: string, expose: string): Promise<T> {
  await bootstrapRemotes();

  const mod = await loadRemote<T>(`${name}/${expose}`);
  if (!mod) throw new Error(`远程模块加载失败：${name}/${expose}`);
  return mod;
}

/** 可选：提前预热远程资源，减少首次点击的等待 */
export async function preloadExposed(name: string, exposes: string[]): Promise<void> {
  await bootstrapRemotes();
  await preloadRemote([{ nameOrAlias: name, exposes }]);
}

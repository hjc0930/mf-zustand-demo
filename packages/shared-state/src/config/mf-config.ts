import type { ModuleFederationOptions } from '@module-federation/vite';

/**
 * 构建期配置：核心依赖版本 + Module Federation 的 shared / shareScope。
 *
 * 这里是**唯一来源**，`apps/host` 与 `apps/shop` 的 vite.config.ts 都从这里取。
 *
 * 注意：本文件只被构建工具（Node 侧）加载，不会进入浏览器产物；
 * 对 `@module-federation/vite` 用的是 `import type`，编译期即被擦除。
 */

/**
 * 核心依赖版本：**写死精确版本，不允许范围**。
 *
 * 配合下面的 `strictVersion: true`，只要某个应用实际装到的版本和这里不一致，
 * Module Federation 会直接报错，而不是静默复用另一个版本。
 *
 * 升级流程：
 *   1. 改这里的版本号；
 *   2. 同步各 package.json 并 pnpm install（更新 lockfile）；
 *   3. 跑 `pnpm check:deps` 确认「声明版本 === 实际安装版本」；
 *   4. 最后再起服务 / 发版。
 */
export const CORE_DEPENDENCIES = {
  react: '19.3.1',
  'react-dom': '19.3.1',
  'react-router': '7.18.6',
  'react-router-dom': '7.18.6',
  zustand: '5.1.0',
  '@demo/shared-state': '1.0.0',
} as const;

export type CorePackageName = keyof typeof CORE_DEPENDENCIES;

/**
 * 共享池名称。默认是 'default'，这里显式命名，方便在
 * `__FEDERATION__.__SHARE__` 里一眼认出来。
 *
 * 每个包都可以单独指定 shareScope，技术上可以把不同包拆进不同的池；
 * 这里统一一个池，是最不容易出错的做法。
 */
export const SHARE_SCOPE = 'global-app-scope';

type SharedMap = NonNullable<ModuleFederationOptions['shared']>;

/**
 * 核心包：单例 + 精确版本 + 版本不符直接失败。
 *
 * - `requiredVersion` 用 CORE_DEPENDENCIES 里的精确值（如 '19.3.1'），
 *   不是 '^19.0.0' —— 意味着对方必须是这个版本，patch 也不放过；
 * - `strictVersion: true` 让不匹配变成显式错误，而不是静默降级。
 */
function core(name: CorePackageName) {
  return {
    singleton: true,
    strictVersion: true,
    requiredVersion: CORE_DEPENDENCIES[name],
    shareScope: SHARE_SCOPE,
  };
}

export const sharedConfig: SharedMap = {
  // React 必须单例：否则 hooks / context 会出现双实例
  react: core('react'),
  'react/': core('react'),
  'react-dom': core('react-dom'),
  'react-dom/': core('react-dom'),

  // 路由：远程的 <Routes> 必须和宿主用同一个 router 实例，否则读不到 location
  'react-router': core('react-router'),
  'react-router-dom': core('react-router-dom'),

  // 状态库：保证 createStore / useStore 来自同一份实现
  zustand: core('zustand'),

  // 状态容器本身：单例的载体，必须和其他包进同一个 share scope
  '@demo/shared-state': core('@demo/shared-state'),
};

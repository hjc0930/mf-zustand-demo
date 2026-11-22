/**
 * 工厂函数：**只给测试和显式的多实例场景用**。
 *
 * 业务代码（`apps/*`）不应该 import 这个入口 —— 它只需要
 * `@demo/shared-state` 里的 `appStore` 与 `useAppStore`。
 *
 * 之所以单独拆成一个子路径而不是从主入口导出，就是为了让
 * “在业务代码里随手 create 一份”在编译期就不可能，
 * 而不是靠口头约定。
 */
export { createAppStore } from './store';
export type { AppStore, InitialState } from './store';

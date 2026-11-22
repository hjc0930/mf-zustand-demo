// 业务代码的公开入口：只有「读」和「订阅」两件事。
// 创建实例的工厂在 `@demo/shared-state/factory`，应用层不该碰。
export { appStore } from './singleton';
export { useAppStore } from './hooks';

export type { AppState, User } from './store';
export type { CartAppProps } from './contracts';

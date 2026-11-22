import { useStore } from 'zustand';
import { appStore } from './singleton';
import type { AppState } from './store';

/**
 * 组件层唯一的入口：直接订阅共享单例。
 *
 * 没有 Context —— 因为整个页面只有一个实例，不存在“从组件树上取”的需求。
 * 需要命令式读写时，直接 `import { appStore }` 即可。
 *
 * selector 必须返回稳定值；需要返回对象时用 useShallow 包一层，
 * 否则每次都是新引用，会无限重渲染。
 */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}

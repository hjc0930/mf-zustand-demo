import { createAppStore } from './store';

/**
 * 模块级单例（共享单例 store 的核心就这一行）。
 *
 * 为什么它能“共享”：
 * 1. 模块只求值一次 —— 一个页面里无论被 import 多少次，`createAppStore()` 只执行一遍；
 * 2. 这个包在 host / remote 的 shared 配置里是 singleton —— Module Federation 保证两个应用
 *    拿到的是**同一个模块实例**，而不是各自的副本。
 *
 * 所以：宿主导入 appStore 和远程导入 appStore，是同一个对象。
 *
 * 反过来说，只要 shared 配置漏了（或两边版本协商不到一起），就会各求值一次，
 * 变成两份 store —— 而且不会报错，只会“数据不同步”。
 */
export const appStore = createAppStore();

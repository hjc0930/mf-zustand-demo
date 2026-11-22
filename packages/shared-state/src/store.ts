import { createStore, type StoreApi } from 'zustand/vanilla';

export interface User {
  id: string;
  name: string;
  roles: string[];
}

export interface AppState {
  /** 实例标识：用来肉眼确认各个应用拿到的是不是同一个 store */
  storeId: string;
  /** 当前登录用户，由宿主写入，所有 remote 只读消费 */
  user: User | null;
  /** 主题，宿主与 remote 双向读写 */
  theme: 'light' | 'dark';
  /** 购物车数量，remote 写入、宿主展示，用来验证双向联动 */
  cartCount: number;

  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  addToCart: () => void;
  clearCart: () => void;
}

export type AppStore = StoreApi<AppState>;

export type InitialState = Partial<Pick<AppState, 'user' | 'theme' | 'cartCount'>>;

/**
 * 工厂函数而不是模块级单例。
 *
 * 好处：
 * 1. 状态下发给 remote（props 传引用）时，宿主掌握唯一实例；
 * 2. remote 独立运行 / 单测时可以自己造一份，互不污染；
 * 3. 将来接 SSR 时天然是“每请求一份”，不需要改结构。
 */
export function createAppStore(init: InitialState = {}): AppStore {
  return createStore<AppState>()((set) => ({
    storeId: Math.random().toString(36).slice(2, 8),
    user: null,
    theme: 'light',
    cartCount: 0,

    setUser: (user) => set({ user }),
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    addToCart: () => set((s) => ({ cartCount: s.cartCount + 1 })),
    clearCart: () => set({ cartCount: 0 }),

    ...init,
  }));
}

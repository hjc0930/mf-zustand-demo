import { lazy, Suspense } from 'react';
import { useAppStore, type User } from '@demo/shared-state';
import { RemoteErrorBoundary } from './RemoteErrorBoundary';

// Module Federation：从 shop 远程加载，而不是本地文件
const RemoteCart = lazy(() => import('shop/Cart'));

const USERS: User[] = [
  { id: 'u-1', name: '张三', roles: ['admin'] },
  { id: 'u-2', name: '李四', roles: ['buyer'] },
  { id: 'u-3', name: '王五', roles: [] },
];

export function App() {
  const storeId = useAppStore((s) => s.storeId);
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const cartCount = useAppStore((s) => s.cartCount);
  const setUser = useAppStore((s) => s.setUser);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const clearCart = useAppStore((s) => s.clearCart);

  const switchUser = () => {
    const index = USERS.findIndex((u) => u.id === user?.id);
    setUser(USERS[(index + 1) % USERS.length] ?? USERS[0]!);
  };

  return (
    <div className={`page ${theme}`}>
      <header className="topbar">
        <div className="brand">
          <span className="dot" />
          Host 应用
        </div>
        <div className="pill" data-testid="host-cart-count">
          购物车 {cartCount}
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <h1>共享单例 store：谁都不传，谁都拿得到</h1>
          <p className="sub">
            宿主与远程都从 <code>@demo/shared-state</code> 导入 <code>appStore</code>；
            Module Federation 的 <code>shared.singleton</code> 保证两边拿到的是同一个模块实例。
            Host 没有向 Remote 传任何 props。
          </p>

          <dl className="facts">
            <div>
              <dt>当前用户</dt>
              <dd data-testid="host-user">{user?.name ?? '未登录'}</dd>
            </div>
            <div>
              <dt>当前主题</dt>
              <dd data-testid="host-theme">{theme}</dd>
            </div>
            <div>
              <dt>购物车</dt>
              <dd data-testid="host-cart-count-inline">{cartCount}</dd>
            </div>
          </dl>

          <div className="actions">
            <button type="button" data-testid="host-switch-user" onClick={switchUser}>
              切换用户
            </button>
            <button type="button" data-testid="host-toggle-theme" onClick={toggleTheme}>
              切换主题
            </button>
            <button
              type="button"
              className="ghost"
              data-testid="host-clear-cart"
              onClick={clearCart}
            >
              清空购物车
            </button>
          </div>

          <p className="hint">
            store 实例 <code data-testid="host-store-id">#{storeId}</code>
            ，与右边远程卡片里显示的是同一个；控制台执行{' '}
            <code>__HOST_STORE__.getState()</code> 也能看到。
          </p>
        </section>

        <section className="panel panel-remote">
          <div className="panel-head">
            <h2>Remote 区域</h2>
            <span className="tag">来自 shop@localhost:5174</span>
          </div>

          <RemoteErrorBoundary>
            <Suspense fallback={<div className="loading">正在加载 shop 远程模块…</div>}>
              {/* 注意：这里没有传 store */}
              <RemoteCart />
            </Suspense>
          </RemoteErrorBoundary>
        </section>
      </main>
    </div>
  );
}

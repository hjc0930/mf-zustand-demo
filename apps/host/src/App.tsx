import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore, type User } from '@demo/shared-state';

const USERS: User[] = [
  { id: 'u-1', name: '张三', roles: ['admin'] },
  { id: 'u-2', name: '李四', roles: ['buyer'] },
  { id: 'u-3', name: '王五', roles: [] },
];

/**
 * 宿主布局：顶栏 + <Outlet />。
 * 路由表由 createBrowserRouter 构建，这里只负责“壳”和跨路由共享的状态展示。
 */
export function AppLayout() {
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

        <nav className="nav">
          <NavLink to="/" end>
            首页
          </NavLink>
          <NavLink to="/shop">商城</NavLink>
        </nav>

        <div className="topbar-state">
          <span className="pill" data-testid="host-user">
            {user?.name ?? '未登录'}
          </span>
          <span className="pill" data-testid="host-theme">
            {theme}
          </span>
          <span className="pill" data-testid="host-cart-count">
            购物车 {cartCount}
          </span>
          <code className="pill" data-testid="host-store-id">
            #{storeId}
          </code>
        </div>

        <div className="topbar-actions">
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
            清空
          </button>
        </div>
      </header>

      <main className="layout">
        <Outlet />
      </main>
    </div>
  );
}

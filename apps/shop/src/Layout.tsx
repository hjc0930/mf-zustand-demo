import { NavLink, Outlet } from 'react-router-dom';
import './shop.css';

/**
 * 远程的布局：导航 + <Outlet />。
 * 路由表在 routes.tsx 里以「数据」形式导出，宿主负责把它挂到自己的树上。
 */
export function ShopLayout() {
  return (
    <section className="shop-app">
      <nav className="shop-nav">
        <NavLink to="." end data-testid="shop-nav-cart">
          购物车
        </NavLink>
        <NavLink to="orders" data-testid="shop-nav-orders">
          订单
        </NavLink>
      </nav>
      <Outlet />
    </section>
  );
}

import type { RouteObject } from 'react-router-dom';
import { ShopLayout } from './Layout';
import Cart from './Cart';
import { Orders } from './Orders';
import { OrderDetail } from './OrderDetail';

/**
 * 对外暴露的路由表（代码式路由）。
 *
 * 注意：这里**没有 Router**，也没有 <Routes>。
 * 宿主会把它合并到自己的路由树里：{ path: '/shop', children: routes }。
 * 所以子路由用的都是相对路径。
 */
export const routes: RouteObject[] = [
  {
    element: <ShopLayout />,
    children: [
      { index: true, element: <Cart /> },
      { path: 'orders', element: <Orders /> },
      { path: 'orders/:id', element: <OrderDetail /> },
    ],
  },
];

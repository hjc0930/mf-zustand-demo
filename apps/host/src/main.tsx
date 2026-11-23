import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom';
import { appStore } from '@demo/shared-state';
import { AppLayout } from './App';
import { HomePanel } from './HomePanel';
import { RemoteErrorRoute, RemoteUnavailable } from './RemoteFallback';
import { loadExposed } from './mf/remote-registry';
import type { RemoteRoutesModule } from './mf/types';
import './styles.css';

// 单例模式下，宿主不再“创建”store，也不需要 Provider：
// 它只是第一个往共享实例里写初始状态的人。
appStore.setState({
  user: { id: 'u-1', name: '张三', roles: ['admin'] },
  theme: 'light',
});

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__HOST_STORE__ = appStore;
}

/**
 * 代码式路由 + 远程路由表：
 * 先把远程暴露的 RouteObject[] 取回来，再一次性构建整棵路由树。
 */
async function buildRouter() {
  let shopRoutes: RouteObject[] | null = null;
  let failure = '';

  try {
    const mod = await loadExposed<RemoteRoutesModule>('shop', 'routes');
    shopRoutes = mod.routes;
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
    console.error('[host] 远程路由加载失败，/shop 将不可用', err);
  }

  const shopRoute: RouteObject = shopRoutes
    ? { path: 'shop', children: shopRoutes, errorElement: <RemoteErrorRoute /> }
    : { path: 'shop', element: <RemoteUnavailable reason={failure} /> };

  return createBrowserRouter([
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <HomePanel /> },
        shopRoute,
        { path: '*', element: <div className="panel">页面不存在</div> },
      ],
    },
  ]);
}

buildRouter().then((router) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});

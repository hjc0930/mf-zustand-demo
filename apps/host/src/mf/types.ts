import type { RouteObject } from 'react-router-dom';

/**
 * 远程模块的通用约定（代码式路由版）。
 *
 * 宿主不再接收「组件」，而是接收一份**路由表**：
 * 这样宿主能看到远程的路由结构，可以做权限、面包屑、预取、路由级埋点。
 *
 * 代价：远程不能再自带 <Routes>，独立运行时需要自己 createBrowserRouter(routes)。
 */
export interface RemoteRoutesModule {
  routes: RouteObject[];
}

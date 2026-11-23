import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { appStore } from '@demo/shared-state';
import { routes } from './routes';
import './standalone.css';

// 独立运行时没有宿主来提供路由树，这里用同一份 routes 自己建一个。
appStore.setState({ user: { id: 'guest', name: '游客', roles: [] } });

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="standalone-page">
      <p className="standalone-tip" data-testid="standalone-tip">
        当前页面是 shop 的独立入口：没有宿主，store 与路由都由远程自己提供。
      </p>
      <RouterProvider router={router} />
    </div>
  </StrictMode>,
);

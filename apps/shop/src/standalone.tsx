import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { appStore } from '@demo/shared-state';
import Cart from './Cart';
import './standalone.css';

// 独立运行时没有宿主来写初始数据，这里直接用命令式 API 写一次，
// 顺便说明：单例 store 在 React 之外也能读写。
appStore.setState({ user: { id: 'guest', name: '游客', roles: [] } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="standalone-page">
      <p className="standalone-tip" data-testid="standalone-tip">
        当前页面是 shop 的独立入口：没有宿主，store 由共享包自己创建，页面内同样只有一份。
      </p>
      <Cart />
    </div>
  </StrictMode>,
);

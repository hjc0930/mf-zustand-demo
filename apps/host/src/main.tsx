import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { appStore } from '@demo/shared-state';
import { App } from './App';
import './styles.css';

// 单例模式下，宿主不再“创建”store，也不需要 Provider：
// 它只是第一个往共享实例里写初始状态的人。
appStore.setState({
  user: { id: 'u-1', name: '张三', roles: ['admin'] },
  theme: 'light',
});

// 调试用：控制台可以直接 __HOST_STORE__.getState() 观察共享状态
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__HOST_STORE__ = appStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { sharedConfig } from '@demo/shared-state/mf-config';

const PORT = 5174;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shop',
      filename: 'remoteEntry.js',
      manifest: true,
      exposes: {
        // 暴露路由表（代码式路由：宿主把它挂到自己的路由树上）
        './routes': './src/routes.tsx',
      },
      // 与 host 完全一致：同一个包导出的同一个对象
      shared: sharedConfig,
    }),
  ],
  server: {
    port: PORT,
    strictPort: true,
    cors: true,
    // 让 host 跨域加载时拿到绝对地址的资源
    origin: `http://localhost:${PORT}`,
  },
  base: `http://localhost:${PORT}`,
  build: {
    target: 'chrome89',
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { sharedConfig } from '@demo/shared-state/mf-config';

const PORT = 5173;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      // 注意：这里**没有 remotes** —— 远程在运行时注册（见 src/mf/remote-registry.ts）
      // shared 仍在构建期配置，这是「保留插件的运行时发现」方案的关键
      shared: sharedConfig,
    }),
  ],
  server: {
    port: PORT,
    strictPort: true,
  },
  build: {
    target: 'chrome89',
  },
});

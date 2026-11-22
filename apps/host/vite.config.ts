import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { sharedConfig } from '@demo/shared-state/mf-config';

const PORT = 5173;
const SHOP_PORT = 5174;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        shop: {
          type: 'module',
          name: 'shop',
          entry: `http://localhost:${SHOP_PORT}/remoteEntry.js`,
        },
      },
      // 与 shop 完全一致：同一个包导出的同一个对象
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

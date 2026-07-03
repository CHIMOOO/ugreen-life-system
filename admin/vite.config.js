import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // 生产部署到子路径 /admin 时，构建前设 VITE_BASE=/admin/
  base: process.env.VITE_BASE || '/',
  server: {
    host: '0.0.0.0', // 绑定所有网卡，局域网内其他机器可访问 dev 服务
    port: 41133,
    proxy: {
      '/api': 'http://localhost:41131',
      '/uploads': 'http://localhost:41131',
    },
  },
});

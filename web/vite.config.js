import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 开发期把 /api 与 /uploads 代理到后端，前端统一用相对路径调用接口。
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // 绑定所有网卡，局域网内其他机器可访问 dev 服务
    port: 41132,
    proxy: {
      '/api': 'http://localhost:41131',
      '/uploads': 'http://localhost:41131',
    },
  },
});

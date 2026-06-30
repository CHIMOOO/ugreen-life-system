import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import './style.css';
import { initFingerprint } from './fingerprint.js';

initFingerprint(); // 进入页面即预热指纹采集（异步、不阻塞渲染）

createApp(App).use(router).mount('#app');

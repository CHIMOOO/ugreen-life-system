import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import Lottery from './views/Lottery.vue';

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/lottery/:id', name: 'lottery', component: Lottery, props: true },
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

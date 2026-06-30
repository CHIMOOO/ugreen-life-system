import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import Lottery from './views/Lottery.vue';
import BillLedger from './views/BillLedger.vue';

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/lottery/:id', name: 'lottery', component: Lottery, props: true },
  { path: '/bill', name: 'bill', component: BillLedger },
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

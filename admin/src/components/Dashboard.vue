<script setup>
import { ref, computed, onMounted } from 'vue';
import { admin, WEB_BASE } from '../api.js';
import PeriodForm from './PeriodForm.vue';
import ResultPreview from './ResultPreview.vue';
import Products from './Products.vue';
import Settings from './Settings.vue';

const emit = defineEmits(['logout']);

const STYLE_LABEL = {
  style1: '极繁', style2: '手绘', style3: '包豪斯', style4: '终端', style5: 'Material',
  style6: '学院', style7: '赛博', style8: '几何', style9: '植物', style10: '蒸汽波',
  style11: '新拟态', style12: '复古',
};

const tab = ref('periods'); // periods | products | settings

const periods = ref([]);
const selectedId = ref(null); // null | 'new' | number
const detail = ref(null);
const simulation = ref(null);
const busy = ref('');
const toast = ref('');

const formPeriod = computed(() => (selectedId.value === 'new' ? null : detail.value));
const showForm = computed(() => selectedId.value === 'new' || (selectedId.value != null && detail.value));

function flash(m) { toast.value = m; setTimeout(() => (toast.value === m ? (toast.value = '') : null), 2200); }
function guard(res) { if (res.status === 401) { emit('logout'); return false; } return true; }

async function loadList() {
  const res = await admin.list();
  if (!guard(res)) return;
  if (Array.isArray(res.data)) periods.value = res.data;
}
async function loadDetail(id) {
  detail.value = null; simulation.value = null;
  const res = await admin.get(id);
  if (!guard(res)) return;
  detail.value = res.data;
}
function selectNew() { selectedId.value = 'new'; detail.value = null; simulation.value = null; }
function selectPeriod(p) { selectedId.value = p.id; loadDetail(p.id); }
async function onSaved(saved) {
  await loadList();
  selectedId.value = saved.id;
  await loadDetail(saved.id);
  flash('已保存');
}

async function doActivate() {
  busy.value = 'act';
  const res = await admin.activate(detail.value.id);
  busy.value = '';
  if (!guard(res)) return;
  if (res.ok) { detail.value = res.data; await loadList(); flash('已设为当前期'); }
}
async function doDeactivate() {
  const res = await admin.deactivate(detail.value.id);
  if (!guard(res)) return;
  if (res.ok) { detail.value = res.data; await loadList(); flash('已下线'); }
}
async function doSimulate() {
  busy.value = 'sim';
  const res = await admin.simulate(detail.value.id);
  busy.value = '';
  if (!guard(res)) return;
  if (res.ok) simulation.value = res.data.result;
  else flash(res.data?.error === 'no_entries' ? '还没有人参与' : '模拟失败');
}
async function doDraw() {
  if (!confirm('确认开奖？开奖后结果将对外公开。')) return;
  busy.value = 'draw';
  const res = await admin.draw(detail.value.id);
  busy.value = '';
  if (!guard(res)) return;
  if (res.ok) { simulation.value = null; detail.value = res.data; await loadList(); flash('已开奖'); }
  else flash(res.data?.error === 'no_entries' ? '还没有人参与' : '开奖失败');
}
async function doReopen() {
  if (!confirm('撤销开奖会清空已公布的结果，确认？')) return;
  const res = await admin.reopen(detail.value.id);
  if (!guard(res)) return;
  if (res.ok) { detail.value = res.data; await loadList(); flash('已撤销开奖'); }
}
async function doDelete() {
  if (!confirm('删除该期数及其全部数据，不可恢复，确认？')) return;
  const res = await admin.remove(detail.value.id);
  if (!guard(res)) return;
  if (res.ok) { selectedId.value = null; detail.value = null; await loadList(); flash('已删除'); }
}

const publicLink = (id) => `${WEB_BASE}/lottery/${id}`;
async function copyLink(id) {
  try { await navigator.clipboard.writeText(publicLink(id)); flash('链接已复制'); }
  catch { flash(publicLink(id)); }
}

onMounted(loadList);
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div class="flex items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-lg">🎲</span>
        <h1 class="text-lg font-bold text-slate-800">生活系统 · 管理后台</h1>
      </div>
      <div class="flex items-center gap-1">
        <button v-for="t in [['periods','期数管理'],['products','商品库'],['settings','系统设置']]" :key="t[0]"
          @click="tab = t[0]"
          class="rounded-lg px-4 py-1.5 text-sm font-medium transition"
          :class="tab === t[0] ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'">{{ t[1] }}</button>
        <button @click="emit('logout')" class="ml-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">退出</button>
      </div>
    </header>

    <!-- 商品库 / 系统设置 -->
    <div v-if="tab === 'products'" class="mx-auto max-w-7xl p-6"><Products /></div>
    <div v-else-if="tab === 'settings'" class="mx-auto max-w-3xl p-6"><Settings /></div>

    <!-- 期数管理 -->
    <div v-else class="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[320px_1fr]">
      <aside class="space-y-3">
        <button @click="selectNew" class="w-full rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-100" :class="selectedId === 'new' ? 'ring-2 ring-indigo-400' : ''">+ 新建期数</button>
        <div v-for="p in periods" :key="p.id" @click="selectPeriod(p)"
          class="cursor-pointer rounded-xl border bg-white p-4 transition hover:border-indigo-300"
          :class="selectedId === p.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'">
          <div class="flex items-center justify-between">
            <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">#{{ p.id }} · {{ STYLE_LABEL[p.style] }}</span>
            <span v-if="p.isActive" class="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">● 当前期</span>
            <span v-else class="rounded px-2 py-0.5 text-xs font-semibold" :class="p.status === 'drawn' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ p.status === 'drawn' ? '已开奖' : '进行中' }}</span>
          </div>
          <h3 class="mt-2 truncate font-semibold text-slate-800">{{ p.title }}</h3>
          <div class="mt-1 flex gap-3 text-xs text-slate-400">
            <span>👥 {{ p.participantCount }}</span>
            <span v-if="p.lotteryEnabled">🎁 抽奖</span>
            <span v-if="p.teaEnabled">🍰 下午茶</span>
          </div>
        </div>
        <p v-if="periods.length === 0" class="px-2 text-sm text-slate-400">还没有期数，点上方新建。</p>
      </aside>

      <main class="space-y-6">
        <div v-if="selectedId == null" class="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-400">请选择左侧期数，或新建一期</div>

        <template v-else>
          <PeriodForm v-if="showForm" :period="formPeriod" @saved="onSaved" />
          <div v-else class="grid h-32 place-items-center text-slate-400">加载中…</div>

          <template v-if="selectedId !== 'new' && detail">
            <!-- 操作 -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-slate-800">操作</h3>
                  <span v-if="detail.isActive" class="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">当前期</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <a :href="publicLink(detail.id)" target="_blank" class="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200">↗ 打开页面</a>
                  <button @click="copyLink(detail.id)" class="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200">复制链接</button>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap gap-3">
                <button v-if="!detail.isActive" @click="doActivate" :disabled="busy === 'act'" class="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">📌 设为当前期</button>
                <button v-else @click="doDeactivate" class="rounded-xl bg-slate-200 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-300">下线当前期</button>
                <button @click="doSimulate" :disabled="busy === 'sim'" class="rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50">🧪 模拟计算</button>
                <button v-if="detail.status !== 'drawn'" @click="doDraw" :disabled="busy === 'draw'" class="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">🎯 正式开奖</button>
                <button v-else @click="doReopen" class="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white transition hover:bg-amber-600">↩ 撤销开奖</button>
                <button @click="doDelete" class="rounded-xl bg-rose-50 px-5 py-2.5 font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100">删除期数</button>
              </div>
              <p class="mt-3 text-xs text-slate-400">同一时间只有一期为「当前期」，设为当前期会自动下线其它期。</p>
            </div>

            <!-- 下午茶商品评分统计 -->
            <div v-if="detail.teaEnabled && detail.tea?.products?.length" class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="font-bold text-slate-800">下午茶商品评分（本期）</h3>
              <div class="mt-3 space-y-2">
                <div v-for="prod in detail.tea.products" :key="prod.id" class="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span class="min-w-[120px] flex-1 font-medium text-slate-700">{{ prod.name }}</span>
                  <div class="h-2.5 w-40 overflow-hidden rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-emerald-500" :style="{ width: prod.ratings.goodRate + '%' }"></div>
                  </div>
                  <span class="w-16 text-right text-sm font-semibold text-emerald-600">{{ prod.ratings.goodRate }}%</span>
                  <span class="text-xs text-slate-400">{{ prod.ratings.total }}票 · 👍{{ prod.ratings.good }} 🙂{{ prod.ratings.ok }} 👎{{ prod.ratings.bad }}</span>
                </div>
              </div>
            </div>

            <!-- 参与者 -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="font-bold text-slate-800">参与者（{{ detail.entries?.length || 0 }} 人）</h3>
              <div v-if="detail.entries?.length" class="mt-3 flex flex-wrap gap-1.5">
                <span v-for="(e, i) in detail.entries" :key="i" class="rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-600">{{ e.name }} · <b class="text-slate-800">{{ e.number }}</b></span>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400">还没有人参与。</p>
            </div>

            <ResultPreview v-if="simulation" :result="simulation" :simulated="true" />
            <ResultPreview v-if="detail.status === 'drawn' && detail.result" :result="detail.result" :simulated="false" />
          </template>
        </template>
      </main>
    </div>

    <transition name="fade">
      <div v-if="toast" class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

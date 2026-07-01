<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../api.js';

const items = ref([]);
const total = ref(0);
const pages = ref(1);
const page = ref(1);
const q = ref('');
const loading = ref(false);
let searchTimer = null;

const selected = ref(null); // 用户详情（弹窗）
const loadingDetail = ref(false);

async function load() {
  loading.value = true;
  const { data } = await admin.users({ page: page.value, q: q.value.trim() });
  loading.value = false;
  // 兼容两种返回：新版分页对象 { items, total, pages, page }，以及旧后端直接返回的数组。
  // 若后端在线但接口版本不一致（例如后端未随前端更新），也能正常展示而非静默空白。
  const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null;
  if (list) {
    items.value = list;
    total.value = Number.isFinite(data?.total) ? data.total : list.length;
    pages.value = Number.isFinite(data?.pages) ? data.pages : 1;
    page.value = Number.isFinite(data?.page) ? data.page : 1;
  }
}
onMounted(load);

function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; load(); }, 300);
}
function go(p) {
  if (p < 1 || p > pages.value || p === page.value) return;
  page.value = p;
  load();
}

async function open(name) {
  loadingDetail.value = true;
  selected.value = { name };
  const { data } = await admin.userDetail(name);
  loadingDetail.value = false;
  selected.value = data && !data.error ? data : null;
}
function close() {
  selected.value = null;
}

const fmtTime = (t) => (t || '').replace('T', ' ').slice(0, 19);
const kindMeta = (k) =>
  k === 'cancel'
    ? { label: '撤销', cls: 'bg-rose-100 text-rose-700' }
    : k === 'rating'
    ? { label: '评分', cls: 'bg-amber-100 text-amber-700' }
    : { label: '抽奖', cls: 'bg-indigo-100 text-indigo-700' };

// 从一条指纹记录里抽取便于阅读的关键信号
function fpView(f) {
  const d = f.details || {};
  const c = d.client || {};
  const s = d.server || {};
  const ch = c.clientHints || {};
  const browser = (Array.isArray(ch.fullVersionList) && ch.fullVersionList[0])
    || (Array.isArray(ch.brands) && ch.brands[ch.brands.length - 1])
    || '';
  const os = ch.platform ? `${ch.platform} ${ch.platformVersion || ''}`.trim() : (c.platform || '');
  return {
    ip: f.ip || s.ip || '—',
    ua: f.ua || s.ua || '',
    browser,
    os,
    arch: ch.architecture ? `${ch.architecture}${ch.bitness ? '/' + ch.bitness : ''}` : '',
    screen: c.screen ? `${c.screen}${c.devicePixelRatio ? ' @' + c.devicePixelRatio + 'x' : ''}` : '',
    timezone: c.timezone || '',
    lang: c.languages || s.acceptLanguage || '',
    gpu: (c.webgl && c.webgl.renderer) || '',
    fonts: Array.isArray(c.fonts) ? c.fonts.length : 0,
    canvas: c.canvasHash || '',
    audio: c.audioHash || '',
    cores: c.hardwareConcurrency,
    mem: c.deviceMemory,
  };
}
</script>

<template>
  <div class="space-y-5">
    <!-- 头部：标题 + 搜索 -->
    <div class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-bold text-slate-800">👤 用户管理</h2>
        <p class="mt-0.5 text-sm text-slate-400">按姓名聚合（无需账号密码，仅供参考）· 共 <b class="text-slate-600">{{ total }}</b> 人</p>
      </div>
      <div class="relative w-full sm:w-72">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input v-model="q" @input="onSearchInput" type="text" placeholder="搜索用户名…"
          class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
      </div>
    </div>

    <!-- 用户卡片网格 -->
    <div v-if="loading" class="grid h-48 place-items-center text-slate-400">加载中…</div>
    <div v-else-if="items.length === 0" class="grid h-48 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
      {{ q ? '没有匹配的用户' : '还没有用户记录' }}
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button v-for="u in items" :key="u.name" @click="open(u.name)"
        class="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
        <div class="flex items-center gap-3">
          <div class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
            {{ (u.name || '?').slice(0, 1) }}
          </div>
          <div class="min-w-0">
            <p class="truncate font-bold text-slate-800 group-hover:text-indigo-600">{{ u.name }}</p>
            <p class="truncate text-xs text-slate-400">最近活跃 {{ fmtTime(u.updatedAt) }}</p>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-xl bg-indigo-50 py-2">
            <p class="text-base font-bold text-indigo-600">{{ u.lotteryCount }}</p>
            <p class="text-[11px] text-slate-400">🎲 抽奖</p>
          </div>
          <div class="rounded-xl bg-amber-50 py-2">
            <p class="text-base font-bold text-amber-600">{{ u.ratingCount }}</p>
            <p class="text-[11px] text-slate-400">🍰 评分</p>
          </div>
          <div class="rounded-xl bg-emerald-50 py-2">
            <p class="text-base font-bold text-emerald-600">{{ u.fpCount }}</p>
            <p class="text-[11px] text-slate-400">🔎 指纹</p>
          </div>
        </div>
      </button>
    </div>

    <!-- 分页 -->
    <div v-if="pages > 1" class="flex items-center justify-center gap-2">
      <button @click="go(page - 1)" :disabled="page <= 1"
        class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-indigo-300 disabled:opacity-40">上一页</button>
      <span class="px-2 text-sm text-slate-500">第 <b class="text-slate-800">{{ page }}</b> / {{ pages }} 页</span>
      <button @click="go(page + 1)" :disabled="page >= pages"
        class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-indigo-300 disabled:opacity-40">下一页</button>
    </div>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <div v-if="selected || loadingDetail" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8" @click.self="close">
        <div class="relative w-full max-w-3xl rounded-2xl bg-slate-50 shadow-2xl">
          <!-- 弹窗头 -->
          <div class="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white">
                {{ (selected?.name || '?').slice(0, 1) }}
              </div>
              <h2 class="text-lg font-bold text-slate-800">{{ selected?.name }}</h2>
            </div>
            <button @click="close" class="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">✕</button>
          </div>

          <div v-if="loadingDetail" class="grid h-48 place-items-center text-slate-400">加载中…</div>
          <div v-else-if="selected" class="space-y-5 p-6">
            <!-- 抽奖模块 -->
            <section class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="font-bold text-slate-800">🎲 抽奖模块 · 每次抽奖的数字</h3>
              <div v-if="selected.lottery.length" class="mt-3 grid gap-2 sm:grid-cols-2">
                <div v-for="(e, i) in selected.lottery" :key="i" class="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                  <span class="truncate text-slate-600">{{ e.periodTitle || ('期 #' + e.periodId) }}</span>
                  <span class="ml-2 shrink-0 font-mono text-lg font-bold text-indigo-600">{{ e.number }}</span>
                </div>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400">暂无抽奖记录。</p>
            </section>

            <!-- 评分模块 -->
            <section class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="font-bold text-slate-800">🍰 评分模块 · 对每个商品的评分次数</h3>
              <div v-if="selected.ratings.length" class="mt-3 flex flex-wrap gap-2">
                <span v-for="(r, i) in selected.ratings" :key="i" class="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 ring-1 ring-amber-200">
                  {{ r.product }} · {{ r.count }} 次
                </span>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400">暂无评分记录（评分时需带姓名才会归入用户）。</p>
            </section>

            <!-- 指纹模块 -->
            <section class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="font-bold text-slate-800">🔎 指纹模块 · 每次提交采集的设备信息</h3>
              <div v-if="selected.fingerprints.length" class="mt-3 space-y-3">
                <div v-for="(f, i) in selected.fingerprints" :key="i" class="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                  <div class="flex items-center justify-between">
                    <span class="rounded px-2 py-0.5 text-xs font-medium" :class="kindMeta(f.kind).cls">{{ kindMeta(f.kind).label }}</span>
                    <span class="font-mono text-xs text-slate-400">{{ fmtTime(f.createdAt) }}</span>
                  </div>
                  <!-- 关键信号一览 -->
                  <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">IP</dt><dd class="truncate font-mono text-slate-700">{{ fpView(f).ip }}</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">系统</dt><dd class="truncate text-slate-700">{{ fpView(f).os || '—' }}</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">浏览器</dt><dd class="truncate text-slate-700">{{ fpView(f).browser || '—' }}</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">屏幕</dt><dd class="truncate text-slate-700">{{ fpView(f).screen || '—' }}</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">时区</dt><dd class="truncate text-slate-700">{{ fpView(f).timezone || '—' }}</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">架构</dt><dd class="truncate text-slate-700">{{ fpView(f).arch || '—' }}</dd></div>
                    <div class="col-span-2 flex gap-1.5 sm:col-span-3"><dt class="shrink-0 text-slate-400">GPU</dt><dd class="truncate text-slate-700">{{ fpView(f).gpu || '—' }}</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">字体</dt><dd class="text-slate-700">{{ fpView(f).fonts }} 款</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">CPU</dt><dd class="text-slate-700">{{ fpView(f).cores ?? '—' }} 核</dd></div>
                    <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">Canvas</dt><dd class="truncate font-mono text-slate-600">{{ fpView(f).canvas || '—' }}</dd></div>
                  </dl>
                  <p v-if="fpView(f).ua" class="mt-2 truncate font-mono text-[11px] text-slate-400" :title="fpView(f).ua">UA: {{ fpView(f).ua }}</p>
                  <details class="mt-2">
                    <summary class="cursor-pointer select-none text-xs text-indigo-500 hover:underline">查看原始全量信号 JSON</summary>
                    <pre class="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">{{ JSON.stringify(f.details, null, 2) }}</pre>
                  </details>
                </div>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400">暂无指纹记录。</p>
            </section>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

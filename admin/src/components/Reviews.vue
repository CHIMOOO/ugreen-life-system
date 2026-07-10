<script setup>
// 评价 / 建议管理：跨期查看用户留言（可按期过滤），可删除不当内容，并查看每条留言对应的指纹（含匿名留言的设备追溯）。
import { ref, onMounted, computed } from 'vue';
import { admin } from '../api.js';
import { fpView, isLegacy } from '../fpView.js';

const KIND_LABEL = { review: '本期评价', suggestion: '下期建议' };

const items = ref([]);
const periods = ref([]);
const periodId = ref(''); // '' = 全部
const loading = ref(false);

async function loadPeriods() {
  const { data } = await admin.list();
  if (Array.isArray(data)) periods.value = data;
}
async function load() {
  loading.value = true;
  const { data } = await admin.reviews(periodId.value || undefined);
  loading.value = false;
  items.value = Array.isArray(data?.items) ? data.items : [];
}
onMounted(async () => { await loadPeriods(); await load(); });

const counts = computed(() => {
  const c = { review: 0, suggestion: 0 };
  for (const r of items.value) if (r.kind in c) c[r.kind]++;
  return c;
});

async function remove(r) {
  if (!confirm(`删除这条${KIND_LABEL[r.kind] || '留言'}？（${r.name || '匿名'}：${r.content.slice(0, 20)}…）`)) return;
  const { ok } = await admin.deleteReview(r.id);
  if (ok) items.value = items.value.filter((x) => x.id !== r.id);
}

function fmt(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN', { hour12: false });
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-800">评价 / 建议管理</h2>
        <p class="text-xs text-slate-500">用户在前台留下的「本期评价」与「下期建议」。可按期筛选、删除不当内容。</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="periodId" @change="load" class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
          <option value="">全部期数</option>
          <option v-for="p in periods" :key="p.id" :value="p.id">#{{ p.id }} · {{ p.title }}</option>
        </select>
        <button @click="load" :disabled="loading" class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50">🔄 刷新</button>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 text-sm">
      <span class="rounded-xl bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700">共 {{ items.length }} 条</span>
      <span class="rounded-xl bg-sky-50 px-3 py-1.5 font-medium text-sky-700">💬 本期评价 {{ counts.review }}</span>
      <span class="rounded-xl bg-amber-50 px-3 py-1.5 font-medium text-amber-700">💡 下期建议 {{ counts.suggestion }}</span>
    </div>

    <div v-if="!items.length" class="grid h-40 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
      {{ loading ? '加载中…' : '暂无留言' }}
    </div>
    <div v-else class="space-y-3">
      <div v-for="r in items" :key="r.id" class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-bold"
            :class="r.kind === 'suggestion' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'"
          >{{ KIND_LABEL[r.kind] || '留言' }}</span>
          <span class="text-sm font-semibold text-slate-800">{{ r.name || '匿名' }}</span>
          <span v-if="r.periodTitle" class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">#{{ r.periodId }} · {{ r.periodTitle }}</span>
          <span class="ml-auto text-xs text-slate-400">{{ fmt(r.createdAt) }}</span>
          <button @click="remove(r)" class="rounded-lg bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100">删除</button>
        </div>
        <p class="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{{ r.content }}</p>

        <!-- 对应指纹：可追溯留言来自哪台设备 / IP（匿名留言也能查） -->
        <div class="mt-3 border-t border-dashed border-slate-100 pt-3 text-xs">
          <template v-if="r.fingerprint && !isLegacy(r.fingerprint)">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
              <span class="font-semibold text-slate-400">🔎 指纹</span>
              <code class="rounded bg-indigo-50 px-2 py-0.5 font-mono font-semibold text-indigo-700">{{ fpView(r.fingerprint).visitorId || '—' }}</code>
              <span>IP <span class="font-mono text-slate-700">{{ fpView(r.fingerprint).ip }}</span></span>
              <span v-if="fpView(r.fingerprint).os" class="text-slate-600">{{ fpView(r.fingerprint).os }}</span>
              <span v-if="fpView(r.fingerprint).browser" class="text-slate-600">{{ fpView(r.fingerprint).browser }}</span>
              <span v-if="fpView(r.fingerprint).confidence !== null" class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600 ring-1 ring-emerald-200">置信度 {{ fpView(r.fingerprint).confidence }}%</span>
            </div>
            <details class="mt-2">
              <summary class="cursor-pointer select-none text-indigo-500 hover:underline">查看设备信号</summary>
              <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">屏幕</dt><dd class="truncate text-slate-700">{{ fpView(r.fingerprint).screen || '—' }}</dd></div>
                <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">时区</dt><dd class="truncate text-slate-700">{{ fpView(r.fingerprint).timezone || '—' }}</dd></div>
                <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">架构</dt><dd class="truncate text-slate-700">{{ fpView(r.fingerprint).arch || '—' }}</dd></div>
                <div class="col-span-2 flex gap-1.5 sm:col-span-3"><dt class="shrink-0 text-slate-400">GPU</dt><dd class="truncate text-slate-700">{{ fpView(r.fingerprint).gpu || '—' }}</dd></div>
                <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">字体</dt><dd class="text-slate-700">{{ fpView(r.fingerprint).fonts }} 款</dd></div>
                <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">Canvas</dt><dd class="truncate font-mono text-slate-600">{{ fpView(r.fingerprint).canvas || '—' }}</dd></div>
                <div class="flex gap-1.5"><dt class="shrink-0 text-slate-400">语言</dt><dd class="truncate text-slate-700">{{ fpView(r.fingerprint).lang || '—' }}</dd></div>
              </dl>
              <p v-if="fpView(r.fingerprint).ua" class="mt-2 truncate font-mono text-[11px] text-slate-400" :title="fpView(r.fingerprint).ua">UA: {{ fpView(r.fingerprint).ua }}</p>
              <details class="mt-2">
                <summary class="cursor-pointer select-none text-indigo-500 hover:underline">设备信号 JSON</summary>
                <pre class="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">{{ JSON.stringify(r.fingerprint.details, null, 2) }}</pre>
              </details>
            </details>
          </template>
          <p v-else-if="r.fingerprint" class="text-slate-400">🔎 指纹：早期记录，未采集设备信号。摘要 <span class="font-mono">{{ r.fingerprint.fp || '—' }}</span></p>
          <p v-else class="text-slate-300">🔎 无指纹记录（该留言在指纹关联上线前提交）</p>
        </div>
      </div>
    </div>
  </div>
</template>

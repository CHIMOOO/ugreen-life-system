<script setup>
// 总账单详情页 —— 固定使用「学院风 / Academia」。展示结余、收支与全部流水。
import { ref, onMounted, computed } from 'vue';
import { api } from '../api.js';
import AppLoader from '../components/AppLoader.vue';
import RefreshFab from '../components/RefreshFab.vue';

const loading = ref(true);
const refreshing = ref(false);
const config = ref({});
const data = ref({ items: [], income: 0, expense: 0, balance: 0, advance: 0 });

const periodTitle = ref({}); // id -> title
async function load() {
  try {
    const [cfg, led, periods] = await Promise.all([api.config(), api.bills(), api.periods()]);
    config.value = cfg.data || {};
    if (led.data) data.value = led.data;
    for (const p of periods.data || []) periodTitle.value[p.id] = p.title;
  } catch {
    /* 后端不可达：保留默认空账本，避免卡在 Loading */
  }
}
onMounted(async () => {
  await load();
  loading.value = false;
});
async function refresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  await load();
  refreshing.value = false;
}

const balancePositive = computed(() => data.value.balance >= 0);
function fmt(n) {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// 分页：10 条 / 页
const PER = 10;
const page = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(data.value.items.length / PER)));
const pagedItems = computed(() => data.value.items.slice((page.value - 1) * PER, page.value * PER));
</script>

<template>
  <AppLoader v-if="loading" label="正在翻阅账本…" />
  <div v-else class="aca-paper min-h-screen font-garamond text-aca-ink">
    <div class="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <a href="/" class="inline-block border-b border-aca-ink/40 font-garamond text-sm tracking-widest text-aca-brown hover:text-aca-burgundy">← 返回首页</a>

      <!-- 扉页标题 -->
      <header class="mt-8 text-center">
        <p class="font-garamond text-xs uppercase tracking-[0.35em] text-aca-gold">{{ config.departmentName }}</p>
        <div class="my-3 flex items-center justify-center gap-4 text-aca-gold">
          <span class="h-px w-16 bg-aca-ink/40"></span><span>❦</span><span class="h-px w-16 bg-aca-ink/40"></span>
        </div>
        <h1 class="font-playfair text-5xl font-black tracking-tight">总账单 · 流水</h1>
        <p class="mt-2 italic text-aca-brown">{{ config.siteName }}</p>
      </header>

      <!-- 结余 -->
      <section class="mt-10 grid gap-4 sm:grid-cols-3">
        <div class="aca-frame bg-aca-panel p-6 text-center">
          <p class="font-garamond text-sm uppercase tracking-widest text-aca-brown">当前结余</p>
          <p class="mt-2 font-playfair text-4xl font-black" :class="balancePositive ? 'text-aca-forest' : 'text-aca-burgundy'">¥{{ fmt(data.balance) }}</p>
          <p v-if="data.advance > 0" class="mt-1 text-sm text-aca-burgundy">（已垫付 ¥{{ fmt(data.advance) }}）</p>
        </div>
        <div class="border-2 border-aca-ink/30 p-6 text-center">
          <p class="font-garamond text-sm uppercase tracking-widest text-aca-brown">累计收入</p>
          <p class="mt-2 font-playfair text-3xl font-bold text-aca-forest">+¥{{ fmt(data.income) }}</p>
        </div>
        <div class="border-2 border-aca-ink/30 p-6 text-center">
          <p class="font-garamond text-sm uppercase tracking-widest text-aca-brown">累计支出</p>
          <p class="mt-2 font-playfair text-3xl font-bold text-aca-burgundy">−¥{{ fmt(data.expense) }}</p>
        </div>
      </section>

      <!-- 流水 -->
      <section class="mt-10">
        <h2 class="font-playfair text-2xl font-bold">流水明细</h2>
        <div class="aca-rule mt-2"></div>
        <p v-if="data.items.length === 0" class="mt-6 italic text-aca-brown">账本暂无记录。</p>
        <ul v-else class="mt-4 divide-y divide-aca-ink/15">
          <li v-for="b in pagedItems" :key="b.id" class="flex items-start gap-4 py-4">
            <span class="w-24 shrink-0 font-garamond text-sm text-aca-brown">{{ b.date }}</span>
            <div class="min-w-0 flex-1">
              <p class="font-playfair text-lg font-semibold">{{ b.title }}</p>
              <p v-if="b.note" class="text-sm italic text-aca-brown">{{ b.note }}</p>
              <p v-if="b.periodId && periodTitle[b.periodId]" class="mt-0.5 text-xs uppercase tracking-widest text-aca-gold">关联：{{ periodTitle[b.periodId] }}</p>
            </div>
            <span class="shrink-0 font-playfair text-lg font-bold" :class="b.kind === 'income' ? 'text-aca-forest' : 'text-aca-burgundy'">
              {{ b.kind === 'income' ? '+' : '−' }}¥{{ fmt(b.amount) }}
            </span>
          </li>
        </ul>

        <div v-if="totalPages > 1" class="mt-6 flex items-center justify-center gap-4">
          <button :disabled="page <= 1" @click="page--" class="border-2 border-aca-ink/40 px-4 py-1.5 font-garamond disabled:opacity-30">← 上一页</button>
          <span class="font-garamond text-aca-brown">第 {{ page }} / {{ totalPages }} 页</span>
          <button :disabled="page >= totalPages" @click="page++" class="border-2 border-aca-ink/40 px-4 py-1.5 font-garamond disabled:opacity-30">下一页 →</button>
        </div>
      </section>

      <footer class="mt-12 text-center text-sm italic text-aca-brown">{{ config.siteName }} · 账目公开</footer>
    </div>
    <RefreshFab :busy="refreshing" @refresh="refresh" />
  </div>
</template>

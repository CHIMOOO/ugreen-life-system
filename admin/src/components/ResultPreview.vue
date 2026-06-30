<script setup>
import { computed } from 'vue';

const props = defineProps({
  result: { type: Object, required: true },
  simulated: { type: Boolean, default: false },
});

function explain(s) {
  return (
    `共 ${s.poolSize} 人，和为 ${s.poolSum}，${s.poolSum} ÷ ${s.poolSize} 余 ${s.remainder}；` +
    `升序第 ${s.remainder + 1} 位 ${s.winner.name}(${s.winner.number}) 中「${s.prizeName}」。`
  );
}
const winners = computed(() => props.result.winners || []);
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-5">
    <div class="flex items-center justify-between">
      <h3 class="font-bold text-slate-800">
        {{ simulated ? '🧪 模拟计算结果（未落库）' : '🏆 开奖结果' }}
      </h3>
      <span class="text-sm text-slate-500">总和 {{ result.totalSum }} · {{ result.participantCount }} 人</span>
    </div>

    <!-- 中奖者 -->
    <div class="mt-4 flex flex-wrap gap-2">
      <span
        v-for="(w, i) in winners"
        :key="i"
        class="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200"
      >
        {{ w.prizeName }}：<b>{{ w.name }}</b>（{{ w.number }}）
      </span>
    </div>

    <!-- 算法步骤 -->
    <div class="mt-5 space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">算法推导</p>
      <div
        v-for="(s, i) in result.steps"
        :key="i"
        class="rounded-xl bg-slate-50 p-3 text-sm"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">第 {{ i + 1 }} 抽 · {{ s.prizeName }}</span>
          <span class="font-mono text-slate-600">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="(e, ei) in s.pool"
            :key="ei"
            class="rounded px-1.5 py-0.5 text-xs"
            :class="ei === s.remainder ? 'bg-emerald-500 font-bold text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'"
          >{{ e.number }}</span>
        </div>
        <p class="mt-2 text-slate-600">{{ explain(s) }}</p>
      </div>
    </div>

    <!-- 全部参与者 -->
    <details class="mt-4">
      <summary class="cursor-pointer text-sm font-medium text-slate-500">全部参与者（{{ result.sorted.length }} 人，按数字升序）</summary>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <span v-for="(e, i) in result.sorted" :key="i" class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {{ e.name }}·{{ e.number }}
        </span>
      </div>
    </details>
  </div>
</template>

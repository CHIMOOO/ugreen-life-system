<script setup>
// 没有进行中的活动时的兜底页（粘土风）：历史期数 + 抽奖/评分/规则模块。
import ClayBlobs from './ClayBlobs.vue';
import { RouterLink } from 'vue-router';
import { STYLE_LABELS } from '../styles/registry.js';

defineProps({
  config: { type: Object, required: true },
  periods: { type: Array, default: () => [] },
});
</script>

<template>
  <div class="min-h-screen bg-clay-canvas font-dm text-clay-fg">
    <ClayBlobs />
    <div class="mx-auto max-w-5xl px-4 sm:px-6">
      <header class="py-14 text-center sm:py-20">
        <span class="inline-block rounded-full bg-white/70 px-5 py-2 font-nunito text-sm font-bold text-clay-accent shadow-clay-card backdrop-blur-xl">{{ config.departmentName }}</span>
        <h1 class="mx-auto mt-6 max-w-3xl font-nunito text-4xl font-black leading-[1.1] tracking-tight sm:text-6xl">
          <span class="clay-text-gradient">{{ config.siteName }}</span>
        </h1>
        <p class="mx-auto mt-5 max-w-xl text-clay-muted sm:text-lg">当前没有进行中的活动，可以回顾下面的历史期数。</p>
      </header>

      <!-- 历史期数 -->
      <section v-if="periods.length" class="pb-12">
        <h2 class="font-nunito text-3xl font-extrabold tracking-tight sm:text-4xl">📚 历史期数</h2>
        <p class="mt-2 text-clay-muted">点击任意一期，回看当时的抽奖与下午茶。</p>
        <div class="mt-6 grid gap-6 sm:grid-cols-2">
          <RouterLink
            v-for="p in periods"
            :key="p.id"
            :to="`/lottery/${p.id}`"
            class="group relative block overflow-hidden rounded-[32px] bg-white/70 p-7 shadow-clay-card backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-clay-card-hover"
          >
            <div class="flex items-center justify-between">
              <span class="rounded-full bg-clay-accent/10 px-3 py-1.5 text-xs font-bold text-clay-accent">{{ STYLE_LABELS[p.style] }}模板</span>
              <span class="rounded-full px-3 py-1.5 text-xs font-bold" :class="p.status === 'drawn' ? 'bg-clay-success/15 text-clay-success' : 'bg-clay-warning/15 text-clay-warning'">{{ p.status === 'drawn' ? '已开奖' : '进行中' }}</span>
            </div>
            <h3 class="mt-5 font-nunito text-2xl font-extrabold leading-tight">{{ p.title }}</h3>
            <div class="mt-4 flex flex-wrap gap-2 text-sm text-clay-muted">
              <span v-if="p.lotteryEnabled" class="rounded-2xl bg-clay-card px-3 py-1.5 shadow-clay-pressed">👥 已参与 {{ p.participantCount }} 人</span>
              <span v-if="p.teaEnabled" class="rounded-2xl bg-clay-card px-3 py-1.5 shadow-clay-pressed">🍰 含下午茶</span>
            </div>
            <div class="mt-6 inline-flex items-center gap-1 font-nunito font-bold text-clay-accent">
              查看这一期 <span class="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </RouterLink>
        </div>
      </section>

      <!-- 模块介绍（按系统级开关展示） -->
      <div v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="grid gap-6 pb-12 sm:grid-cols-2">
        <div v-if="config.lotteryModuleEnabled !== false" class="rounded-[32px] bg-white/70 p-7 shadow-clay-card backdrop-blur-xl">
          <div class="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 text-2xl shadow-clay-button">🎲</div>
          <h2 class="mt-4 font-nunito text-2xl font-extrabold">抽奖模块</h2>
          <p class="mt-2 leading-relaxed text-clay-muted">填写姓名和 1-9999 的幸运数字参与，开奖前互相保密，按取余算法公开开奖。</p>
        </div>
        <div v-if="config.teaModuleEnabled !== false" class="rounded-[32px] bg-white/70 p-7 shadow-clay-card backdrop-blur-xl">
          <div class="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 text-2xl shadow-clay-button">🍰</div>
          <h2 class="mt-4 font-nunito text-2xl font-extrabold">评分模块</h2>
          <p class="mt-2 leading-relaxed text-clay-muted">每期下午茶有多款商品，对每款做「不推荐 / 还行 / 推荐」评分，展示好评率。</p>
        </div>
      </div>

      <!-- 规则（按系统级开关展示） -->
      <div v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="rounded-[48px] bg-white/70 p-8 shadow-clay-deep backdrop-blur-xl sm:p-12">
        <h2 class="font-nunito text-3xl font-extrabold tracking-tight">🧮 规则模块</h2>
        <div class="mt-5 space-y-4">
          <div v-if="config.lotteryModuleEnabled !== false" class="rounded-[24px] bg-clay-card p-6 shadow-clay-pressed">
            <p class="font-nunito font-bold">抽奖规则</p>
            <p class="mt-2 whitespace-pre-line leading-relaxed text-clay-muted">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="rounded-[24px] bg-clay-card p-6 shadow-clay-pressed">
            <p class="font-nunito font-bold">下午茶评分规则</p>
            <p class="mt-2 whitespace-pre-line leading-relaxed text-clay-muted">{{ config.rulesTea }}</p>
          </div>
        </div>
      </div>

      <footer class="py-12 text-center text-sm text-clay-muted">{{ config.siteName }}</footer>
    </div>
  </div>
</template>

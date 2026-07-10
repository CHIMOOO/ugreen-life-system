<script setup>
// 直达某一期（后台「打开页面」预览用）。始终用该期自己的 style 渲染。
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api.js';
import { usePeriodShell } from '../usePeriodShell.js';
import { resolveStyle, setPinnedRandomStyle } from '../styles/registry.js';
import AppLoader from '../components/AppLoader.vue';
import ImageZoomOverlay from '../components/ImageZoomOverlay.vue';
import RefreshFab from '../components/RefreshFab.vue';

const route = useRoute();
const id = route.params.id;

const loading = ref(true);
const refreshing = ref(false);
const notFound = ref(false);
const config = ref(null);
const period = ref(null);

const { submitting, submitState, votedProducts, ratingBusy, nameStatus, reviewState, onSubmit, onRate, onNameInput, onCancel, onSubmitReview, syncLocal } =
  usePeriodShell(period);

const styleComponent = computed(() => (period.value ? resolveStyle(period.value.style) : null));

// 拉取本期数据（配置 + 该期）。onMounted 与「刷新数据」按钮共用。
async function load() {
  const [cfgRes, perRes] = await Promise.all([api.config(), api.period(id)]);
  config.value = cfgRes.data || {};
  setPinnedRandomStyle(config.value.randomThemeCurrent); // 该期风格若为 random，也用后台锁定的随机主题
  if (!perRes.ok || !perRes.data || perRes.data.error) notFound.value = true;
  else {
    notFound.value = false;
    period.value = perRes.data;
    syncLocal();
  }
}

onMounted(async () => {
  try {
    await load();
  } catch {
    notFound.value = true; // 后端不可达：显示「找不到这一期」而非卡在 Loading
  } finally {
    loading.value = false;
  }
});

async function refresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  try { await load(); } catch { /* 保留当前展示 */ }
  refreshing.value = false;
}
</script>

<template>
  <AppLoader v-if="loading" />
  <div v-else-if="notFound" class="grid min-h-screen place-items-center bg-slate-900 px-6 text-center text-white">
    <div>
      <p class="text-6xl">🤔</p>
      <h1 class="mt-4 text-2xl font-bold">找不到这一期</h1>
      <a href="/" class="mt-6 inline-block rounded-2xl bg-white px-6 py-3 font-bold text-slate-900">返回首页</a>
    </div>
  </div>
  <component
    v-else
    :is="styleComponent"
    :period="period"
    :config="config"
    :submitting="submitting"
    :submit-state="submitState"
    :voted-products="votedProducts"
    :rating-busy="ratingBusy"
    :name-status="nameStatus"
    :review-state="reviewState"
    @submit="onSubmit"
    @rate="onRate"
    @name-input="onNameInput"
    @cancel="onCancel"
    @submit-review="onSubmitReview"
  />
  <RefreshFab v-if="!notFound" :busy="refreshing" @refresh="refresh" />
  <ImageZoomOverlay />
</template>

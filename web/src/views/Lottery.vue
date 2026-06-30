<script setup>
// 直达某一期（后台「打开页面」预览用）。始终用该期自己的 style 渲染。
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api.js';
import { usePeriodShell } from '../usePeriodShell.js';
import { resolveStyle } from '../styles/registry.js';
import AppLoader from '../components/AppLoader.vue';
import ImageZoomOverlay from '../components/ImageZoomOverlay.vue';

const route = useRoute();
const id = route.params.id;

const loading = ref(true);
const notFound = ref(false);
const config = ref(null);
const period = ref(null);

const { submitting, submitState, votedProducts, ratingBusy, nameStatus, onSubmit, onRate, onNameInput, onCancel, syncLocal } =
  usePeriodShell(period);

const styleComponent = computed(() => (period.value ? resolveStyle(period.value.style) : null));

onMounted(async () => {
  try {
    const [cfgRes, perRes] = await Promise.all([api.config(), api.period(id)]);
    config.value = cfgRes.data || {};
    if (!perRes.ok || !perRes.data || perRes.data.error) notFound.value = true;
    else {
      period.value = perRes.data;
      syncLocal();
    }
  } catch {
    notFound.value = true; // 后端不可达：显示「找不到这一期」而非卡在 Loading
  } finally {
    loading.value = false;
  }
});
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
    @submit="onSubmit"
    @rate="onRate"
    @name-input="onNameInput"
    @cancel="onCancel"
  />
  <ImageZoomOverlay />
</template>

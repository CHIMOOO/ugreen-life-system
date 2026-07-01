<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api.js';
import { usePeriodShell } from '../usePeriodShell.js';
import { resolveStyle, randomStyleKey, setPinnedRandomStyle } from '../styles/registry.js';
import AppLoader from '../components/AppLoader.vue';
import NoEvent from '../components/NoEvent.vue';
import ImageZoomOverlay from '../components/ImageZoomOverlay.vue';

const loading = ref(true);
const config = ref(null);
const period = ref(null);
const periods = ref([]);

const { submitting, submitState, votedProducts, ratingBusy, nameStatus, onSubmit, onRate, onNameInput, onCancel, syncLocal } =
  usePeriodShell(period);

// 首页风格：跟随当期 / 随机 / 固定，由后台配置决定
const styleComponent = computed(() => {
  if (!period.value) return null;
  const mode = config.value?.homeStyleMode || 'follow';
  let key = period.value.style;
  if (mode === 'fixed') key = config.value?.homeFixedStyle || period.value.style;
  else if (mode === 'random') key = randomStyleKey(); // 遵循后台「随机主题缓存」锁定值
  return resolveStyle(key);
});

onMounted(async () => {
  try {
    const [cfgRes, actRes, listRes] = await Promise.all([api.config(), api.active(), api.periods()]);
    config.value = cfgRes.data || {};
    setPinnedRandomStyle(config.value.randomThemeCurrent); // 应用服务端锁定的随机主题（若开启缓存）
    period.value = actRes.data?.period || null;
    periods.value = Array.isArray(listRes.data) ? listRes.data : [];
    if (period.value) syncLocal();
  } catch {
    config.value = config.value || {}; // 后端不可达：退化为无活动空态，避免卡在 Loading
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AppLoader v-if="loading" />
  <template v-else>
    <component
      v-if="period && styleComponent"
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
    <NoEvent v-else :config="config" :periods="periods" />

    <!-- 总账单模块：固定悬浮入口，点击查看流水（详情页为学院风） -->
    <RouterLink
      v-if="config && config.billModuleEnabled !== false"
      to="/bill"
      class="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-5 py-3 font-bold text-slate-800 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white"
    >📒 总账单</RouterLink>

    <ImageZoomOverlay />
  </template>
</template>


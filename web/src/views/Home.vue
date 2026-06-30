<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api.js';
import { usePeriodShell } from '../usePeriodShell.js';
import { resolveStyle, STYLE_KEYS } from '../styles/registry.js';
import AppLoader from '../components/AppLoader.vue';
import NoEvent from '../components/NoEvent.vue';

const loading = ref(true);
const config = ref(null);
const period = ref(null);
const periods = ref([]);

const { submitting, submitState, votedProducts, ratingBusy, onSubmit, onRate, syncLocal } =
  usePeriodShell(period);

// 首页风格：跟随当期 / 随机 / 固定，由后台配置决定
const styleComponent = computed(() => {
  if (!period.value) return null;
  const mode = config.value?.homeStyleMode || 'follow';
  let key = period.value.style;
  if (mode === 'fixed') key = config.value?.homeFixedStyle || period.value.style;
  else if (mode === 'random') key = STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)];
  return resolveStyle(key);
});

onMounted(async () => {
  const [cfgRes, actRes, listRes] = await Promise.all([api.config(), api.active(), api.periods()]);
  config.value = cfgRes.data || {};
  period.value = actRes.data?.period || null;
  periods.value = Array.isArray(listRes.data) ? listRes.data : [];
  if (period.value) syncLocal();
  loading.value = false;
});
</script>

<template>
  <AppLoader v-if="loading" />
  <component
    v-else-if="period && styleComponent"
    :is="styleComponent"
    :period="period"
    :config="config"
    :submitting="submitting"
    :submit-state="submitState"
    :voted-products="votedProducts"
    :rating-busy="ratingBusy"
    @submit="onSubmit"
    @rate="onRate"
  />
  <NoEvent v-else :config="config" :periods="periods" />
</template>

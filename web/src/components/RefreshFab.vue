<script setup>
/*
 * 悬浮「刷新数据」按钮。放在各公开页面右下/左下角，点一下重新拉取当前页数据，
 * 免得等别人参与/评分/留言、或等开奖时要一直按 F5。中性白底药丸样式，适配所有主题。
 */
defineProps({
  busy: { type: Boolean, default: false },
  label: { type: String, default: '刷新数据' },
});
const emit = defineEmits(['refresh']);
</script>

<template>
  <button
    type="button"
    :disabled="busy"
    @click="emit('refresh')"
    class="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-5 py-3 font-bold text-slate-800 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-wait disabled:opacity-70"
    :aria-label="label"
  >
    <span class="text-lg" :class="{ 'animate-spin-slow': busy }">🔄</span>
    <span>{{ busy ? '刷新中…' : label }}</span>
  </button>
</template>

<style scoped>
@keyframes spin-slow { to { transform: rotate(360deg); } }
.animate-spin-slow { animation: spin-slow 0.8s linear infinite; }
</style>

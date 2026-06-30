<script setup>
// 全屏图片预览层：挂载一次，任意处 openZoom(src) 即弹出，点击任意位置或按 ESC 关闭。
import { watch, onBeforeUnmount } from 'vue';
import { useImageZoom } from '../useImageZoom.js';
const { zoomSrc, closeZoom } = useImageZoom();

function onKey(e) {
  if (e.key === 'Escape') closeZoom();
}
watch(zoomSrc, (v) => {
  if (typeof document === 'undefined') return;
  if (v) {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
  } else {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onKey);
  }
});
onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <transition name="zoom-fade">
    <div
      v-if="zoomSrc"
      @click="closeZoom"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      class="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <img :src="zoomSrc" alt="预览" class="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
      <button type="button" aria-label="关闭预览" class="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-2xl font-bold text-slate-800 shadow-lg">×</button>
    </div>
  </transition>
</template>

<style scoped>
.zoom-fade-enter-active,
.zoom-fade-leave-active { transition: opacity 0.2s; }
.zoom-fade-enter-from,
.zoom-fade-leave-to { opacity: 0; }
.zoom-fade-enter-active img { transition: transform 0.2s; }
.zoom-fade-enter-from img { transform: scale(0.9); }
</style>

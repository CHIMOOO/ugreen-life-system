<script setup>
// 全屏图片预览层：挂载一次，任意处 openZoom(src) 即弹出，点击任意位置关闭。
import { useImageZoom } from '../useImageZoom.js';
const { zoomSrc, closeZoom } = useImageZoom();
</script>

<template>
  <transition name="zoom-fade">
    <div
      v-if="zoomSrc"
      @click="closeZoom"
      class="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <img :src="zoomSrc" alt="预览" class="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
      <button class="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-2xl font-bold text-slate-800 shadow-lg">×</button>
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

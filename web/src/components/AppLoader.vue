<script setup>
defineProps({ label: { type: String, default: '正在加载…' } });
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-clay-canvas">
    <div class="flex flex-col items-center gap-6">
      <div class="app-loader-ring"></div>
      <div class="flex gap-2">
        <span class="app-loader-dot h-3 w-3 rounded-full bg-clay-accent" style="animation-delay: 0s"></span>
        <span class="app-loader-dot h-3 w-3 rounded-full bg-clay-accentAlt" style="animation-delay: .15s"></span>
        <span class="app-loader-dot h-3 w-3 rounded-full bg-clay-sky" style="animation-delay: .3s"></span>
      </div>
      <p class="font-nunito font-bold text-clay-muted">{{ label }}</p>
    </div>
  </div>
</template>

<script setup>
// 粘土风背景：3-4 个大号模糊光斑，缓慢漂浮，作为氛围光。
</script>

<template>
  <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div class="absolute -left-[10%] -top-[10%] h-[60vh] w-[60vh] rounded-full bg-[#8B5CF6]/20 blur-3xl animate-clay-float"></div>
    <div class="absolute -right-[10%] top-[15%] h-[55vh] w-[55vh] rounded-full bg-[#EC4899]/20 blur-3xl animate-clay-float-delayed"></div>
    <div class="absolute bottom-[-10%] left-[20%] h-[55vh] w-[55vh] rounded-full bg-[#0EA5E9]/20 blur-3xl animate-clay-float-slow"></div>
    <div class="absolute bottom-[5%] right-[15%] h-[40vh] w-[40vh] rounded-full bg-[#10B981]/15 blur-3xl animate-clay-breathe"></div>
  </div>
</template>

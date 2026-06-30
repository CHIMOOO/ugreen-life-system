<script setup>
// 摇骰子按钮：点击随机一个 1-9999 的幸运数字，并把骰子点数换成一个随机面（1-6）做轻量反馈。
// 无边框、无背景，骰子用 currentColor 绘制——自动继承各主题传入的文字色，兼容所有风格。
// 不做翻滚/老虎机动画（仅保留 hover/按下的极轻微反馈）。
import { ref, computed } from 'vue';

const emit = defineEmits(['roll']);
const face = ref(5);

const POS = { lo: 7.5, mid: 12, hi: 16.5 };
const FACES = {
  1: [['mid', 'mid']],
  2: [['lo', 'lo'], ['hi', 'hi']],
  3: [['lo', 'lo'], ['mid', 'mid'], ['hi', 'hi']],
  4: [['lo', 'lo'], ['lo', 'hi'], ['hi', 'lo'], ['hi', 'hi']],
  5: [['lo', 'lo'], ['lo', 'hi'], ['mid', 'mid'], ['hi', 'lo'], ['hi', 'hi']],
  6: [['lo', 'lo'], ['lo', 'mid'], ['lo', 'hi'], ['hi', 'lo'], ['hi', 'mid'], ['hi', 'hi']],
};
const pips = computed(() => (FACES[face.value] || FACES[5]).map(([cx, cy]) => ({ x: POS[cx], y: POS[cy] })));

function roll() {
  face.value = Math.floor(Math.random() * 6) + 1; // 换一个骰子面（静态反馈，无动画）
  emit('roll', Math.floor(Math.random() * 9999) + 1);
}
</script>

<template>
  <button type="button" @click="roll" class="dice-btn" title="点我摇一个幸运数字" aria-label="随机一个幸运数字">
    <svg viewBox="0 0 24 24" class="dice-svg" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" stroke="currentColor" stroke-width="1.8" />
      <circle v-for="(p, i) in pips" :key="i" :cx="p.x" :cy="p.y" r="1.8" fill="currentColor" />
    </svg>
  </button>
</template>

<style scoped>
.dice-btn {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.dice-svg {
  width: 1.6rem;
  height: 1.6rem;
  transition: transform 0.12s ease, opacity 0.12s ease;
}
.dice-btn:hover .dice-svg { opacity: 0.7; }
.dice-btn:active .dice-svg { transform: scale(0.9); }
</style>

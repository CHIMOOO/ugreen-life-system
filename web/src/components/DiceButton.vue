<script setup>
// 摇骰子按钮：点击后骰子翻滚 + 数字快速滚动（老虎机），最后落定一个 1-9999 的随机数。
// 通过 emit('roll', n) 持续把数字回传给父组件（绑定到幸运数字输入框）。
import { ref } from 'vue';

const emit = defineEmits(['roll']);
const rolling = ref(false);

const rand = () => Math.floor(Math.random() * 9999) + 1;

function roll() {
  if (rolling.value) return;
  rolling.value = true;
  let ticks = 0;
  const total = 15;
  const timer = setInterval(() => {
    ticks += 1;
    emit('roll', rand()); // 滚动中不断变化
    if (ticks >= total) {
      clearInterval(timer);
      rolling.value = false; // 最后一帧即为落定值
    }
  }, 55);
}
</script>

<template>
  <button
    type="button"
    @click="roll"
    class="dice-btn"
    :class="{ rolling }"
    title="点我摇一个幸运数字"
    aria-label="随机一个幸运数字"
  >
    <span class="dice">🎲</span>
  </button>
</template>

<style scoped>
.dice-btn {
  display: inline-grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  cursor: pointer;
  border: 2px solid currentColor;
  background: transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.dice-btn:hover { transform: translateY(-2px) scale(1.05); }
.dice-btn:active { transform: scale(0.92); }
.dice {
  font-size: 1.5rem;
  line-height: 1;
  display: inline-block;
  will-change: transform;
}
.dice-btn.rolling { box-shadow: 0 0 0 4px currentColor; opacity: 0.95; }
.dice-btn.rolling .dice { animation: dice-tumble 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) infinite; }
@keyframes dice-tumble {
  0% { transform: rotate(0) scale(1); }
  20% { transform: rotate(-30deg) scale(1.2) translateY(-5px); }
  45% { transform: rotate(220deg) scale(1.3) translateY(-9px); }
  70% { transform: rotate(430deg) scale(1.2) translateY(-5px); }
  100% { transform: rotate(720deg) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .dice-btn.rolling .dice { animation-duration: 0.2s; }
}
</style>

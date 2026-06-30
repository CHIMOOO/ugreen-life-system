<script setup>
/*
 * 抽奖提交前的「规则确认」弹窗（12 套 style 共用行为，外观随各自主题）。
 * 点击「立即参与」不直接发请求，而是先弹本弹窗展示规则，确认后才 emit('confirm') → 父级发接口。
 *
 * 行为（teleport / ESC / 锁滚动 / 防抖 / 过渡）集中在此；外观由 theme 对象（一组 class 字符串）驱动，
 * 每套 style 传入与自己「表单卡片」一致的 class，从而让弹窗也是该主题的样子。
 *
 * Props:
 *   open / rules / submitting / name / number  —— 行为与内容
 *   accent   主题强调色 hex（顶部色条、幸运数字、规则左边框）
 *   theme    外观 class 覆盖（见 DEFAULTS，未传的项用默认深色）
 *   title / icon / subText / confirmText / cancelText  —— 文案（可带主题口吻）
 * Emits: confirm / cancel
 */
import { ref, watch, computed, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  rules: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
  name: { type: String, default: '' },
  number: { type: [String, Number], default: '' },
  accent: { type: String, default: '#7c3aed' },
  theme: { type: Object, default: () => ({}) },
  title: { type: String, default: '确认参与抽奖' },
  icon: { type: String, default: '🎯' },
  subText: { type: String, default: '请确认信息并阅读规则，确认后开奖前对其他人保密。' },
  confirmText: { type: String, default: '✅ 确认提交' },
  cancelText: { type: String, default: '取消' },
});
const emit = defineEmits(['confirm', 'cancel']);

const DEFAULTS = {
  bar: true,
  overlay: 'bg-black/70 backdrop-blur-sm',
  panel: 'bg-slate-900 text-white rounded-2xl ring-1 ring-white/10',
  font: '',
  heading: 'text-xl font-bold text-white',
  sub: 'text-white/70',
  infoBox: 'rounded-xl bg-white/5',
  infoLabel: 'text-white/60',
  infoName: 'text-white',
  rulesLabel: 'text-white/50',
  rulesBox: 'rounded-xl border-l-2 bg-black/20 text-white/80',
  cancelBtn: 'rounded-xl border border-white/20 text-white/80 hover:bg-white/10',
  confirmBtn: 'rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:brightness-110',
};
const T = computed(() => ({ ...DEFAULTS, ...(props.theme || {}) }));

const confirmBtn = ref(null);

function cancel() {
  if (props.submitting) return;
  emit('cancel');
}
function confirm() {
  if (props.submitting) return;
  emit('confirm');
}
function onKeydown(e) {
  if (e.key === 'Escape') cancel();
}

watch(
  () => props.open,
  (v) => {
    if (typeof document === 'undefined') return;
    if (v) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeydown);
      nextTick(() => confirmBtn.value?.focus());
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeydown);
    }
  }
);
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onKeydown);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="csd-fade">
      <div v-if="open" class="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" :aria-label="title">
        <div class="absolute inset-0" :class="T.overlay" @click="cancel"></div>

        <Transition name="csd-pop" appear>
          <div v-if="open" class="relative z-10 w-full max-w-md overflow-hidden shadow-2xl" :class="[T.panel, T.font]">
            <div v-if="T.bar" class="h-1.5 w-full" :style="{ backgroundColor: accent }"></div>
            <div class="p-6 sm:p-7">
              <h3 class="flex items-center gap-2" :class="T.heading">
                <span class="text-2xl">{{ icon }}</span> {{ title }}
              </h3>

              <p class="mt-3 text-sm" :class="T.sub">{{ subText }}</p>

              <!-- 本次提交信息 -->
              <div class="mt-4 flex flex-wrap items-center gap-2 px-4 py-3 text-sm" :class="T.infoBox">
                <span :class="T.infoLabel">姓名</span>
                <span class="font-bold" :class="T.infoName">{{ name || '—' }}</span>
                <span class="mx-1 opacity-30">|</span>
                <span :class="T.infoLabel">幸运数字</span>
                <span class="font-mono text-base font-bold" :style="{ color: accent }">{{ number || '—' }}</span>
              </div>

              <!-- 规则 -->
              <div class="mt-4">
                <p class="mb-1.5 text-xs font-bold uppercase tracking-wider" :class="T.rulesLabel">抽奖规则</p>
                <div class="max-h-44 overflow-y-auto px-4 py-3 text-sm leading-relaxed" :class="T.rulesBox" :style="{ borderColor: accent }">
                  <p class="whitespace-pre-line">{{ rules || '请遵守抽奖规则，一个名字只能提交一次，重复提交将导致抽奖无效。' }}</p>
                </div>
              </div>

              <!-- 按钮 -->
              <div class="mt-6 flex gap-3">
                <button type="button" :disabled="submitting" @click="cancel"
                  class="flex-1 px-5 py-3 font-bold transition disabled:opacity-40" :class="T.cancelBtn">
                  {{ cancelText }}
                </button>
                <button ref="confirmBtn" type="button" :disabled="submitting" @click="confirm"
                  class="flex-[1.4] px-5 py-3 font-bold shadow-lg transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70" :class="T.confirmBtn">
                  <span v-if="submitting" class="inline-flex items-center gap-2">
                    <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"></span>
                    提交中…
                  </span>
                  <span v-else>{{ confirmText }}</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.csd-fade-enter-active,
.csd-fade-leave-active { transition: opacity 0.2s ease; }
.csd-fade-enter-from,
.csd-fade-leave-to { opacity: 0; }

.csd-pop-enter-active { transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease; }
.csd-pop-leave-active { transition: transform 0.15s ease, opacity 0.15s ease; }
.csd-pop-enter-from { transform: translateY(12px) scale(0.96); opacity: 0; }
.csd-pop-leave-to { transform: translateY(8px) scale(0.98); opacity: 0; }
</style>

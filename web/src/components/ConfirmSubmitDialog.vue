<script setup>
/*
 * 抽奖提交前的「规则确认」弹窗（12 套 style 共用）。
 * 点击「立即参与」不再直接发请求，而是先弹出本弹窗展示规则，
 * 用户点「确认提交」才真正 emit('confirm') → 由父级发接口。
 *
 * Props:
 *   open        是否显示
 *   rules       抽奖规则文案（config.rulesLottery）
 *   submitting  提交进行中（确认按钮 loading + 防抖，禁止关闭）
 *   name/number 本次将提交的姓名与幸运数字（给用户二次确认）
 *   accent      主题强调色（hex，仅用于细节点缀，默认紫色）
 * Emits: confirm / cancel
 */
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  rules: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
  name: { type: String, default: '' },
  number: { type: [String, Number], default: '' },
  accent: { type: String, default: '#7c3aed' },
});
const emit = defineEmits(['confirm', 'cancel']);

const confirmBtn = ref(null);

function cancel() {
  if (props.submitting) return; // 提交过程中不允许关闭
  emit('cancel');
}
function confirm() {
  if (props.submitting) return; // 防抖：进行中忽略重复点击
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
      <div v-if="open" class="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="确认参与抽奖">
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="cancel"></div>

        <!-- 卡片 -->
        <Transition name="csd-pop" appear>
          <div v-if="open" class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl ring-1 ring-white/10">
            <div class="h-1.5 w-full" :style="{ background: `linear-gradient(90deg, ${accent}, #ec4899)` }"></div>
            <div class="p-6 sm:p-7">
              <h3 class="flex items-center gap-2 text-xl font-bold">
                <span class="text-2xl">🎯</span> 确认参与抽奖
              </h3>

              <p class="mt-3 text-sm text-white/70">请确认信息并阅读规则，确认后开奖前对其他人保密。</p>

              <!-- 本次提交信息 -->
              <div class="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm">
                <span class="text-white/60">姓名</span>
                <span class="font-bold">{{ name || '—' }}</span>
                <span class="mx-1 text-white/20">|</span>
                <span class="text-white/60">幸运数字</span>
                <span class="font-mono text-base font-bold" :style="{ color: accent }">{{ number || '—' }}</span>
              </div>

              <!-- 规则 -->
              <div class="mt-4">
                <p class="mb-1.5 text-xs font-bold uppercase tracking-wider text-white/50">抽奖规则</p>
                <div class="max-h-44 overflow-y-auto rounded-xl border-l-2 bg-black/20 px-4 py-3 text-sm leading-relaxed text-white/80"
                  :style="{ borderColor: accent }">
                  <p class="whitespace-pre-line">{{ rules || '请遵守抽奖规则，一个名字只能提交一次，重复提交将导致抽奖无效。' }}</p>
                </div>
              </div>

              <!-- 按钮 -->
              <div class="mt-6 flex gap-3">
                <button type="button" :disabled="submitting" @click="cancel"
                  class="flex-1 rounded-xl border border-white/20 px-5 py-3 font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-40">
                  取消
                </button>
                <button ref="confirmBtn" type="button" :disabled="submitting" @click="confirm"
                  class="flex-[1.4] rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70">
                  <span v-if="submitting" class="inline-flex items-center gap-2">
                    <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                    提交中…
                  </span>
                  <span v-else>✅ 确认提交</span>
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

<script setup>
/*
 * 评价 / 建议模块（12 套 style + NoEvent 共用，靠 theme 传主题类名，做法同 ConfirmSubmitDialog）。
 * 一块自足的「评价墙」：顶部是留言表单（类型切换 + 可选姓名 + 必填内容），下方是本期已有留言。
 *
 * Props:
 *   period      期数对象（读 period.reviews.items 作为留言列表）
 *   config      系统配置（取 namePlaceholder 之类，可选）
 *   submitState { status: idle|sending|success|error, message }  由 usePeriodShell 提供
 *   theme       主题类名覆盖（都可选，缺省用 currentColor / accent 中性样式，明暗主题都能自适应）
 * Emits:
 *   submit-review({ kind, name, content })
 *
 * 默认样式尽量「跟随父级文字色 + accent 点缀」，因此不传 theme 也能在任意主题上看得过去；
 * 各 style 可传 panel/field/submit/item 等类名让它更贴合自身卡片风格。
 */
import { ref, computed, watch } from 'vue';
import { REVIEW_KINDS, REVIEW_KIND_LABEL, relativeTime } from '../useLottery.js';

const props = defineProps({
  period: { type: Object, required: true },
  config: { type: Object, default: () => ({}) },
  submitState: { type: Object, default: () => ({ status: 'idle', message: '' }) },
  theme: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['submit-review']);

const t = computed(() => ({
  accent: '#6366f1',
  panel: 'rounded-3xl border border-current/15 p-6 sm:p-8',
  heading: 'text-2xl font-bold',
  sub: 'text-sm opacity-70',
  field: 'w-full rounded-xl border border-current/20 bg-transparent px-4 py-2.5 outline-none transition focus:border-current/60',
  submit: '', // 留空则用 accent 实心按钮默认样式
  kindOn: '', // 留空则用 accent 高亮
  kindOff: 'border-current/25 opacity-70 hover:opacity-100',
  item: 'rounded-2xl border border-current/12 p-4',
  empty: 'opacity-60',
  ...props.theme,
}));

const KINDS = REVIEW_KINDS;
const kind = ref('review');
const name = ref('');
const content = ref('');
const localError = ref('');

const items = computed(() => props.period.reviews?.items || []);
const sending = computed(() => props.submitState.status === 'sending');
const remaining = computed(() => 1000 - content.value.length);

// 提交成功：清空内容（保留姓名，方便连发），类型复位为「评价」
watch(() => props.submitState.status, (s) => {
  if (s === 'success') { content.value = ''; localError.value = ''; }
});

const feedback = computed(() => {
  if (localError.value) return { type: 'error', text: localError.value };
  if (props.submitState.status === 'error') return { type: 'error', text: props.submitState.message };
  if (props.submitState.status === 'success') return { type: 'success', text: props.submitState.message || '感谢你的反馈！' };
  return null;
});

function submit() {
  localError.value = '';
  const c = content.value.trim();
  if (!c) { localError.value = '请填写评价内容'; return; }
  if (c.length > 1000) { localError.value = '内容过长（最多 1000 字）'; return; }
  emit('submit-review', { kind: kind.value, name: name.value.trim(), content: c });
}
</script>

<template>
  <section :class="t.panel">
    <h2 :class="t.heading">💬 评价与建议</h2>
    <p :class="['mt-1', t.sub]">留下你对<b>本期的评价</b>，或对<b>下一期的建议</b>。姓名可留空（匿名），内容必填。</p>

    <!-- 留言表单 -->
    <div class="mt-5 space-y-3">
      <!-- 类型切换 -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="k in KINDS" :key="k.key" type="button" @click="kind = k.key"
          class="rounded-full border-2 px-4 py-1.5 text-sm font-bold transition"
          :class="kind === k.key ? (t.kindOn || 'text-white') : t.kindOff"
          :style="kind === k.key && !t.kindOn ? { backgroundColor: t.accent, borderColor: t.accent } : (kind === k.key ? { borderColor: t.accent } : {})"
        >{{ k.emoji }} {{ k.label }}</button>
      </div>

      <input
        v-model="name" type="text" maxlength="30"
        :placeholder="'你的名字（可选，留空即匿名）'"
        :class="t.field"
      />
      <div>
        <textarea
          v-model="content" rows="3" maxlength="1000"
          :placeholder="kind === 'suggestion' ? '对下一期的建议…（例如：奖品、时间、口味）' : '对本期的评价…（例如：奖品、下午茶、组织）'"
          :class="[t.field, 'resize-y']"
        ></textarea>
        <div class="mt-1 flex items-center justify-between text-xs opacity-60">
          <span v-if="feedback" :class="feedback.type === 'error' ? 'font-bold text-rose-500 opacity-100' : 'font-bold opacity-100'" :style="feedback.type === 'success' ? { color: t.accent } : {}">
            {{ feedback.type === 'error' ? '⚠ ' : '✓ ' }}{{ feedback.text }}
          </span>
          <span v-else></span>
          <span :class="remaining < 0 ? 'text-rose-500' : ''">{{ content.length }}/1000</span>
        </div>
      </div>

      <button
        type="button" :disabled="sending" @click="submit"
        class="rounded-full px-6 py-2.5 font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
        :class="t.submit"
        :style="t.submit ? {} : { backgroundColor: t.accent }"
      >{{ sending ? '提交中…' : '提交' }}</button>
    </div>

    <!-- 评价墙 -->
    <div class="mt-7">
      <p class="text-sm font-bold opacity-80">大家的留言 · {{ items.length }} 条</p>
      <p v-if="!items.length" :class="['mt-3 text-sm', t.empty]">还没有留言，来做第一个吧～</p>
      <div v-else class="mt-3 space-y-3">
        <div v-for="r in items" :key="r.id" :class="t.item">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-bold"
              :style="{ color: t.accent, backgroundColor: t.accent + '1f' }"
            >{{ REVIEW_KIND_LABEL[r.kind] || '留言' }}</span>
            <span class="text-sm font-bold">{{ r.name || '匿名' }}</span>
            <span class="ml-auto text-xs opacity-55">{{ relativeTime(r.createdAt) }}</span>
          </div>
          <p class="mt-2 whitespace-pre-line break-words text-sm leading-relaxed opacity-90">{{ r.content }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

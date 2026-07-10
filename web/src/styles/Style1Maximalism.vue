<script setup>
/*
 * style1 · 极繁主义 / 多巴胺 —— 全部 style 的「参考实现」与统一数据契约。
 *
 * Props（所有 style 完全一致）:
 *   period       期数对象（见后端 serializePeriod）
 *   config       系统配置 { siteName, departmentName, rulesLottery, rulesTea }
 *   submitting   抽奖提交中
 *   submitState  { status: idle|success|joined|error, message }
 *   votedProducts{ [productId]: true }  本浏览器已评分的商品
 *   ratingBusy   { [productId]: true }  评分请求进行中
 * Emits:
 *   submit({ name, number })   提交抽奖
 *   rate({ productId, level }) 下午茶评分（level: bad|ok|good）
 *
 * 每个 style 都渲染四块：① 头部 ② 抽奖 ③ 下午茶 ④ 规则。
 */
import { assetUrl } from '../api.js';
import { stepExplain, TEA_LEVELS, teaExtraText } from '../useLottery.js';
import DiceButton from '../components/DiceButton.vue';
import ConfirmSubmitDialog from '../components/ConfirmSubmitDialog.vue';
import ReviewSection from '../components/ReviewSection.vue';
import Markdown from '../components/Markdown.vue';
import { openZoom } from '../useImageZoom.js';
import { useStyleShell } from '../useStyleShell.js';

const props = defineProps({
  period: { type: Object, required: true },
  config: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
  submitState: { type: Object, default: () => ({ status: 'idle', message: '' }) },
  votedProducts: { type: Object, default: () => ({}) },
  ratingBusy: { type: Object, default: () => ({}) },
  nameStatus: { type: Object, default: () => ({ exists: false, checking: false }) },
  reviewState: { type: Object, default: () => ({ status: 'idle', message: '' }) },
});
const emit = defineEmits(['submit', 'rate', 'name-input', 'cancel', 'submit-review']);

const ACCENTS = ['#FF3AF2', '#00F5D4', '#FFE600', '#FF6B35', '#7B2FFF'];
const accent = (i) => ACCENTS[((i % ACCENTS.length) + ACCENTS.length) % ACCENTS.length];

// 抽奖表单 / 规则确认弹窗 / 评分 / 撤销等交互逻辑：12 套 style 共用，见 useStyleShell。
// 本文件只保留自己的视觉（配色 ACCENTS + 模板）。
const {
  name, number, localError, showConfirm, pending, confirmCancel,
  isDrawn, lotteryOn, teaOn, reviewOn, joined, showForm, result, prizeGroups, skipped, errorMsg,
  doSubmit, confirmSubmit, doRate, doCancel, doSubmitReview,
} = useStyleShell(props, emit);

// 评价墙主题：跟随极繁主义配色（accent 用青色 max-secondary）
const reviewTheme = {
  accent: '#00F5D4',
  panel: 'rounded-3xl border-4 border-max-quinary bg-max-muted/60 p-6 text-white shadow-multi backdrop-blur-sm sm:p-8',
  heading: 'font-outfit text-3xl font-black uppercase text-max-secondary max-text-shadow-sm',
  sub: 'text-white/70',
  field: 'w-full rounded-2xl border-4 border-max-quaternary bg-max-muted/50 px-5 py-3 font-bold text-white placeholder-white/40 outline-none transition focus:border-max-tertiary',
  submit: 'bg-gradient-to-r from-[#FF3AF2] via-[#7B2FFF] to-[#00F5D4] uppercase tracking-widest',
  kindOff: 'border-white/30 text-white/70 hover:text-white',
  item: 'rounded-2xl border-2 border-max-quinary/40 bg-black/30 p-4',
  empty: 'text-white/50',
};
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-max-bg font-dm text-max-fg">
    <div class="pointer-events-none fixed inset-0 -z-10 pattern-mesh"></div>
    <div class="pointer-events-none fixed inset-0 -z-10 pattern-dots opacity-60"></div>
    <div class="pointer-events-none fixed left-1/2 top-1/3 -z-10 -translate-x-1/2 select-none font-unbounded text-[28vw] font-extrabold uppercase text-max-quinary/10">LUCKY</div>
    <div aria-hidden="true" class="pointer-events-none fixed left-[6%] top-[16%] text-6xl animate-float">✨</div>
    <div aria-hidden="true" class="pointer-events-none fixed right-[8%] top-[24%] text-7xl animate-float-reverse">🎉</div>

    <div class="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="py-10 text-center sm:py-14">
        <p class="font-bungee text-xl text-max-tertiary animate-bounce-subtle">{{ config.departmentName }} · 第 {{ period.id }} 期</p>
        <h1 class="mt-3 font-unbounded text-4xl font-extrabold uppercase leading-none tracking-tighter max-text-shadow sm:text-6xl">{{ period.title }}</h1>
        <p class="mt-4 text-sm font-bold uppercase tracking-widest text-max-secondary">{{ config.siteName }}</p>
        <p class="mt-3 font-black uppercase tracking-widest">
          <span v-if="isDrawn" class="text-max-tertiary max-text-shadow-sm">🏆 已开奖</span>
          <span v-else-if="lotteryOn" class="text-max-secondary">👥 已有 {{ period.participantCount }} 人参与</span>
          <span v-else class="text-max-secondary">🍰 下午茶评分进行中</span>
        </p>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-16">
        <!-- 表单 -->
        <div v-if="showForm" class="space-y-10">
          <div class="mx-auto w-full max-w-2xl">
            <div class="rounded-3xl border-4 border-max-tertiary bg-max-muted/70 p-8 shadow-multi backdrop-blur-sm sm:p-10">
              <h2 class="font-outfit text-3xl font-black uppercase text-max-accent max-text-shadow-sm">参与抽奖</h2>
              <p class="mt-2 text-max-fg/70">实名或匿名都行——匿名请用工号当幸运数字。开奖前你的信息对所有人保密。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block font-black uppercase tracking-widest text-max-secondary">你的姓名</label>
                  <input v-model="name" @input="emit('name-input', name)" type="text" maxlength="30" :placeholder="'例如：' + (config.namePlaceholder || '陈老板')"
                    class="w-full rounded-full border-4 border-max-accent bg-max-muted/50 px-6 py-4 text-lg font-bold text-white placeholder-white/40 outline-none backdrop-blur-sm transition focus:border-max-secondary focus:shadow-[0_0_24px_rgba(0,245,212,.5)]" />
                </div>
                <div>
                  <label class="mb-2 block font-black uppercase tracking-widest text-max-tertiary">幸运数字 (1-9999)</label>
                  <div class="flex items-center gap-3">
                    <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                      class="min-w-0 flex-1 rounded-full border-4 border-max-quaternary bg-max-muted/50 px-6 py-4 text-lg font-bold text-white placeholder-white/40 outline-none backdrop-blur-sm transition focus:border-max-tertiary focus:shadow-[0_0_24px_rgba(255,230,0,.5)]" />
                    <DiceButton @roll="(n) => (number = n)" class="shrink-0 text-max-tertiary" />
                  </div>
                </div>
                <p v-if="errorMsg" class="rounded-2xl border-4 border-max-accent bg-max-accent/15 px-5 py-3 font-bold text-max-accent">⚠ {{ errorMsg }}</p>
                <div v-if="nameStatus.exists" class="rounded-2xl border-4 border-max-tertiary bg-max-tertiary/15 px-5 py-3">
                  <p class="font-bold text-max-tertiary">该姓名已提交过本期抽奖。重复提交会导致抽奖无效，可先撤销再重新参与。<span class="text-white/70">（为保密不显示号码）</span></p>
                  <button @click="emit('cancel', name)" class="mt-2 rounded-full border-2 border-max-accent px-5 py-2 font-black uppercase text-max-accent transition hover:bg-max-accent hover:text-black">撤销抽奖</button>
                </div>
                <button :disabled="submitting" @click="doSubmit"
                  class="h-16 w-full rounded-full border-4 border-max-tertiary bg-gradient-to-r from-[#FF3AF2] via-[#7B2FFF] to-[#00F5D4] px-10 font-black uppercase tracking-widest text-white glow-accent transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50">
                  🚀 立即参与
                </button>
              </div>
            </div>
            <ConfirmSubmitDialog :open="showConfirm" :rules="config.rulesLottery" :submitting="submitting"
              :name="pending?.name" :number="pending?.number" :accent="accent(0)"
              :theme="{
                panel: 'bg-max-muted text-white rounded-3xl border-4 border-max-tertiary font-dm',
                heading: 'font-outfit text-2xl font-black uppercase text-max-accent',
                infoBox: 'rounded-2xl border-2 border-max-quinary/40 bg-black/30',
                infoLabel: 'text-white/50',
                rulesLabel: 'text-max-secondary',
                rulesBox: 'rounded-2xl border-l-4 bg-black/30 text-white/80',
                cancelBtn: 'rounded-full border-4 border-max-quinary/50 text-white/80 hover:bg-white/10',
                confirmBtn: 'rounded-full bg-gradient-to-r from-[#FF3AF2] via-[#7B2FFF] to-[#00F5D4] text-white font-black uppercase tracking-widest hover:scale-105',
              }"
              @confirm="confirmSubmit" @cancel="showConfirm = false" />
          </div>
          <div>
            <h3 class="font-outfit text-2xl font-black uppercase text-max-secondary max-text-shadow-sm">奖品</h3>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="(z, i) in period.prizes" :key="i" class="overflow-hidden rounded-3xl border-4 bg-max-muted/60 shadow-multi backdrop-blur-sm" :style="{ borderColor: accent(i) }">
                <button v-if="z.image" type="button" @click="openZoom(assetUrl(z.image))" class="block w-full cursor-zoom-in">
                  <img :src="assetUrl(z.image)" class="aspect-video w-full object-cover transition hover:brightness-110" :alt="z.name" />
                </button>
                <div v-else class="grid aspect-video w-full place-items-center text-6xl" :style="{ backgroundColor: accent(i) + '33' }">🎁</div>
                <div class="p-4">
                  <p class="truncate font-black uppercase" :style="{ color: accent(i) }">{{ z.name }}</p>
                  <p class="text-sm text-white/70">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="rounded-3xl border-8 border-max-secondary bg-max-muted/60 p-12 text-center shadow-multi-lg backdrop-blur-sm">
          <p class="text-8xl animate-bounce-subtle">🎊</p>
          <h2 class="mt-6 font-outfit text-4xl font-black uppercase max-text-shadow-sm">提交成功！</h2>
          <p class="mt-4 text-lg text-white/80">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-2 font-black uppercase tracking-widest text-max-tertiary">当前共 {{ period.participantCount }} 人参与</p>
          <div class="mt-8 border-t-2 border-white/10 pt-6">
            <template v-if="!confirmCancel">
              <p class="text-sm text-white/50">提交错了？可以撤销本次抽奖后重新参与（撤销不会显示你的号码）。</p>
              <button @click="confirmCancel = true" class="mt-3 rounded-full border-2 border-max-accent px-6 py-2.5 font-black uppercase text-max-accent transition hover:bg-max-accent hover:text-black">撤销抽奖</button>
            </template>
            <template v-else>
              <p class="text-sm font-bold text-max-accent">确认撤销？撤销后幸运数字将释放，且<u>不可找回</u>。</p>
              <div class="mt-3 flex justify-center gap-3">
                <button @click="confirmCancel = false" class="rounded-full border-2 border-white/30 px-6 py-2.5 font-black uppercase text-white/70 transition hover:bg-white/10">再想想</button>
                <button @click="doCancel" class="rounded-full bg-max-accent px-6 py-2.5 font-black uppercase text-black transition hover:brightness-110">确认撤销</button>
              </div>
            </template>
          </div>
        </div>

        <!-- 评价 / 建议：未开奖时位于抽奖下方；已开奖时位于结果上方 -->
        <ReviewSection v-if="reviewOn" :period="period" :config="config" :submit-state="reviewState" :theme="reviewTheme" class="mt-12" @submit-review="doSubmitReview" />

        <!-- 开奖结果 -->
        <div v-if="isDrawn && result" class="mt-12 space-y-12">
          <div>
            <h2 class="text-center font-unbounded text-4xl font-extrabold uppercase max-text-shadow sm:text-5xl">🏆 中奖名单</h2>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="rounded-3xl border-4 bg-max-muted/70 p-6 shadow-multi backdrop-blur-sm" :style="{ borderColor: accent(gi) }">
                <div class="flex items-center gap-4">
                  <div class="aspect-video w-24 shrink-0 overflow-hidden rounded-2xl border-4" :style="{ borderColor: accent(gi + 2) }">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: accent(gi) + '33' }">🎁</div>
                  </div>
                  <p class="font-outfit text-xl font-black uppercase" :style="{ color: accent(gi) }">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="rounded-full border-2 border-white/30 bg-black/30 px-4 py-2 font-bold">
                    {{ w.name }} · <span :style="{ color: accent(gi + 1) }">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 无效顺延：有中奖者被判无效时，展示这条规则与受影响的人 -->
          <div v-if="skipped.length" class="rounded-3xl border-4 border-max-accent bg-max-accent/10 p-6 shadow-multi backdrop-blur-sm sm:p-8">
            <h3 class="font-outfit text-2xl font-black uppercase text-max-accent max-text-shadow-sm">⚖ 无效顺延</h3>
            <p class="mt-2 leading-relaxed text-white/80">下列参与者因<b class="text-max-accent">重复提交 / 冒用姓名等被判无效</b>，已取消其中奖资格；空出的名额按规则由后一位<b class="text-max-secondary">顺延递补</b>（所以最终名单里出现了原本靠后的人）。</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-for="(s, si) in skipped" :key="si" class="rounded-full border-2 border-max-accent/60 bg-black/30 px-4 py-2 font-bold text-white/85">
                {{ s.name }} · <span class="text-max-accent line-through">{{ s.number }}</span>
              </span>
            </div>
          </div>

          <div class="rounded-3xl border-8 border-max-tertiary bg-max-muted/40 p-6 shadow-multi-lg backdrop-blur-sm sm:p-10">
            <h2 class="font-outfit text-3xl font-black uppercase text-max-tertiary max-text-shadow-sm">🧮 开奖算法推导</h2>
            <p class="mt-2 text-white/70">所有数字之和 = <b class="text-max-secondary">{{ result.totalSum }}</b>，共 <b class="text-max-secondary">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si" class="rounded-3xl border-4 bg-black/30 p-5 sm:p-6" :style="{ borderColor: accent(si) }">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full px-4 py-1.5 font-black uppercase text-black" :style="{ backgroundColor: accent(si) }">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-mono text-lg font-bold text-max-secondary">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei" class="rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition"
                    :class="ei === s.remainder ? 'scale-110 text-black' : 'text-white/70'"
                    :style="ei === s.remainder ? { backgroundColor: accent(si), borderColor: '#fff' } : { borderColor: 'rgba(255,255,255,.2)' }">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 leading-relaxed text-white/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="font-outfit text-2xl font-black uppercase text-max-secondary">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-center justify-between rounded-2xl border-2 border-max-quinary/40 bg-max-muted/40 px-4 py-3 backdrop-blur-sm">
                <span class="truncate font-bold">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-mono font-black" :style="{ color: accent(ei) }">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 评价 / 建议：抽奖模块本身关闭但评价开启时，单独成块 -->
      <ReviewSection v-if="reviewOn && !lotteryOn" :period="period" :config="config" :submit-state="reviewState" :theme="reviewTheme" class="mb-16" @submit-review="doSubmitReview" />

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-16">
        <h2 class="font-unbounded text-3xl font-extrabold uppercase max-text-shadow-sm sm:text-4xl">🍰 下午茶评分</h2>
        <p class="mt-2 text-white/70">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div v-if="period.bill && period.bill.show && period.bill.items.length" class="mt-5 rounded-3xl border-4 border-max-quaternary bg-max-muted/60 p-5 shadow-multi backdrop-blur-sm">
          <p class="font-outfit font-black uppercase text-max-quaternary">📒 本期账单 · 合计 ¥{{ period.bill.total }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span v-for="b in period.bill.items" :key="b.id" class="rounded-full border-2 border-white/30 bg-black/30 px-3 py-1 text-sm">{{ b.title }} · ¥{{ b.amount }}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="overflow-hidden rounded-3xl border-4 bg-max-muted/60 shadow-multi backdrop-blur-sm" :style="{ borderColor: accent(pi) }">
            <button v-if="prod.image" type="button" @click="openZoom(assetUrl(prod.image))" class="block w-full cursor-zoom-in">
              <img :src="assetUrl(prod.image)" class="h-44 w-full object-cover transition hover:brightness-110" :alt="prod.name" />
            </button>
            <div v-else class="grid h-44 w-full place-items-center text-6xl" :style="{ backgroundColor: accent(pi) + '33' }">🍰</div>
            <div class="p-5">
              <div class="min-w-0">
                <p class="truncate font-outfit text-lg font-black" :style="{ color: accent(pi) }">{{ prod.name }}</p>
                <p class="text-sm text-white/60">{{ prod.desc }}</p>
              </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-3 flex-1 overflow-hidden rounded-full bg-black/40">
                <div class="h-full rounded-full" :style="{ width: prod.ratings.goodRate + '%', backgroundColor: accent(pi + 1) }"></div>
              </div>
              <span class="shrink-0 font-mono text-sm font-bold" :style="{ color: accent(pi + 1) }">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-1 text-xs text-white/50">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 text-xs font-bold text-max-tertiary">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="rounded-full border-2 border-white/30 bg-black/30 py-2 text-sm font-bold transition hover:scale-105 active:scale-95 disabled:opacity-50">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-3 rounded-full bg-max-secondary/20 py-2 text-center text-sm font-bold text-max-secondary">✓ 已评分</p>
            <p v-else class="mt-3 rounded-full bg-black/30 py-2 text-center text-sm text-white/50">评分已结束</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 规则（按系统级模块开关展示：即使当期未开启某模块，首页仍按后台设置展示规则） -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mb-12">
        <h2 class="font-unbounded text-3xl font-extrabold uppercase max-text-shadow-sm sm:text-4xl">📜 规则</h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="rounded-3xl border-4 border-dashed border-max-quinary bg-max-muted/50 p-6 backdrop-blur-sm">
            <p class="font-black uppercase text-max-accent">抽奖规则</p>
            <Markdown :source="config.rulesLottery" class="mt-2 leading-relaxed text-white/80" />
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="rounded-3xl border-4 border-dashed border-max-secondary bg-max-muted/50 p-6 backdrop-blur-sm">
            <p class="font-black uppercase text-max-tertiary">下午茶评分规则</p>
            <Markdown :source="config.rulesTea" class="mt-2 leading-relaxed text-white/80" />
          </div>
        </div>
      </section>

      <footer class="py-10 text-center font-black uppercase tracking-widest text-white/40">{{ config.siteName }} · 第 {{ period.id }} 期</footer>
    </div>
  </div>
</template>

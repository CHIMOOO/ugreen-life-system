<script setup>
/*
 * style5 · Material Design 3 —— 与 style1 共用同一套数据契约，仅视觉风格不同。
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
import { openZoom } from '../useImageZoom.js';
import { stepExplain, TEA_LEVELS, teaExtraText } from '../useLottery.js';
import ReviewSection from '../components/ReviewSection.vue';
import { useStyleShell } from '../useStyleShell.js';
import DiceButton from '../components/DiceButton.vue';
import ConfirmSubmitDialog from '../components/ConfirmSubmitDialog.vue';
import Markdown from '../components/Markdown.vue';

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

// 抽奖表单 / 规则确认弹窗 / 评分 / 撤销等交互逻辑：12 套 style 共用，见 useStyleShell。
// 本文件只保留自己的视觉（配色 ACCENTS + 模板）。
const {
  name, number, localError, showConfirm, pending, confirmCancel,
  isDrawn, lotteryOn, teaOn, reviewOn, joined, showForm, result, prizeGroups, skipped, errorMsg,
  doSubmit, confirmSubmit, doRate, doCancel, doSubmitReview,
} = useStyleShell(props, emit);
// 「已参与」面板两步撤销的确认态 confirmCancel、doCancel 均来自 useStyleShell

// 评价墙主题：跟随 Material Design 3 配色（accent 用主色 md-primary #6750a4）
const reviewTheme = {
  accent: '#6750a4',
  panel: 'rounded-[28px] bg-md-surface p-6 text-md-onSurface md-elev-1 sm:p-8',
  heading: 'text-2xl font-normal text-md-primary',
  sub: 'text-md-secondary',
  field: 'w-full rounded-t-lg border-b-2 border-md-outline bg-md-surfaceVar px-4 py-3 text-md-onSurface outline-none transition-colors duration-200 placeholder:text-md-secondary/60 focus:border-md-primary',
  submit: 'rounded-full tracking-wide md-elev-1 hover:brightness-110 hover:md-elev-2 active:brightness-95',
  kindOff: 'border border-md-outline text-md-secondary hover:bg-md-surfaceVar',
  item: 'rounded-2xl bg-md-surfaceVar p-4',
  empty: 'text-md-secondary',
};
</script>

<template>
  <div class="min-h-screen bg-md-bg font-roboto text-md-onSurface">
    <!-- ① 头部 -->
    <header class="bg-md-surface md-elev-2">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div class="flex items-center gap-3">
          <div class="grid h-10 w-10 place-items-center rounded-full bg-md-primary text-md-onPrimary md-elev-1">🎁</div>
          <span class="text-lg font-medium tracking-tight">{{ config.siteName }}</span>
        </div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-md-surfaceVar px-4 py-1.5 text-sm font-medium text-md-onSurface">
          第 {{ period.id }} 期
        </span>
      </div>
    </header>

    <div class="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- 头部大标题 -->
      <section class="py-6 sm:py-10">
        <p class="text-sm font-medium tracking-wide text-md-secondary">{{ config.departmentName }}</p>
        <h1 class="mt-2 text-4xl font-normal leading-tight tracking-tight sm:text-5xl">{{ period.title }}</h1>
        <div class="mt-5">
          <span v-if="isDrawn" class="inline-flex items-center gap-2 rounded-full bg-md-primary px-5 py-2 text-sm font-medium text-md-onPrimary md-elev-1">
            🏆 已开奖
          </span>
          <span v-else-if="lotteryOn" class="inline-flex items-center gap-2 rounded-full bg-md-primary/10 px-5 py-2 text-sm font-medium text-md-primary">
            👥 进行中 · 已有 {{ period.participantCount }} 人参与
          </span>
          <span v-else class="inline-flex items-center gap-2 rounded-full bg-md-tertiary/10 px-5 py-2 text-sm font-medium text-md-tertiary">
            🍰 下午茶评分进行中
          </span>
        </div>
      </section>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-12">
        <!-- 表单 -->
        <div v-if="showForm" class="space-y-10">
          <div class="mx-auto w-full max-w-2xl">
            <div class="rounded-[28px] bg-md-surface p-7 md-elev-1 transition-shadow duration-200 hover:md-elev-2 sm:p-9">
              <h2 class="text-2xl font-normal text-md-primary">参与抽奖</h2>
              <p class="mt-1.5 text-sm text-md-secondary">实名或匿名都行——匿名请用工号当幸运数字。开奖前你的信息对所有人保密。</p>
              <div class="mt-7 space-y-6">
                <div>
                  <label class="mb-1 block text-xs font-medium text-md-primary">你的姓名</label>
                  <input v-model="name" @input="emit('name-input', name)" type="text" maxlength="30" :placeholder="'例如：' + (config.namePlaceholder || '陈老板')"
                    class="w-full rounded-t-lg border-b-2 border-md-outline bg-md-surfaceVar px-4 py-3 text-md-onSurface outline-none transition-colors duration-200 placeholder:text-md-secondary/60 focus:border-md-primary" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-md-primary">幸运数字 (1-9999)</label>
                  <div class="flex items-center gap-3">
                    <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                      class="min-w-0 flex-1 rounded-t-lg border-b-2 border-md-outline bg-md-surfaceVar px-4 py-3 text-md-onSurface outline-none transition-colors duration-200 placeholder:text-md-secondary/60 focus:border-md-primary" />
                    <DiceButton @roll="(n) => (number = n)" class="shrink-0 text-md-primary" />
                  </div>
                </div>
                <p v-if="errorMsg" class="flex items-center gap-2 rounded-lg border-b-2 border-md-error bg-md-error/5 px-4 py-3 text-sm font-medium text-md-error">
                  ⚠ {{ errorMsg }}
                </p>
                <div v-if="nameStatus.exists" class="rounded-lg bg-md-tertiary/10 px-4 py-3">
                  <p class="text-sm leading-relaxed text-md-onSurface/80">该姓名已提交过本期抽奖。重复提交会导致抽奖无效，可先撤销再重新参与。<span class="text-md-secondary">（为保密不显示号码）</span></p>
                  <button @click="emit('cancel', name)"
                    class="mt-2 inline-flex h-9 items-center justify-center rounded-full border border-md-error px-5 text-sm font-medium text-md-error transition-colors duration-200 hover:bg-md-error/10">
                    撤销抽奖
                  </button>
                </div>
                <button :disabled="submitting" @click="doSubmit"
                  class="inline-flex h-12 w-full items-center justify-center rounded-full bg-md-primary px-6 text-sm font-medium tracking-wide text-md-onPrimary md-elev-1 transition-all duration-200 hover:brightness-110 hover:md-elev-2 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
                  立即参与
                </button>
              </div>
            </div>
            <ConfirmSubmitDialog :open="showConfirm" :rules="config.rulesLottery" :submitting="submitting"
              :name="pending?.name" :number="pending?.number" :accent="'#6750a4'"
              title="确认参与抽奖" icon="🎁"
              :theme="{
                overlay: 'bg-black/50 backdrop-blur-sm',
                panel: 'bg-md-surface text-md-onSurface rounded-[28px] md-elev-2 font-roboto',
                heading: 'text-2xl font-normal text-md-primary',
                sub: 'text-md-secondary',
                infoBox: 'rounded-2xl bg-md-surfaceVar',
                infoLabel: 'text-md-secondary',
                infoName: 'text-md-onSurface',
                rulesLabel: 'text-md-secondary',
                rulesBox: 'rounded-2xl border-l-4 bg-md-surfaceVar text-md-onSurface/80',
                cancelBtn: 'rounded-full border border-md-outline text-md-secondary hover:bg-md-surfaceVar',
                confirmBtn: 'rounded-full bg-md-primary text-md-onPrimary md-elev-1 tracking-wide hover:brightness-110 hover:md-elev-2 active:brightness-95',
              }"
              @confirm="confirmSubmit" @cancel="showConfirm = false" />
          </div>
          <div>
            <h3 class="text-lg font-medium text-md-secondary">奖品</h3>
            <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="(z, i) in period.prizes" :key="i"
                class="overflow-hidden rounded-3xl bg-md-surface md-elev-1 transition-shadow duration-200 hover:md-elev-2">
                <button v-if="z.image" type="button" @click="openZoom(assetUrl(z.image))" class="block w-full cursor-zoom-in">
                  <img :src="assetUrl(z.image)" class="aspect-video w-full object-cover transition hover:brightness-105" :alt="z.name" />
                </button>
                <div v-else class="grid aspect-video w-full place-items-center bg-md-surfaceVar text-6xl">🎁</div>
                <div class="min-w-0 p-4">
                  <p class="truncate font-medium text-md-onSurface">{{ z.name }}</p>
                  <p class="text-sm text-md-secondary">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="rounded-[28px] bg-md-surface p-10 text-center md-elev-2 sm:p-14">
          <p class="text-7xl">🎊</p>
          <h2 class="mt-6 text-3xl font-normal text-md-primary">提交成功！</h2>
          <p class="mt-3 text-md-secondary">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-5 inline-flex items-center gap-2 rounded-full bg-md-primary/10 px-5 py-2 text-sm font-medium text-md-primary">
            当前共 {{ period.participantCount }} 人参与
          </p>
          <div class="mt-8 border-t border-md-outline/30 pt-6">
            <template v-if="!confirmCancel">
              <p class="text-sm text-md-secondary">提交错了？可以撤销本次抽奖后重新参与（撤销不会显示你的号码）。</p>
              <button @click="confirmCancel = true"
                class="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-md-error px-5 text-sm font-medium text-md-error transition-colors duration-200 hover:bg-md-error/10">
                撤销抽奖
              </button>
            </template>
            <template v-else>
              <p class="text-sm font-medium text-md-error">确认撤销？撤销后幸运数字将释放，且<u>不可找回</u>。</p>
              <div class="mt-3 flex justify-center gap-3">
                <button @click="confirmCancel = false"
                  class="inline-flex h-10 items-center justify-center rounded-full border border-md-outline px-5 text-sm font-medium text-md-secondary transition-colors duration-200 hover:bg-md-surfaceVar">
                  再想想
                </button>
                <button @click="doCancel"
                  class="inline-flex h-10 items-center justify-center rounded-full bg-md-error px-6 text-sm font-medium text-md-onPrimary md-elev-1 transition-all duration-200 hover:brightness-110 hover:md-elev-2 active:brightness-95">
                  确认撤销
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- 评价 / 建议：未开奖时位于抽奖下方；已开奖时位于结果上方 -->
        <ReviewSection v-if="reviewOn" :period="period" :config="config" :submit-state="reviewState" :theme="reviewTheme" class="mt-12" @submit-review="doSubmitReview" />

        <!-- 开奖结果 -->
        <div v-if="isDrawn && result" class="mt-12 space-y-10">
          <div>
            <h2 class="text-2xl font-normal sm:text-3xl">🏆 中奖名单</h2>
            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="rounded-3xl bg-md-primary/10 p-6 transition-shadow duration-200">
                <div class="flex items-center gap-4">
                  <div class="aspect-video w-20 shrink-0 overflow-hidden rounded-2xl bg-md-surface md-elev-1">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center text-xl">🎁</div>
                  </div>
                  <p class="text-lg font-medium text-md-primary">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi"
                    class="inline-flex items-center gap-1.5 rounded-full bg-md-primary px-4 py-1.5 text-sm font-medium text-md-onPrimary md-elev-1">
                    {{ w.name }} · {{ w.number }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 无效顺延：有中奖者被判无效时，展示这条规则与受影响的人 -->
          <div v-if="skipped.length" class="rounded-[28px] bg-md-error/10 p-6 md-elev-1 sm:p-8">
            <h3 class="text-xl font-normal text-md-error sm:text-2xl">⚖ 无效顺延</h3>
            <p class="mt-2 text-sm leading-relaxed text-md-onSurface/80">下列参与者因<b class="font-medium text-md-error">重复提交 / 冒用姓名等被判无效</b>，已取消其中奖资格；空出的名额按规则由后一位<b class="font-medium text-md-tertiary">顺延递补</b>（所以最终名单里出现了原本靠后的人）。</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-for="(s, si) in skipped" :key="si" class="inline-flex items-center gap-1.5 rounded-full bg-md-surface px-4 py-2 text-sm font-medium text-md-onSurface md-elev-1">
                {{ s.name }} · <span class="text-md-error line-through">{{ s.number }}</span>
              </span>
            </div>
          </div>

          <div class="rounded-[28px] bg-md-surface p-6 md-elev-1 sm:p-9">
            <h2 class="text-xl font-normal text-md-primary sm:text-2xl">🧮 开奖算法推导</h2>
            <p class="mt-2 text-sm text-md-secondary">所有数字之和 = <b class="font-medium text-md-onSurface">{{ result.totalSum }}</b>，共 <b class="font-medium text-md-onSurface">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-6 space-y-4">
              <div v-for="(s, si) in result.steps" :key="si" class="rounded-2xl bg-md-surfaceVar p-5 sm:p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="inline-flex items-center rounded-full bg-md-tertiary px-4 py-1.5 text-sm font-medium text-md-onPrimary">
                    第 {{ si + 1 }} 抽 · {{ s.prizeName }}
                  </span>
                  <span class="font-mono text-base font-medium text-md-primary">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei"
                    class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200"
                    :class="ei === s.remainder ? 'bg-md-primary text-md-onPrimary md-elev-1' : 'border border-md-outline text-md-secondary'">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 text-sm leading-relaxed text-md-onSurface/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-medium text-md-secondary">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-for="(e, ei) in result.sorted" :key="ei"
                class="inline-flex items-center gap-2 rounded-full bg-md-surface px-4 py-2 text-sm md-elev-1">
                <span class="font-medium text-md-onSurface">{{ e.name }}</span>
                <span class="font-mono text-md-primary">{{ e.number }}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 评价 / 建议：抽奖模块本身关闭但评价开启时，单独成块 -->
      <ReviewSection v-if="reviewOn && !lotteryOn" :period="period" :config="config" :submit-state="reviewState" :theme="reviewTheme" class="mb-16" @submit-review="doSubmitReview" />

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-12">
        <h2 class="text-2xl font-normal sm:text-3xl">🍰 下午茶评分</h2>
        <p class="mt-2 text-sm text-md-secondary">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div v-if="period.bill && period.bill.show && period.bill.items.length" class="mt-5 rounded-[24px] border border-md-outline/40 bg-md-surfaceVar p-5">
          <p class="text-sm font-medium text-md-tertiary">📒 本期账单 · 合计 ¥{{ period.bill.total }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="b in period.bill.items" :key="b.id" class="rounded-full border border-md-outline/30 bg-md-surface px-3 py-1 text-xs text-md-secondary">{{ b.title }} · ¥{{ b.amount }}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id"
            class="overflow-hidden rounded-[24px] bg-md-surface md-elev-1 transition-shadow duration-200 hover:md-elev-2">
            <button v-if="prod.image" type="button" @click="openZoom(assetUrl(prod.image))" class="block w-full cursor-zoom-in">
              <img :src="assetUrl(prod.image)" class="h-44 w-full object-cover transition hover:brightness-105" :alt="prod.name" />
            </button>
            <div v-else class="grid h-44 w-full place-items-center bg-md-surfaceVar text-6xl">🍰</div>
            <div class="p-5">
            <div class="min-w-0">
              <p class="truncate text-lg font-medium text-md-onSurface">{{ prod.name }}</p>
              <p class="truncate text-sm text-md-secondary">{{ prod.desc }}</p>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-md-surfaceVar">
                <div class="h-full rounded-full bg-md-primary transition-all duration-300" :style="{ width: prod.ratings.goodRate + '%' }"></div>
              </div>
              <span class="shrink-0 font-mono text-sm font-medium text-md-primary">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-1.5 text-xs text-md-secondary">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1.5 text-xs font-medium text-md-tertiary">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-4 grid grid-cols-3 gap-2">
              <button v-for="(lv, lvi) in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="inline-flex h-10 items-center justify-center rounded-full px-3 text-sm font-medium transition-all duration-200 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                :class="lvi === 0 ? 'border border-md-outline text-md-secondary' : lvi === 1 ? 'bg-md-surfaceVar text-md-onSurface' : 'bg-md-primary text-md-onPrimary md-elev-1'">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-md-primary/10 px-4 py-2 text-sm font-medium text-md-primary">
              ✓ 已评分
            </p>
            <p v-else class="mt-4 inline-flex items-center rounded-full bg-md-surfaceVar px-4 py-2 text-sm text-md-secondary">评分已结束</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mb-10">
        <h2 class="text-2xl font-normal sm:text-3xl">📜 规则</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="rounded-[24px] border border-md-outline/40 bg-md-surface p-6">
            <p class="flex items-center gap-2 font-medium text-md-primary"><span class="text-lg">🎰</span>抽奖规则</p>
            <Markdown :source="config.rulesLottery" class="mt-3 text-sm leading-relaxed text-md-onSurface/80" />
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="rounded-[24px] border border-md-outline/40 bg-md-surface p-6">
            <p class="flex items-center gap-2 font-medium text-md-tertiary"><span class="text-lg">☕</span>下午茶评分规则</p>
            <Markdown :source="config.rulesTea" class="mt-3 text-sm leading-relaxed text-md-onSurface/80" />
          </div>
        </div>
      </section>

      <footer class="border-t border-md-outline/30 py-8 text-center text-sm text-md-secondary">{{ config.siteName }} · 第 {{ period.id }} 期</footer>
    </div>
  </div>
</template>

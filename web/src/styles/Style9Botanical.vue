<script setup>
/*
 * style9 · 植物自然 / Botanical —— 与 style1 完全一致的数据契约，仅视觉不同。
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
import { ref, computed, watch } from 'vue';
import { assetUrl } from '../api.js';
import { useLotteryForm, stepExplain, winnersByPrize, TEA_LEVELS, teaExtraText } from '../useLottery.js';
import DiceButton from '../components/DiceButton.vue';
import ConfirmSubmitDialog from '../components/ConfirmSubmitDialog.vue';
import { openZoom } from '../useImageZoom.js';

const props = defineProps({
  period: { type: Object, required: true },
  config: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
  submitState: { type: Object, default: () => ({ status: 'idle', message: '' }) },
  votedProducts: { type: Object, default: () => ({}) },
  ratingBusy: { type: Object, default: () => ({}) },
  nameStatus: { type: Object, default: () => ({ exists: false, checking: false }) },
});
const emit = defineEmits(['submit', 'rate', 'name-input', 'cancel']);

const isDrawn = computed(() => props.period.status === 'drawn');
const lotteryOn = computed(() => props.period.lotteryEnabled);
const teaOn = computed(() => props.period.teaEnabled && props.period.tea?.products?.length);
const joined = computed(() => ['success', 'joined'].includes(props.submitState.status));
const showForm = computed(() => lotteryOn.value && !isDrawn.value && !joined.value);
const result = computed(() => props.period.result);
const prizeGroups = computed(() => (result.value ? winnersByPrize(result.value) : []));

const { name, number, validate } = useLotteryForm();
const localError = ref('');
const showConfirm = ref(false); // 提交前的规则确认弹窗
const pending = ref(null);
function doSubmit() {
  localError.value = '';
  const r = validate();
  if (r.error) { localError.value = r.error; return; }
  pending.value = { name: r.name, number: r.number };
  showConfirm.value = true; // 先弹规则确认，确认后才真正提交
}
function confirmSubmit() {
  if (props.submitting || !pending.value) return;
  emit('submit', pending.value);
}
// 提交出错时关闭弹窗，让错误信息回到表单展示；成功则整块切到「已参与」自动卸载
watch(() => props.submitState.status, (s) => { if (s === 'error') showConfirm.value = false; });
const errorMsg = computed(() => localError.value || (props.submitState.status === 'error' ? props.submitState.message : ''));
function doRate(productId, level) { emit('rate', { productId, level }); }
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bot-paper font-poppins text-bot-ink">
    <!-- 散布的手绘叶子 / 枝条装饰 -->
    <div aria-hidden="true" class="pointer-events-none fixed left-[4%] top-[12%] -z-10 text-6xl opacity-30 animate-bot-sway">🌿</div>
    <div aria-hidden="true" class="pointer-events-none fixed right-[6%] top-[20%] -z-10 text-7xl opacity-25 animate-bot-sway" style="animation-delay:-2s">🍃</div>
    <div aria-hidden="true" class="pointer-events-none fixed left-[8%] bottom-[14%] -z-10 text-5xl opacity-20 animate-bot-sway" style="animation-delay:-3.5s">🌱</div>
    <div aria-hidden="true" class="pointer-events-none fixed right-[10%] bottom-[10%] -z-10 text-6xl opacity-25 animate-bot-sway" style="animation-delay:-1s">🌿</div>
    <svg aria-hidden="true" class="pointer-events-none fixed -left-10 top-1/3 -z-10 h-72 w-72 opacity-10 animate-bot-sway" viewBox="0 0 100 100" fill="none" stroke="#3E6B47" stroke-width="2">
      <path d="M50 95 C50 60 50 30 50 8" />
      <path d="M50 70 C30 64 22 50 20 38 C36 42 46 56 50 70 Z" fill="#8FA98A" fill-opacity="0.25" />
      <path d="M50 52 C70 46 78 32 80 20 C64 24 54 38 50 52 Z" fill="#3E6B47" fill-opacity="0.18" />
      <path d="M50 36 C32 30 26 18 24 8 C40 12 48 24 50 36 Z" fill="#8FA98A" fill-opacity="0.25" />
    </svg>

    <div class="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="py-12 text-center sm:py-16">
        <div class="flex items-center justify-center gap-4">
          <svg aria-hidden="true" class="h-10 w-10 text-bot-sage animate-bot-sway" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 3c-9 0-15 5-17 12C3 17 6 19 12 19 19 19 22 12 22 3Z" opacity="0.7" />
            <path d="M22 3C12 7 7 13 5 19" fill="none" stroke="#3E6B47" stroke-width="1.2" />
          </svg>
          <p class="font-cormorant text-2xl italic text-bot-leaf">{{ config.departmentName }}</p>
          <svg aria-hidden="true" class="h-10 w-10 -scale-x-100 text-bot-sage animate-bot-sway" style="animation-delay:-2s" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 3c-9 0-15 5-17 12C3 17 6 19 12 19 19 19 22 12 22 3Z" opacity="0.7" />
            <path d="M22 3C12 7 7 13 5 19" fill="none" stroke="#3E6B47" stroke-width="1.2" />
          </svg>
        </div>
        <h1 class="mt-4 font-cormorant text-5xl font-semibold italic leading-tight tracking-tight text-bot-ink sm:text-7xl">{{ period.title }}</h1>
        <p class="mt-5 text-xs font-medium uppercase tracking-[0.3em] text-bot-leaf">{{ config.siteName }}</p>

        <div class="mt-7 flex items-center justify-center gap-4">
          <!-- 叶徽：圆形期数 -->
          <div class="grid h-16 w-16 place-items-center rounded-full border-2 border-bot-leaf bg-bot-cream/70 bot-card">
            <span class="font-cormorant text-2xl font-semibold text-bot-leaf">{{ period.id }}</span>
          </div>
          <span v-if="isDrawn" class="inline-flex items-center gap-2 rounded-full bg-bot-leaf px-5 py-2 font-medium text-bot-cream bot-card">🌼 已开奖</span>
          <span v-else-if="lotteryOn" class="inline-flex items-center gap-2 rounded-full border border-bot-sage bg-bot-cream/70 px-5 py-2 font-medium text-bot-leaf">🌿 已有 {{ period.participantCount }} 人参与</span>
          <span v-else class="inline-flex items-center gap-2 rounded-full border border-bot-sage bg-bot-cream/70 px-5 py-2 font-medium text-bot-leaf">🍵 下午茶评分进行中</span>
        </div>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-20">
        <!-- 表单 -->
        <div v-if="showForm" class="space-y-10">
          <div class="mx-auto w-full max-w-2xl">
            <div class="rounded-[28px] border border-bot-sage/50 bg-bot-cream/70 p-8 bot-card sm:p-10">
              <h2 class="flex items-center gap-2 font-cormorant text-3xl font-semibold text-bot-leaf">
                <span class="text-2xl">🌱</span> 参与抽奖
              </h2>
              <p class="mt-2 font-cormorant text-lg italic text-bot-ink/70">填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block font-cormorant text-lg font-medium text-bot-leaf">你的姓名</label>
                  <input v-model="name" @input="emit('name-input', name)" type="text" maxlength="30" :placeholder="'例如：' + (config.namePlaceholder || '陈老板')"
                    class="w-full rounded-2xl border border-bot-sage bg-white px-5 py-4 text-lg text-bot-ink placeholder-bot-sage/60 outline-none transition focus:border-bot-leaf focus:ring-2 focus:ring-bot-leaf/20" />
                </div>
                <div>
                  <label class="mb-2 block font-cormorant text-lg font-medium text-bot-leaf">幸运数字 (1-9999)</label>
                  <div class="flex items-center gap-3">
                    <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                      class="min-w-0 flex-1 rounded-2xl border border-bot-sage bg-white px-5 py-4 text-lg text-bot-ink placeholder-bot-sage/60 outline-none transition focus:border-bot-leaf focus:ring-2 focus:ring-bot-leaf/20" />
                    <DiceButton @roll="(n) => (number = n)" class="shrink-0 text-bot-terracotta" />
                  </div>
                </div>
                <p v-if="errorMsg" class="rounded-2xl border border-bot-terracotta/60 bg-bot-terracotta/10 px-5 py-3 font-medium text-bot-terracotta">🍂 {{ errorMsg }}</p>
                <div v-if="nameStatus.exists" class="rounded-2xl border border-bot-terracotta/50 bg-bot-terracotta/10 px-5 py-4">
                  <p class="font-cormorant text-base leading-relaxed text-bot-ink/80">🍂 该姓名已提交过本期抽奖。重复提交会导致抽奖无效，可先撤销再重新参与。<span class="text-bot-ink/55">（为保密不显示号码）</span></p>
                  <button @click="emit('cancel', name)" class="mt-3 rounded-full border border-bot-terracotta px-5 py-2 text-sm font-medium text-bot-terracotta transition hover:-translate-y-0.5 hover:bg-bot-terracotta hover:text-bot-cream active:translate-y-0">撤销抽奖</button>
                </div>
                <button :disabled="submitting" @click="doSubmit"
                  class="h-14 w-full rounded-full bg-bot-leaf px-10 font-medium tracking-wide text-bot-cream transition-all duration-200 hover:-translate-y-0.5 hover:bg-bot-ink hover:shadow-lg active:translate-y-0 disabled:opacity-50">
                  🌿 立即参与
                </button>
              </div>
            </div>
            <ConfirmSubmitDialog :open="showConfirm" :rules="config.rulesLottery" :submitting="submitting"
              :name="pending?.name" :number="pending?.number" :accent="'#4d7c0f'"
              @confirm="confirmSubmit" @cancel="showConfirm = false" />
          </div>
          <div>
            <h3 class="flex items-center gap-2 font-cormorant text-2xl font-semibold text-bot-leaf">
              <span class="text-xl">🌸</span> 奖品
            </h3>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="(z, i) in period.prizes" :key="i" class="overflow-hidden rounded-[24px] border border-bot-sage/40 bg-bot-cream/70 bot-card transition hover:-translate-y-0.5">
                <button v-if="z.image" type="button" @click="openZoom(assetUrl(z.image))" class="block w-full cursor-zoom-in">
                  <img :src="assetUrl(z.image)" class="h-44 w-full object-cover transition hover:brightness-105" :alt="z.name" />
                </button>
                <div v-else class="grid h-44 w-full place-items-center bg-bot-sage/20 text-6xl">🎁</div>
                <div class="min-w-0 p-4">
                  <p class="truncate font-cormorant text-lg font-semibold text-bot-ink">{{ z.name }}</p>
                  <p class="text-sm text-bot-leaf">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="rounded-[28px] border border-bot-leaf/40 bg-bot-cream/70 p-12 text-center bot-card">
          <p class="text-7xl animate-bot-sway">🌷</p>
          <h2 class="mt-6 font-cormorant text-4xl font-semibold italic text-bot-leaf">提交成功！</h2>
          <p class="mt-4 font-cormorant text-xl italic text-bot-ink/75">你的幸运数字已悄悄种下，开奖前对其他人保密。静待花开吧～</p>
          <p class="mt-3 inline-flex items-center gap-2 rounded-full border border-bot-sage bg-bot-bg/60 px-5 py-2 font-medium text-bot-leaf">🌿 当前共 {{ period.participantCount }} 人参与</p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-14">
          <!-- (a) 中奖名单 -->
          <div>
            <h2 class="text-center font-cormorant text-4xl font-semibold italic text-bot-ink sm:text-5xl">🌼 中奖名单</h2>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="relative overflow-hidden rounded-[24px] border border-bot-sage/40 bg-bot-cream/70 p-6 bot-card">
                <span aria-hidden="true" class="pointer-events-none absolute -right-3 -top-3 text-5xl text-bot-bloom/30">🌸</span>
                <div class="flex items-center gap-4">
                  <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-bot-sage/50 bg-bot-bg">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center bg-bot-sage/20 text-2xl">🎁</div>
                  </div>
                  <p class="font-cormorant text-xl font-semibold text-bot-leaf">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="rounded-full border border-bot-sage bg-bot-bg/70 px-4 py-2 text-sm font-medium text-bot-ink">
                    {{ w.name }} · <span class="text-bot-terracotta">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- (b) 开奖算法推导 -->
          <div class="rounded-[28px] border border-bot-leaf/30 bg-bot-cream/50 p-6 bot-card sm:p-10">
            <h2 class="flex items-center gap-2 font-cormorant text-3xl font-semibold text-bot-leaf">
              <span class="text-2xl">🌿</span> 开奖算法推导
            </h2>
            <p class="mt-2 font-cormorant text-lg italic text-bot-ink/70">所有数字之和 = <b class="text-bot-terracotta">{{ result.totalSum }}</b>，共 <b class="text-bot-terracotta">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si" class="rounded-[24px] border border-bot-sage/40 bg-bot-bg/60 p-5 sm:p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full bg-bot-leaf px-4 py-1.5 text-sm font-medium text-bot-cream">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-cormorant text-xl font-semibold text-bot-terracotta">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei" class="rounded-full px-3 py-1.5 text-sm font-medium transition"
                    :class="ei === s.remainder ? 'bg-bot-leaf text-bot-cream shadow' : 'border border-bot-sage text-bot-ink/70'">
                    {{ e.number }}<template v-if="ei === s.remainder"> 🌼 {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 font-cormorant text-lg italic leading-relaxed text-bot-ink/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <!-- (c) 全部参与者 -->
          <div>
            <h3 class="flex items-center gap-2 font-cormorant text-2xl font-semibold text-bot-leaf">
              <span class="text-xl">🌱</span> 全部参与者（{{ result.sorted.length }} 人 · 按数字升序）
            </h3>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-center justify-between rounded-full border border-bot-sage/50 bg-bot-cream/60 px-4 py-2.5">
                <span class="flex items-center gap-1.5 truncate text-sm font-medium text-bot-ink"><span class="text-bot-sage">🍃</span>{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-cormorant font-semibold text-bot-terracotta">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-20">
        <h2 class="flex items-center gap-2 font-cormorant text-3xl font-semibold italic text-bot-ink sm:text-4xl">
          <span class="text-2xl">🍵</span> 下午茶评分
        </h2>
        <p class="mt-2 font-cormorant text-lg italic text-bot-ink/70">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div v-if="period.bill && period.bill.show && period.bill.items.length" class="mt-5 rounded-[24px] border border-bot-sage/40 bg-bot-cream/70 p-5 bot-card">
          <p class="font-cormorant text-lg font-semibold italic text-bot-leaf">📒 本期账单 · 合计 ¥{{ period.bill.total }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span v-for="b in period.bill.items" :key="b.id" class="rounded-full border border-bot-sage/50 bg-bot-bg px-3 py-1 text-sm text-bot-ink/70">{{ b.title }} · ¥{{ b.amount }}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="overflow-hidden rounded-[24px] border border-bot-sage/40 bg-bot-cream/70 bot-card transition hover:-translate-y-0.5">
            <button v-if="prod.image" type="button" @click="openZoom(assetUrl(prod.image))" class="block w-full cursor-zoom-in">
              <img :src="assetUrl(prod.image)" class="h-44 w-full object-cover transition hover:brightness-105" :alt="prod.name" />
            </button>
            <div v-else class="grid h-44 w-full place-items-center bg-bot-sage/20 text-6xl">🍰</div>
            <div class="p-5">
              <div class="min-w-0">
                <p class="truncate font-cormorant text-lg font-semibold text-bot-ink">{{ prod.name }}</p>
                <p class="truncate text-sm text-bot-leaf">{{ prod.desc }}</p>
              </div>
              <div class="mt-4 flex items-center gap-3">
                <div class="h-3 flex-1 overflow-hidden rounded-full bg-bot-sage/25">
                  <div class="h-full rounded-full bg-bot-leaf transition-all" :style="{ width: prod.ratings.goodRate + '%' }"></div>
                </div>
                <span class="shrink-0 font-cormorant text-sm font-semibold text-bot-terracotta">好评 {{ prod.ratings.goodRate }}%</span>
              </div>
              <p class="mt-1 text-xs text-bot-ink/55">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
              <p v-if="teaExtraText(prod)" class="mt-1 text-xs font-medium text-bot-leaf">📦 {{ teaExtraText(prod) }}</p>
              <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
                <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                  class="rounded-full py-2 text-sm font-medium transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  :class="lv.key === 'good' ? 'bg-bot-leaf text-bot-cream' : lv.key === 'ok' ? 'border border-bot-sage bg-bot-sage/15 text-bot-leaf' : 'border border-bot-terracotta text-bot-terracotta'">
                  {{ lv.emoji }} {{ lv.label }}
                </button>
              </div>
              <p v-else-if="votedProducts[prod.id]" class="mt-3 rounded-full bg-bot-leaf/15 py-2 text-center text-sm font-medium text-bot-leaf">🌿 已评</p>
              <p v-else class="mt-3 rounded-full bg-bot-sage/15 py-2 text-center text-sm text-bot-ink/55">评分已结束</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mb-12">
        <h2 class="flex items-center gap-2 font-cormorant text-3xl font-semibold italic text-bot-ink sm:text-4xl">
          <span class="text-2xl">🌾</span> 规则
        </h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="rounded-[24px] border border-bot-sage/50 bg-bot-cream/60 p-6 bot-card">
            <p class="flex items-center gap-2 font-cormorant text-xl font-semibold text-bot-leaf"><span>🌱</span> 抽奖规则</p>
            <p class="mt-3 whitespace-pre-line font-cormorant text-lg italic leading-relaxed text-bot-ink/80">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="rounded-[24px] border border-bot-sage/50 bg-bot-cream/60 p-6 bot-card">
            <p class="flex items-center gap-2 font-cormorant text-xl font-semibold text-bot-leaf"><span>🍃</span> 下午茶评分规则</p>
            <p class="mt-3 whitespace-pre-line font-cormorant text-lg italic leading-relaxed text-bot-ink/80">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <footer class="flex items-center justify-center gap-2 py-10 text-center font-cormorant text-sm italic tracking-wide text-bot-leaf/70">
        <span>🌿</span> {{ config.siteName }} · 第 {{ period.id }} 期 <span>🌿</span>
      </footer>
    </div>
  </div>
</template>

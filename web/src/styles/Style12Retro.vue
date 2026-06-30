<script setup>
/*
 * style12 · 复古 / 70 年代 Retro —— 与 style1 参考实现共用同一套数据契约。
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
import { ref, computed } from 'vue';
import { assetUrl } from '../api.js';
import { useLotteryForm, stepExplain, winnersByPrize, TEA_LEVELS, teaExtraText } from '../useLottery.js';

const props = defineProps({
  period: { type: Object, required: true },
  config: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
  submitState: { type: Object, default: () => ({ status: 'idle', message: '' }) },
  votedProducts: { type: Object, default: () => ({}) },
  ratingBusy: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['submit', 'rate']);

// 复古四色轮换：芥末黄 / 焦橙 / 牛油果绿 / 复古青
const ACCENTS = ['#E3A857', '#CB6843', '#6B8E23', '#2A7E78'];
const accent = (i) => ACCENTS[((i % ACCENTS.length) + ACCENTS.length) % ACCENTS.length];

const isDrawn = computed(() => props.period.status === 'drawn');
const lotteryOn = computed(() => props.period.lotteryEnabled);
const teaOn = computed(() => props.period.teaEnabled && props.period.tea?.products?.length);
const joined = computed(() => ['success', 'joined'].includes(props.submitState.status));
const showForm = computed(() => lotteryOn.value && !isDrawn.value && !joined.value);
const result = computed(() => props.period.result);
const prizeGroups = computed(() => (result.value ? winnersByPrize(result.value) : []));

const { name, number, validate } = useLotteryForm();
const localError = ref('');
function doSubmit() {
  localError.value = '';
  const r = validate();
  if (r.error) { localError.value = r.error; return; }
  emit('submit', { name: r.name, number: r.number });
}
const errorMsg = computed(() => localError.value || (props.submitState.status === 'error' ? props.submitState.message : ''));
function doRate(productId, level) { emit('rate', { productId, level }); }
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-retro-bg font-poppins text-retro-ink">
    <!-- 放射太阳光（头部背后慢转） -->
    <div aria-hidden="true" class="pointer-events-none fixed left-1/2 top-[-40vw] -z-10 h-[120vw] w-[120vw] -translate-x-1/2 rounded-full retro-rays animate-retro-rays opacity-[0.18]"></div>
    <div aria-hidden="true" class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-retro-bg/0 to-retro-bg"></div>

    <div class="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="py-10 text-center sm:py-14">
        <!-- 复古圆形期数徽章（双圈） -->
        <div class="mx-auto grid h-28 w-28 place-items-center rounded-full border-4 border-retro-brown bg-retro-orange text-retro-bg retro-shadow">
          <div class="grid h-[88%] w-[88%] place-items-center rounded-full border-2 border-dashed border-retro-bg/80">
            <div class="text-center leading-none">
              <p class="font-poppins text-[0.6rem] font-bold uppercase tracking-[0.2em]">PERIOD</p>
              <p class="font-righteous text-4xl">{{ period.id }}</p>
              <p class="font-poppins text-[0.6rem] font-bold uppercase tracking-[0.2em]">第 {{ period.id }} 期</p>
            </div>
          </div>
        </div>
        <p class="mt-5 font-poppins text-sm font-bold uppercase tracking-[0.25em] text-retro-brown">{{ config.departmentName }}</p>
        <h1 class="mt-3 font-righteous text-4xl uppercase leading-tight tracking-wide text-retro-ink sm:text-6xl">
          <span class="inline-block rounded-lg bg-retro-mustard px-3 py-1 text-retro-ink retro-shadow">{{ period.title }}</span>
        </h1>
        <p class="mt-5 font-poppins text-xs font-bold uppercase tracking-[0.25em] text-retro-brown">{{ config.siteName }}</p>
        <p class="mt-5">
          <span v-if="isDrawn" class="inline-block rounded-full border-2 border-retro-brown bg-retro-avocado px-5 py-2 font-righteous uppercase tracking-wide text-retro-bg retro-shadow">🏆 已开奖</span>
          <span v-else-if="lotteryOn" class="inline-block rounded-full border-2 border-retro-brown bg-retro-teal px-5 py-2 font-righteous uppercase tracking-wide text-retro-bg retro-shadow">👥 已有 {{ period.participantCount }} 人参与</span>
          <span v-else class="inline-block rounded-full border-2 border-retro-brown bg-retro-orange px-5 py-2 font-righteous uppercase tracking-wide text-retro-bg retro-shadow">🍰 下午茶评分进行中</span>
        </p>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-16">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-8 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="rounded-[24px] border-2 border-retro-brown bg-retro-panel p-8 retro-shadow sm:p-10">
              <h2 class="font-righteous text-3xl uppercase tracking-wide text-retro-orange">参与抽奖</h2>
              <div class="mt-2 h-1.5 w-24 rounded-full retro-stripes"></div>
              <p class="mt-4 font-poppins text-retro-ink/75">填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block font-righteous uppercase tracking-[0.2em] text-retro-teal">你的姓名</label>
                  <input v-model="name" type="text" maxlength="30" :placeholder="config.namePlaceholder || '例如：陈老板'"
                    class="w-full rounded-xl border-2 border-retro-brown bg-retro-bg px-5 py-4 text-lg font-semibold text-retro-ink placeholder-retro-brown/40 outline-none transition focus:border-retro-orange focus:ring-2 focus:ring-retro-orange/40" />
                </div>
                <div>
                  <label class="mb-2 block font-righteous uppercase tracking-[0.2em] text-retro-avocado">幸运数字 (1-9999)</label>
                  <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                    class="w-full rounded-xl border-2 border-retro-brown bg-retro-bg px-5 py-4 text-lg font-semibold text-retro-ink placeholder-retro-brown/40 outline-none transition focus:border-retro-orange focus:ring-2 focus:ring-retro-orange/40" />
                </div>
                <p v-if="errorMsg" class="rounded-xl border-2 border-retro-orange bg-retro-orange/15 px-5 py-3 font-semibold text-retro-orange">⚠ {{ errorMsg }}</p>
                <button :disabled="submitting" @click="doSubmit"
                  class="h-16 w-full rounded-full border-2 border-retro-brown bg-retro-orange px-10 font-righteous text-lg uppercase tracking-widest text-retro-bg retro-shadow transition active:translate-y-0.5 active:shadow-none disabled:opacity-50">
                  {{ submitting ? '提交中…' : '🚀 立即参与' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <h3 class="font-righteous text-2xl uppercase tracking-wide text-retro-avocado">奖品</h3>
            <div class="mt-2 h-1.5 w-20 rounded-full retro-stripes"></div>
            <div class="mt-5 space-y-4">
              <div v-for="(z, i) in period.prizes" :key="i" class="flex items-center gap-4 rounded-[24px] border-2 bg-retro-panel p-4 retro-shadow" :style="{ borderColor: accent(i) }">
                <div class="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-retro-brown">
                  <img v-if="z.image" :src="assetUrl(z.image)" class="h-full w-full object-cover" :alt="z.name" />
                  <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: accent(i) + '33' }">🎁</div>
                </div>
                <div class="min-w-0">
                  <p class="truncate font-righteous text-lg" :style="{ color: accent(i) }">{{ z.name }}</p>
                  <p class="font-poppins text-sm font-semibold text-retro-brown">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="rounded-[24px] border-2 border-retro-brown bg-retro-panel p-12 text-center retro-shadow">
          <p class="text-8xl">🎊</p>
          <h2 class="mt-6 font-righteous text-4xl uppercase tracking-wide text-retro-orange">提交成功！</h2>
          <div class="mx-auto mt-4 h-1.5 w-28 rounded-full retro-stripes"></div>
          <p class="mt-5 font-poppins text-lg text-retro-ink/80">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-3 inline-block rounded-full border-2 border-retro-brown bg-retro-mustard px-5 py-2 font-righteous uppercase tracking-wide text-retro-ink retro-shadow">当前共 {{ period.participantCount }} 人参与</p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-12">
          <div>
            <h2 class="text-center font-righteous text-4xl uppercase tracking-wide text-retro-orange sm:text-5xl">🏆 中奖名单</h2>
            <div class="mx-auto mt-3 h-2 w-40 rounded-full retro-stripes"></div>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="rounded-[24px] border-2 bg-retro-panel p-6 retro-shadow" :style="{ borderColor: accent(gi) }">
                <div class="flex items-center gap-4">
                  <!-- 复古奖牌圆徽 -->
                  <div class="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-retro-brown" :style="{ backgroundColor: accent(gi) }">
                    <div class="h-[78%] w-[78%] overflow-hidden rounded-full border-2 border-dashed border-retro-bg/80">
                      <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                      <div v-else class="grid h-full w-full place-items-center text-xl text-retro-bg">🎁</div>
                    </div>
                  </div>
                  <p class="font-righteous text-xl uppercase tracking-wide" :style="{ color: accent(gi) }">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="rounded-full border-2 border-retro-brown bg-retro-bg px-4 py-2 font-poppins font-bold text-retro-ink">
                    {{ w.name }} · <span class="font-righteous" :style="{ color: accent(gi) }">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-[24px] border-2 border-retro-brown bg-retro-panel p-6 retro-shadow sm:p-10">
            <h2 class="font-righteous text-3xl uppercase tracking-wide text-retro-teal">🧮 开奖算法推导</h2>
            <div class="mt-2 h-1.5 w-28 rounded-full retro-stripes"></div>
            <p class="mt-4 font-poppins text-retro-ink/75">所有数字之和 = <b class="text-retro-orange">{{ result.totalSum }}</b>，共 <b class="text-retro-orange">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si" class="rounded-[24px] border-2 bg-retro-bg p-5 retro-shadow sm:p-6" :style="{ borderColor: accent(si) }">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full border-2 border-retro-brown px-4 py-1.5 font-righteous uppercase tracking-wide text-retro-bg" :style="{ backgroundColor: accent(si) }">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-righteous text-lg text-retro-teal">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei" class="rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition"
                    :class="ei === s.remainder ? 'scale-110 text-retro-bg' : 'text-retro-ink/70'"
                    :style="ei === s.remainder ? { backgroundColor: accent(si), borderColor: '#5A3E2B' } : { borderColor: 'rgba(90,62,43,.35)' }">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 font-poppins leading-relaxed text-retro-ink/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="font-righteous text-2xl uppercase tracking-wide text-retro-avocado">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            <div class="mt-2 h-1.5 w-28 rounded-full retro-stripes"></div>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-center justify-between rounded-2xl border-2 bg-retro-panel px-4 py-3" :style="{ borderColor: accent(ei) }">
                <span class="truncate font-poppins font-bold text-retro-ink">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-righteous" :style="{ color: accent(ei) }">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-16">
        <h2 class="font-righteous text-3xl uppercase tracking-wide text-retro-orange sm:text-4xl">🍰 下午茶评分</h2>
        <div class="mt-2 h-2 w-36 rounded-full retro-stripes"></div>
        <p class="mt-4 font-poppins text-retro-ink/75">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="rounded-[24px] border-2 bg-retro-panel p-5 retro-shadow" :style="{ borderColor: accent(pi) }">
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-retro-brown">
                <img v-if="prod.image" :src="assetUrl(prod.image)" class="h-full w-full object-cover" :alt="prod.name" />
                <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: accent(pi) + '33' }">🍰</div>
              </div>
              <div class="min-w-0">
                <p class="truncate font-righteous text-lg" :style="{ color: accent(pi) }">{{ prod.name }}</p>
                <p class="truncate font-poppins text-sm text-retro-brown">{{ prod.desc }}</p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-3.5 flex-1 overflow-hidden rounded-full border-2 border-retro-brown bg-retro-bg">
                <div class="h-full rounded-full bg-retro-orange" :style="{ width: prod.ratings.goodRate + '%' }"></div>
              </div>
              <span class="shrink-0 font-righteous text-sm text-retro-orange">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-1 font-poppins text-xs text-retro-brown/80">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 font-poppins text-xs font-semibold text-retro-teal">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="rounded-full border-2 border-retro-brown py-2 font-righteous text-sm uppercase tracking-wide transition active:translate-y-0.5 disabled:opacity-50"
                :class="lv.key === 'good' ? 'bg-retro-avocado text-retro-bg' : lv.key === 'ok' ? 'bg-retro-teal text-retro-bg' : 'bg-retro-bg text-retro-orange'">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-3 rounded-full border-2 border-retro-brown bg-retro-avocado py-2 text-center font-righteous text-sm uppercase tracking-wide text-retro-bg">★ 已评</p>
            <p v-else class="mt-3 rounded-full border-2 border-retro-brown/40 bg-retro-bg py-2 text-center font-poppins text-sm text-retro-brown/70">评分已结束</p>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="lotteryOn || teaOn" class="mb-12">
        <h2 class="font-righteous text-3xl uppercase tracking-wide text-retro-orange sm:text-4xl">📜 规则</h2>
        <div class="mt-2 h-2 w-28 rounded-full retro-stripes"></div>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-if="lotteryOn" class="rounded-[24px] border-2 border-dashed border-retro-orange bg-retro-panel p-6 retro-shadow">
            <p class="font-righteous text-lg uppercase tracking-wide text-retro-orange">◆ 抽奖规则</p>
            <p class="mt-2 whitespace-pre-line font-poppins leading-relaxed text-retro-ink/80">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="teaOn" class="rounded-[24px] border-2 border-dashed border-retro-teal bg-retro-panel p-6 retro-shadow">
            <p class="font-righteous text-lg uppercase tracking-wide text-retro-teal">● 下午茶评分规则</p>
            <p class="mt-2 whitespace-pre-line font-poppins leading-relaxed text-retro-ink/80">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <!-- 底部复古四色横带 -->
      <div aria-hidden="true" class="mb-6 h-3 w-full rounded-full retro-stripes"></div>
      <footer class="py-6 text-center font-righteous uppercase tracking-[0.25em] text-retro-brown">{{ config.siteName }} · 第 {{ period.id }} 期</footer>
    </div>
  </div>
</template>

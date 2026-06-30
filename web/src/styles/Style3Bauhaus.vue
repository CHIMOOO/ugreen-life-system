<script setup>
/*
 * style3 · 包豪斯 / Bauhaus —— 构成主义、几何纯粹、原色拼贴、硬投影。
 *
 * 数据契约与 style1（参考实现）完全一致：
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
 * 同样渲染四块：① 头部 ② 抽奖 ③ 下午茶 ④ 规则。
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

// 三原色循环——红、蓝、黄，包豪斯的全部色谱。
const PRIMARIES = ['#D02020', '#1040C0', '#F0C020'];
const primary = (i) => PRIMARIES[((i % PRIMARIES.length) + PRIMARIES.length) % PRIMARIES.length];

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
  <div class="relative min-h-screen overflow-hidden bg-bau-bg font-outfit text-bau-ink">
    <!-- 背景：点阵 + 大块几何构成（构成主义） -->
    <div class="pointer-events-none fixed inset-0 -z-10 bau-dotgrid opacity-[0.07]"></div>
    <div aria-hidden="true" class="pointer-events-none fixed -left-24 -top-24 -z-10 h-80 w-80 rounded-full border-4 border-bau-ink bg-bau-red/15"></div>
    <div aria-hidden="true" class="pointer-events-none fixed -right-28 top-1/3 -z-10 h-72 w-72 rotate-12 border-4 border-bau-ink bg-bau-blue/15"></div>
    <div aria-hidden="true" class="pointer-events-none fixed -bottom-24 left-1/4 -z-10 h-0 w-0 border-x-[120px] border-b-[200px] border-x-transparent border-b-bau-yellow/20"></div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <!-- ① 头部 -->
      <header class="border-4 border-bau-ink bg-white shadow-bau-lg">
        <div class="flex flex-col gap-6 p-6 sm:flex-row sm:items-stretch sm:gap-0 sm:p-0">
          <!-- 左：几何 logo 三色块 -->
          <div class="flex shrink-0 items-center justify-center gap-3 border-bau-ink bg-bau-yellow p-6 sm:border-r-4 sm:p-8">
            <span class="h-7 w-7 rounded-full border-2 border-bau-ink bg-bau-red"></span>
            <span class="h-7 w-7 rounded-none border-2 border-bau-ink bg-bau-blue"></span>
            <span class="h-0 w-0 border-x-[14px] border-b-[24px] border-x-transparent border-b-bau-ink"></span>
          </div>
          <!-- 右：标题 -->
          <div class="flex flex-1 flex-col justify-center p-2 sm:p-8">
            <p class="text-sm font-bold uppercase tracking-widest text-bau-blue">{{ config.departmentName }} · 第 {{ period.id }} 期</p>
            <h1 class="mt-2 text-4xl font-black uppercase leading-[0.9] tracking-tighter sm:text-6xl lg:text-7xl">{{ period.title }}</h1>
            <p class="mt-3 text-base font-bold uppercase tracking-widest text-bau-ink/60">{{ config.siteName }}</p>
            <div class="mt-5">
              <span v-if="isDrawn" class="inline-block border-2 border-bau-ink bg-bau-red px-4 py-2 text-sm font-black uppercase tracking-widest text-white shadow-bau-sm">● 已开奖</span>
              <span v-else-if="lotteryOn" class="inline-block border-2 border-bau-ink bg-bau-blue px-4 py-2 text-sm font-black uppercase tracking-widest text-white shadow-bau-sm">● 进行中 · {{ period.participantCount }} 人参与</span>
              <span v-else class="inline-block border-2 border-bau-ink bg-bau-yellow px-4 py-2 text-sm font-black uppercase tracking-widest text-bau-ink shadow-bau-sm">● 下午茶评分进行中</span>
            </div>
          </div>
        </div>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mt-12">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-8 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="relative border-4 border-bau-ink bg-white p-6 shadow-bau-lg sm:p-10">
              <span aria-hidden="true" class="absolute -right-3 -top-3 h-8 w-8 rounded-full border-2 border-bau-ink bg-bau-red"></span>
              <div class="flex items-center gap-3">
                <span class="h-8 w-8 rounded-none border-2 border-bau-ink bg-bau-blue"></span>
                <h2 class="text-3xl font-black uppercase tracking-tight">参与抽奖</h2>
              </div>
              <p class="mt-3 font-medium leading-relaxed text-bau-ink/70">填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block text-sm font-bold uppercase tracking-widest text-bau-blue">你的姓名</label>
                  <input v-model="name" type="text" maxlength="30" :placeholder="config.namePlaceholder || '例如：陈老板'"
                    class="w-full rounded-none border-4 border-bau-ink bg-bau-bg px-5 py-4 text-lg font-bold text-bau-ink placeholder-bau-ink/30 outline-none transition focus:bg-white focus:shadow-bau-sm" />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-bold uppercase tracking-widest text-bau-red">幸运数字 (1-9999)</label>
                  <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                    class="w-full rounded-none border-4 border-bau-ink bg-bau-bg px-5 py-4 text-lg font-bold text-bau-ink placeholder-bau-ink/30 outline-none transition focus:bg-white focus:shadow-bau-sm" />
                </div>
                <p v-if="errorMsg" class="flex items-center gap-2 border-4 border-bau-ink bg-bau-red px-5 py-3 font-bold text-white shadow-bau-sm">▲ {{ errorMsg }}</p>
                <button :disabled="submitting" @click="doSubmit"
                  class="w-full rounded-none border-4 border-bau-ink bg-bau-red px-10 py-5 text-lg font-black uppercase tracking-widest text-white shadow-bau-md transition-all duration-200 ease-out hover:-translate-y-1 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50">
                  {{ submitting ? '提交中…' : '立即参与 ▶' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <div class="flex items-center gap-3">
              <span class="h-7 w-7 rounded-full border-2 border-bau-ink bg-bau-yellow"></span>
              <h3 class="text-2xl font-black uppercase tracking-tight">奖品</h3>
            </div>
            <div class="mt-5 space-y-5">
              <div v-for="(z, i) in period.prizes" :key="i"
                class="flex items-center gap-4 border-4 border-bau-ink bg-white p-4 shadow-bau-sm transition-transform duration-200 ease-out hover:-translate-y-1">
                <div class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border-2 border-bau-ink" :style="{ backgroundColor: primary(i) }">
                  <img v-if="z.image" :src="assetUrl(z.image)" class="h-full w-full object-cover" :alt="z.name" />
                  <span v-else class="text-2xl">🎁</span>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-lg font-black uppercase tracking-tight">{{ z.name }}</p>
                  <p class="text-sm font-bold uppercase tracking-widest text-bau-ink/55">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="relative border-4 border-bau-ink bg-bau-blue p-10 text-center text-white shadow-bau-lg sm:p-14">
          <span aria-hidden="true" class="absolute left-6 top-6 h-12 w-12 rounded-full border-4 border-white/70"></span>
          <span aria-hidden="true" class="absolute bottom-6 right-6 h-12 w-12 rotate-45 border-4 border-white/70"></span>
          <div class="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-bau-yellow text-4xl font-black text-bau-ink">✓</div>
          <h2 class="mt-6 text-4xl font-black uppercase tracking-tight">提交成功</h2>
          <p class="mt-4 text-lg font-medium leading-relaxed text-white/90">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-4 inline-block border-2 border-white bg-bau-red px-4 py-2 text-sm font-black uppercase tracking-widest">当前共 {{ period.participantCount }} 人参与</p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-12">
          <!-- (a) 中奖名单 -->
          <div>
            <div class="flex items-center gap-4 border-b-4 border-bau-ink pb-4">
              <span class="h-8 w-8 rounded-full border-2 border-bau-ink bg-bau-red"></span>
              <h2 class="text-3xl font-black uppercase tracking-tight sm:text-5xl">中奖名单</h2>
            </div>
            <div class="mt-8 grid gap-6 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="relative border-4 border-bau-ink bg-white p-6 shadow-bau-md transition-transform duration-200 ease-out hover:-translate-y-1">
                <span aria-hidden="true" class="absolute -right-3 -top-3 h-7 w-7 border-2 border-bau-ink" :class="gi % 2 ? 'rounded-full' : 'rounded-none'" :style="{ backgroundColor: primary(gi) }"></span>
                <div class="flex items-center gap-4">
                  <div class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border-2 border-bau-ink" :style="{ backgroundColor: primary(gi) }">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <span v-else class="text-2xl">🎁</span>
                  </div>
                  <p class="text-xl font-black uppercase tracking-tight">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="border-2 border-bau-ink bg-bau-bg px-3 py-1.5 text-sm font-bold">
                    {{ w.name }} · <span class="font-black text-bau-red">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- (b) 开奖算法推导 -->
          <div class="border-4 border-bau-ink bg-bau-yellow p-6 shadow-bau-lg sm:p-10">
            <div class="flex items-center gap-4">
              <span class="h-8 w-8 rounded-none border-2 border-bau-ink bg-bau-ink"></span>
              <h2 class="text-3xl font-black uppercase tracking-tight">开奖算法推导</h2>
            </div>
            <p class="mt-3 font-medium leading-relaxed text-bau-ink/80">所有数字之和 = <b>{{ result.totalSum }}</b>，共 <b>{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si" class="border-4 border-bau-ink bg-white p-5 shadow-bau-sm sm:p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="border-2 border-bau-ink px-4 py-1.5 text-sm font-black uppercase tracking-widest text-white" :style="{ backgroundColor: primary(si) }">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-mono text-lg font-black text-bau-blue">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei"
                    class="border-2 border-bau-ink px-3 py-1.5 text-sm font-bold transition"
                    :class="ei === s.remainder ? 'bg-bau-red text-white shadow-bau-sm' : 'bg-white text-bau-ink/70'">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 font-medium leading-relaxed text-bau-ink/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <!-- (c) 全部参与者 -->
          <div>
            <div class="flex items-center gap-4 border-b-4 border-bau-ink pb-4">
              <span class="h-8 w-8 rounded-full border-2 border-bau-ink bg-bau-blue"></span>
              <h3 class="text-2xl font-black uppercase tracking-tight">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            </div>
            <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-center justify-between border-2 border-bau-ink bg-white px-4 py-3">
                <span class="truncate font-bold">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-mono font-black" :style="{ color: primary(ei) }">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mt-12 border-4 border-bau-ink bg-bau-red p-6 text-white shadow-bau-lg sm:p-10">
        <div class="flex items-center gap-4">
          <span class="h-9 w-9 rounded-full border-2 border-white bg-bau-yellow"></span>
          <h2 class="text-3xl font-black uppercase tracking-tight sm:text-4xl">下午茶评分</h2>
        </div>
        <p class="mt-3 font-medium leading-relaxed text-white/85">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div class="mt-8 grid gap-6 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="border-4 border-bau-ink bg-white p-5 text-bau-ink shadow-bau-md transition-transform duration-200 ease-out hover:-translate-y-1">
            <div class="flex items-center gap-4">
              <div class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border-2 border-bau-ink" :style="{ backgroundColor: primary(pi) }">
                <img v-if="prod.image" :src="assetUrl(prod.image)" class="h-full w-full object-cover" :alt="prod.name" />
                <span v-else class="text-2xl">🍰</span>
              </div>
              <div class="min-w-0">
                <p class="truncate text-lg font-black uppercase tracking-tight">{{ prod.name }}</p>
                <p class="truncate text-sm font-medium text-bau-ink/55">{{ prod.desc }}</p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-4 flex-1 overflow-hidden border-2 border-bau-ink bg-bau-bg">
                <div class="h-full bg-bau-blue" :style="{ width: prod.ratings.goodRate + '%' }"></div>
              </div>
              <span class="shrink-0 font-mono text-sm font-black text-bau-blue">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-2 text-xs font-bold uppercase tracking-wide text-bau-ink/50">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 text-xs font-bold text-bau-blue">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-4 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="rounded-none border-2 border-bau-ink bg-white py-2.5 text-sm font-bold uppercase tracking-wide shadow-bau-sm transition-all duration-200 ease-out hover:bg-bau-yellow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-4 border-2 border-bau-ink bg-bau-blue py-2.5 text-center text-sm font-black uppercase tracking-widest text-white">✓ 已评分</p>
            <p v-else class="mt-4 border-2 border-bau-ink bg-bau-muted py-2.5 text-center text-sm font-bold uppercase tracking-widest text-bau-ink/60">评分已结束</p>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mt-12">
        <div class="flex items-center gap-4 border-b-4 border-bau-ink pb-4">
          <span class="h-8 w-8 rotate-45 border-2 border-bau-ink bg-bau-yellow"></span>
          <h2 class="text-3xl font-black uppercase tracking-tight sm:text-4xl">规则</h2>
        </div>
        <div class="mt-8 grid gap-6 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="border-4 border-bau-ink bg-white p-6 shadow-bau-md">
            <p class="inline-block border-2 border-bau-ink bg-bau-red px-3 py-1 text-sm font-black uppercase tracking-widest text-white">抽奖规则</p>
            <p class="mt-4 whitespace-pre-line font-medium leading-relaxed text-bau-ink/80">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="border-4 border-bau-ink bg-white p-6 shadow-bau-md">
            <p class="inline-block border-2 border-bau-ink bg-bau-blue px-3 py-1 text-sm font-black uppercase tracking-widest text-white">下午茶评分规则</p>
            <p class="mt-4 whitespace-pre-line font-medium leading-relaxed text-bau-ink/80">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <footer class="mt-12 flex items-center justify-center gap-3 border-t-4 border-bau-ink py-8 text-sm font-black uppercase tracking-widest text-bau-ink/50">
        <span class="h-4 w-4 rounded-full bg-bau-red"></span>
        <span class="h-4 w-4 bg-bau-blue"></span>
        <span class="h-4 w-4 rotate-45 bg-bau-yellow"></span>
        {{ config.siteName }} · 第 {{ period.id }} 期
      </footer>
    </div>
  </div>
</template>

<script setup>
/*
 * style8 · 趣味几何 / Playful Geometric —— 与 style1 共享完全一致的数据契约。
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

// 5 个糖果色轮换
const CANDY = ['#FF6B6B', '#2FB5AC', '#FFC93C', '#5B8DEF', '#9B5DE5'];
const candy = (i) => CANDY[((i % CANDY.length) + CANDY.length) % CANDY.length];

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
  <div class="relative min-h-screen overflow-hidden bg-geo-bg font-poppins text-geo-ink">
    <!-- 漂浮几何装饰 -->
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute left-[6%] top-[10%] h-24 w-24 rounded-full bg-geo-coral/70 geo-shadow animate-geo-pop"></div>
      <div class="absolute right-[8%] top-[16%] h-20 w-20 rounded-[28px] bg-geo-blue/70 geo-shadow animate-geo-spin"></div>
      <div class="absolute left-[12%] bottom-[14%] h-0 w-0 clip-triangle border-geo-yellow animate-geo-pop"
        style="border-left:42px solid transparent;border-right:42px solid transparent;border-bottom:72px solid #FFC93C;"></div>
      <div class="absolute right-[14%] bottom-[20%] h-28 w-28 rounded-full bg-geo-teal/60 geo-shadow animate-geo-spin"></div>
      <div class="absolute left-1/2 top-[44%] h-16 w-16 -translate-x-1/2 rounded-[20px] bg-geo-purple/50 animate-geo-pop"></div>
      <div class="absolute right-[40%] top-[6%] select-none text-5xl font-bold text-geo-yellow animate-geo-pop">＋</div>
      <div class="absolute left-[34%] bottom-[8%] select-none text-5xl font-bold text-geo-coral animate-geo-pop">＋</div>
    </div>

    <div class="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="py-10 text-center sm:py-14">
        <div class="flex items-center justify-center gap-4">
          <div class="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[3px] border-geo-ink bg-geo-yellow geo-shadow animate-geo-spin">
            <div class="text-center leading-none">
              <span class="block text-[10px] font-bold uppercase tracking-widest text-geo-ink">第</span>
              <span class="block font-fredoka text-2xl font-bold text-geo-ink">{{ period.id }}</span>
              <span class="block text-[10px] font-bold uppercase tracking-widest text-geo-ink">期</span>
            </div>
          </div>
          <span class="inline-block rounded-full border-[3px] border-geo-ink bg-geo-teal px-5 py-2 font-fredoka text-sm font-bold text-white geo-shadow">{{ config.departmentName }}</span>
        </div>
        <h1 class="mt-6 font-fredoka text-5xl font-bold leading-tight sm:text-7xl">
          <span class="inline-block -rotate-2 rounded-2xl bg-geo-yellow px-3 py-1">{{ period.title }}</span>
        </h1>
        <p class="mt-5">
          <span class="inline-block rounded-full border-[3px] border-geo-ink bg-white px-5 py-2 font-fredoka text-sm font-bold geo-shadow">{{ config.siteName }}</span>
        </p>
        <p class="mt-5">
          <span v-if="isDrawn" class="inline-block rounded-full border-[3px] border-geo-ink bg-geo-coral px-6 py-2.5 font-fredoka text-base font-bold text-white geo-shadow">🏆 已开奖</span>
          <span v-else-if="lotteryOn" class="inline-block rounded-full border-[3px] border-geo-ink bg-geo-blue px-6 py-2.5 font-fredoka text-base font-bold text-white geo-shadow">👥 已有 {{ period.participantCount }} 人参与</span>
          <span v-else class="inline-block rounded-full border-[3px] border-geo-ink bg-geo-purple px-6 py-2.5 font-fredoka text-base font-bold text-white geo-shadow">🍰 下午茶评分进行中</span>
        </p>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-16">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-8 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="relative rounded-[28px] border-[3px] border-geo-ink bg-white p-8 geo-shadow transition hover:-translate-y-1 sm:p-10">
              <span class="absolute -left-3 -top-3 h-9 w-9 rounded-full border-[3px] border-geo-ink bg-geo-coral"></span>
              <h2 class="font-fredoka text-3xl font-bold text-geo-ink">参与抽奖</h2>
              <p class="mt-2 text-geo-ink/60">填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block font-fredoka text-sm font-bold uppercase tracking-wide text-geo-teal">你的姓名</label>
                  <input v-model="name" type="text" maxlength="30" :placeholder="config.namePlaceholder || '例如：陈老板'"
                    class="w-full rounded-2xl border-[3px] border-geo-ink bg-geo-bg px-5 py-4 text-lg font-semibold text-geo-ink placeholder-geo-ink/30 outline-none transition focus:border-geo-teal focus:bg-white" />
                </div>
                <div>
                  <label class="mb-2 block font-fredoka text-sm font-bold uppercase tracking-wide text-geo-blue">幸运数字 (1-9999)</label>
                  <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                    class="w-full rounded-2xl border-[3px] border-geo-ink bg-geo-bg px-5 py-4 text-lg font-semibold text-geo-ink placeholder-geo-ink/30 outline-none transition focus:border-geo-blue focus:bg-white" />
                </div>
                <p v-if="errorMsg" class="rounded-2xl border-[3px] border-geo-ink bg-geo-coral px-5 py-3 font-fredoka font-bold text-white">⚠ {{ errorMsg }}</p>
                <button :disabled="submitting" @click="doSubmit"
                  class="h-16 w-full rounded-full border-[3px] border-geo-ink bg-geo-coral px-10 font-fredoka text-lg font-bold uppercase tracking-wide text-white geo-shadow transition-all duration-150 hover:-translate-y-0.5 active:translate-y-1 active:shadow-none disabled:opacity-50">
                  {{ submitting ? '提交中…' : '🚀 立即参与' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <h3 class="font-fredoka text-2xl font-bold text-geo-purple">🎁 奖品</h3>
            <div class="mt-5 space-y-4">
              <div v-for="(z, i) in period.prizes" :key="i"
                class="relative flex items-center gap-4 rounded-[28px] border-[3px] border-geo-ink bg-white p-4 geo-shadow transition hover:-translate-y-1">
                <span class="absolute -left-2.5 -top-2.5 h-7 w-7 rounded-[8px] border-[3px] border-geo-ink" :style="{ backgroundColor: candy(i) }"></span>
                <div class="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-[3px] border-geo-ink">
                  <img v-if="z.image" :src="assetUrl(z.image)" class="h-full w-full object-cover" :alt="z.name" />
                  <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: candy(i) + '33' }">🎁</div>
                </div>
                <div class="min-w-0">
                  <p class="truncate font-fredoka text-lg font-bold" :style="{ color: candy(i) }">{{ z.name }}</p>
                  <p class="text-sm font-semibold text-geo-ink/50">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="relative rounded-[28px] border-[3px] border-geo-ink bg-white p-12 text-center geo-shadow-lg">
          <span class="absolute -left-4 -top-4 h-12 w-12 rounded-full border-[3px] border-geo-ink bg-geo-teal animate-geo-pop"></span>
          <span class="absolute -right-4 -top-4 h-10 w-10 rounded-[10px] border-[3px] border-geo-ink bg-geo-yellow animate-geo-spin"></span>
          <p class="text-8xl animate-geo-pop">🎊</p>
          <h2 class="mt-6 font-fredoka text-4xl font-bold text-geo-ink">提交成功！</h2>
          <p class="mt-4 text-lg text-geo-ink/60">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-4">
            <span class="inline-block rounded-full border-[3px] border-geo-ink bg-geo-blue px-6 py-2 font-fredoka font-bold text-white geo-shadow">当前共 {{ period.participantCount }} 人参与</span>
          </p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-12">
          <div>
            <h2 class="text-center font-fredoka text-4xl font-bold sm:text-5xl">
              <span class="inline-block -rotate-1 rounded-2xl bg-geo-coral px-4 py-1 text-white">🏆 中奖名单</span>
            </h2>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi"
                class="relative rounded-[28px] border-[3px] border-geo-ink bg-white p-6 geo-shadow transition hover:-translate-y-1">
                <span class="absolute -left-3 -top-3 h-8 w-8 rounded-full border-[3px] border-geo-ink" :style="{ backgroundColor: candy(gi) }"></span>
                <div class="flex items-center gap-4">
                  <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-[3px] border-geo-ink">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: candy(gi) + '33' }">🎁</div>
                  </div>
                  <p class="font-fredoka text-xl font-bold" :style="{ color: candy(gi) }">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi"
                    class="rounded-full border-[3px] border-geo-ink px-4 py-1.5 font-fredoka text-sm font-bold text-white"
                    :style="{ backgroundColor: candy(gi + 1) }">
                    {{ w.name }} · {{ w.number }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="relative rounded-[28px] border-[3px] border-geo-ink bg-white p-6 geo-shadow-lg sm:p-10">
            <span class="absolute -left-4 -top-4 h-12 w-12 rounded-[12px] border-[3px] border-geo-ink bg-geo-yellow animate-geo-spin"></span>
            <h2 class="font-fredoka text-3xl font-bold text-geo-ink">🧮 开奖算法推导</h2>
            <p class="mt-2 text-geo-ink/60">所有数字之和 = <b class="text-geo-coral">{{ result.totalSum }}</b>，共 <b class="text-geo-coral">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si"
                class="rounded-[24px] border-[3px] border-geo-ink p-5 sm:p-6"
                :style="{ backgroundColor: candy(si) + '1A' }">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full border-[3px] border-geo-ink px-4 py-1.5 font-fredoka font-bold text-white" :style="{ backgroundColor: candy(si) }">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-fredoka text-xl font-bold text-geo-ink">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei"
                    class="rounded-full border-[3px] border-geo-ink px-3 py-1.5 text-sm font-bold transition"
                    :class="ei === s.remainder ? 'scale-110 text-white' : 'bg-white text-geo-ink/70'"
                    :style="ei === s.remainder ? { backgroundColor: candy(si) } : {}">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 leading-relaxed text-geo-ink/80">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="font-fredoka text-2xl font-bold text-geo-purple">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei"
                class="flex items-center justify-between rounded-full border-[3px] border-geo-ink bg-white px-4 py-2.5">
                <span class="truncate font-semibold text-geo-ink">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-fredoka font-bold" :style="{ color: candy(ei) }">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-16">
        <h2 class="font-fredoka text-3xl font-bold sm:text-4xl">
          <span class="inline-block -rotate-1 rounded-2xl bg-geo-teal px-4 py-1 text-white">🍰 下午茶评分</span>
        </h2>
        <p class="mt-3 text-geo-ink/60">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id"
            class="relative rounded-[28px] border-[3px] border-geo-ink bg-white p-5 geo-shadow transition hover:-translate-y-1">
            <span class="absolute -left-3 -top-3 h-8 w-8 rounded-full border-[3px] border-geo-ink" :style="{ backgroundColor: candy(pi) }"></span>
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-[3px] border-geo-ink">
                <img v-if="prod.image" :src="assetUrl(prod.image)" class="h-full w-full object-cover" :alt="prod.name" />
                <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: candy(pi) + '33' }">🍰</div>
              </div>
              <div class="min-w-0">
                <p class="truncate font-fredoka text-lg font-bold" :style="{ color: candy(pi) }">{{ prod.name }}</p>
                <p class="truncate text-sm text-geo-ink/50">{{ prod.desc }}</p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-4 flex-1 overflow-hidden rounded-full border-[3px] border-geo-ink bg-geo-bg">
                <div class="h-full rounded-full" :style="{ width: prod.ratings.goodRate + '%', backgroundColor: candy(pi + 1) }"></div>
              </div>
              <span class="shrink-0 font-fredoka text-lg font-bold" :style="{ color: candy(pi + 1) }">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-1.5 text-xs font-semibold text-geo-ink/40">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 text-xs font-bold text-geo-purple">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="rounded-full border-[3px] border-geo-ink py-2 font-fredoka text-sm font-bold transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50"
                :class="lv.key === 'bad' ? 'bg-white text-geo-coral' : lv.key === 'ok' ? 'bg-white text-geo-blue' : 'bg-geo-teal text-white'">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-3 rounded-full border-[3px] border-geo-ink bg-geo-teal py-2 text-center font-fredoka text-sm font-bold text-white">✓ 已评分</p>
            <p v-else class="mt-3 rounded-full border-[3px] border-geo-ink bg-geo-bg py-2 text-center text-sm font-semibold text-geo-ink/50">评分已结束</p>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mb-12">
        <h2 class="font-fredoka text-3xl font-bold sm:text-4xl">
          <span class="inline-block -rotate-1 rounded-2xl bg-geo-yellow px-4 py-1">📜 规则</span>
        </h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="relative rounded-[28px] border-[3px] border-geo-ink bg-white p-6 geo-shadow">
            <span class="absolute -left-3 -top-3 grid h-10 w-10 place-items-center rounded-full border-[3px] border-geo-ink bg-geo-coral text-lg">🎲</span>
            <p class="font-fredoka text-lg font-bold text-geo-coral">抽奖规则</p>
            <p class="mt-2 whitespace-pre-line leading-relaxed text-geo-ink/70">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="relative rounded-[28px] border-[3px] border-geo-ink bg-white p-6 geo-shadow">
            <span class="absolute -left-3 -top-3 grid h-10 w-10 place-items-center rounded-full border-[3px] border-geo-ink bg-geo-teal text-lg">🍵</span>
            <p class="font-fredoka text-lg font-bold text-geo-teal">下午茶评分规则</p>
            <p class="mt-2 whitespace-pre-line leading-relaxed text-geo-ink/70">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <footer class="py-10 text-center">
        <span class="inline-block rounded-full border-[3px] border-geo-ink bg-white px-6 py-2 font-fredoka text-sm font-bold text-geo-ink/60 geo-shadow">{{ config.siteName }} · 第 {{ period.id }} 期</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
/*
 * style11 · 新拟态 / Neumorphism —— 柔和单色、同底色挤出/凹陷的双向柔影。
 *
 * 数据契约与 Style1Maximalism.vue 完全一致：
 *   Props:
 *     period       期数对象（见后端 serializePeriod）
 *     config       系统配置 { siteName, departmentName, rulesLottery, rulesTea }
 *     submitting   抽奖提交中
 *     submitState  { status: idle|success|joined|error, message }
 *     votedProducts{ [productId]: true }  本浏览器已评分的商品
 *     ratingBusy   { [productId]: true }  评分请求进行中
 *   Emits:
 *     submit({ name, number })   提交抽奖
 *     rate({ productId, level }) 下午茶评分（level: bad|ok|good）
 *
 * 渲染四块：① 头部 ② 抽奖 ③ 下午茶 ④ 规则。
 */
import { ref, computed } from 'vue';
import { assetUrl } from '../api.js';
import { useLotteryForm, stepExplain, winnersByPrize, TEA_LEVELS, teaExtraText } from '../useLottery.js';
import DiceButton from '../components/DiceButton.vue';
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
  <div class="min-h-screen bg-neu-bg font-poppins text-neu-fg">
    <div class="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="neu-flat mb-12 rounded-[36px] px-6 py-12 text-center sm:px-12 sm:py-16">
        <div class="mb-6 inline-grid place-items-center">
          <div class="neu-raised grid h-20 w-20 place-items-center rounded-full">
            <span class="text-xs font-medium uppercase tracking-widest text-neu-muted">第</span>
            <span class="-mt-1 text-2xl font-semibold text-neu-accent">{{ period.id }}</span>
            <span class="-mt-1 text-xs font-medium uppercase tracking-widest text-neu-muted">期</span>
          </div>
        </div>
        <p class="text-sm font-medium uppercase tracking-widest text-neu-muted">{{ config.departmentName }}</p>
        <h1 class="mt-3 text-3xl font-semibold leading-tight text-neu-fg sm:text-5xl">{{ period.title }}</h1>
        <p class="mt-4 text-xs font-medium uppercase tracking-[0.3em] text-neu-muted">{{ config.siteName }}</p>
        <div class="mt-8 flex justify-center">
          <span v-if="isDrawn" class="neu-pressed inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-neu-accent">
            🏆 已开奖
          </span>
          <span v-else-if="lotteryOn" class="neu-pressed inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-neu-fg">
            👥 进行中 · 已有 <b class="font-semibold text-neu-accent">{{ period.participantCount }}</b> 人参与
          </span>
          <span v-else class="neu-pressed inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-neu-fg">
            🍰 下午茶评分进行中
          </span>
        </div>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-16">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-8 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="neu-raised rounded-[28px] p-8 sm:p-10">
              <h2 class="text-2xl font-semibold text-neu-fg">参与抽奖</h2>
              <p class="mt-2 text-sm text-neu-muted">填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-3 block text-xs font-semibold uppercase tracking-widest text-neu-muted">你的姓名</label>
                  <input v-model="name" @input="emit('name-input', name)" type="text" maxlength="30" :placeholder="config.namePlaceholder || '例如：陈老板'"
                    class="neu-pressed w-full rounded-2xl border-0 bg-neu-bg px-6 py-4 text-base font-medium text-neu-fg placeholder-neu-muted/60 outline-none transition focus:text-neu-accent" />
                </div>
                <div>
                  <label class="mb-3 block text-xs font-semibold uppercase tracking-widest text-neu-muted">幸运数字 (1-9999)</label>
                  <div class="flex items-center gap-3">
                    <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                      class="neu-pressed min-w-0 flex-1 rounded-2xl border-0 bg-neu-bg px-6 py-4 text-base font-medium text-neu-fg placeholder-neu-muted/60 outline-none transition focus:text-neu-accent" />
                    <DiceButton @roll="(n) => (number = n)" class="shrink-0 text-neu-accent" />
                  </div>
                </div>
                <p v-if="errorMsg" class="neu-pressed rounded-2xl px-5 py-3 text-sm font-medium text-rose-400">⚠ {{ errorMsg }}</p>
                <div v-if="nameStatus.exists" class="neu-pressed rounded-2xl px-5 py-4">
                  <p class="text-sm leading-relaxed text-neu-fg/80">该姓名已提交过本期抽奖。重复提交会导致抽奖无效，可先撤销再重新参与。<span class="text-neu-muted">（为保密不显示号码）</span></p>
                  <button @click="emit('cancel', name)" class="neu-raised-sm mt-3 rounded-full px-5 py-2 text-xs font-semibold text-neu-accent transition-all duration-200 hover:-translate-y-0.5 active:neu-pressed active:translate-y-0">撤销抽奖</button>
                </div>
                <button :disabled="submitting" @click="doSubmit"
                  class="neu-raised h-16 w-full rounded-2xl px-10 text-base font-semibold text-neu-accent transition-all duration-200 hover:-translate-y-0.5 active:neu-pressed active:translate-y-0 disabled:opacity-50">
                  {{ submitting ? '提交中…' : '立即参与' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <h3 class="text-lg font-semibold text-neu-fg">奖品</h3>
            <div class="mt-5 space-y-4">
              <div v-for="(z, i) in period.prizes" :key="i" class="neu-raised overflow-hidden rounded-[24px]">
                <button v-if="z.image" type="button" @click="openZoom(assetUrl(z.image))" class="block w-full cursor-zoom-in">
                  <img :src="assetUrl(z.image)" class="h-44 w-full object-cover transition hover:brightness-105" :alt="z.name" />
                </button>
                <div v-else class="grid h-44 w-full place-items-center bg-neu-bg text-6xl">🎁</div>
                <div class="min-w-0 p-4">
                  <p class="truncate font-semibold text-neu-fg">{{ z.name }}</p>
                  <p class="text-sm text-neu-muted">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="neu-raised rounded-[36px] p-12 text-center">
          <div class="neu-pressed mx-auto grid h-24 w-24 place-items-center rounded-full text-5xl">🎊</div>
          <h2 class="mt-8 text-3xl font-semibold text-neu-fg">提交成功</h2>
          <p class="mt-4 text-base text-neu-muted">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <div class="mt-6 flex justify-center">
            <span class="neu-pressed rounded-full px-6 py-3 text-sm font-medium text-neu-fg">当前共 <b class="font-semibold text-neu-accent">{{ period.participantCount }}</b> 人参与</span>
          </div>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-12">
          <div>
            <h2 class="text-center text-2xl font-semibold text-neu-fg sm:text-3xl">🏆 中奖名单</h2>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="neu-raised rounded-[28px] p-6">
                <div class="flex items-center gap-4">
                  <div class="neu-pressed grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full rounded-2xl object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center text-2xl">🎁</div>
                  </div>
                  <p class="text-lg font-semibold text-neu-fg">{{ g.prizeName }}</p>
                </div>
                <div class="mt-5 flex flex-wrap gap-3">
                  <span v-for="(w, wi) in g.list" :key="wi" class="neu-raised-sm rounded-full px-4 py-2 text-sm font-medium text-neu-fg">
                    {{ w.name }} · <span class="font-semibold text-neu-accent">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="neu-flat rounded-[36px] p-6 sm:p-10">
            <h2 class="text-xl font-semibold text-neu-fg sm:text-2xl">🧮 开奖算法推导</h2>
            <p class="mt-2 text-sm text-neu-muted">所有数字之和 = <b class="font-semibold text-neu-accent">{{ result.totalSum }}</b>，共 <b class="font-semibold text-neu-accent">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si" class="neu-flat rounded-[24px] p-5 sm:p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="neu-pressed rounded-full px-4 py-1.5 text-sm font-semibold text-neu-accent">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-mono text-base font-medium text-neu-fg">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2.5">
                  <span v-for="(e, ei) in s.pool" :key="ei"
                    class="rounded-xl px-3 py-1.5 text-sm font-medium transition"
                    :class="ei === s.remainder ? 'neu-pressed text-neu-accent font-semibold' : 'neu-raised-sm text-neu-muted'">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 text-sm leading-relaxed text-neu-fg/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-neu-fg">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="neu-flat flex items-center justify-between rounded-2xl px-4 py-3">
                <span class="truncate font-medium text-neu-fg">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-mono font-semibold text-neu-accent">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-16">
        <h2 class="text-2xl font-semibold text-neu-fg sm:text-3xl">🍰 下午茶评分</h2>
        <p class="mt-2 text-sm text-neu-muted">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div v-if="period.bill && period.bill.show && period.bill.items.length" class="neu-flat mt-5 rounded-[24px] p-5">
          <p class="text-sm font-semibold text-neu-accent">📒 本期账单 · 合计 ¥{{ period.bill.total }}</p>
          <div class="mt-3 flex flex-wrap gap-2.5">
            <span v-for="b in period.bill.items" :key="b.id" class="neu-raised-sm rounded-full px-4 py-1.5 text-xs font-medium text-neu-muted">{{ b.title }} · ¥{{ b.amount }}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="neu-raised overflow-hidden rounded-[28px]">
            <button v-if="prod.image" type="button" @click="openZoom(assetUrl(prod.image))" class="block w-full cursor-zoom-in">
              <img :src="assetUrl(prod.image)" class="h-44 w-full object-cover transition hover:brightness-105" :alt="prod.name" />
            </button>
            <div v-else class="grid h-44 w-full place-items-center bg-neu-bg text-6xl">🍰</div>
            <div class="p-5">
              <div class="min-w-0">
                <p class="truncate text-lg font-semibold text-neu-fg">{{ prod.name }}</p>
                <p class="truncate text-sm text-neu-muted">{{ prod.desc }}</p>
              </div>
              <div class="mt-4 flex items-center gap-3">
                <div class="neu-pressed h-3.5 flex-1 overflow-hidden rounded-full p-0.5">
                  <div class="h-full rounded-full bg-neu-accent" :style="{ width: prod.ratings.goodRate + '%' }"></div>
                </div>
                <span class="shrink-0 font-mono text-sm font-semibold text-neu-accent">好评 {{ prod.ratings.goodRate }}%</span>
              </div>
              <p class="mt-2 text-xs text-neu-muted">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
              <p v-if="teaExtraText(prod)" class="mt-1 text-xs font-medium text-neu-accent">📦 {{ teaExtraText(prod) }}</p>
              <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-4 grid grid-cols-3 gap-2.5">
                <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                  class="neu-raised rounded-2xl py-2.5 text-sm font-medium text-neu-fg transition-all duration-200 hover:-translate-y-0.5 hover:text-neu-accent active:neu-pressed active:translate-y-0 disabled:opacity-50">
                  {{ lv.emoji }} {{ lv.label }}
                </button>
              </div>
              <p v-else-if="votedProducts[prod.id]" class="neu-pressed mt-4 rounded-2xl py-2.5 text-center text-sm font-semibold text-neu-accent">✓ 已评分</p>
              <p v-else class="neu-pressed mt-4 rounded-2xl py-2.5 text-center text-sm text-neu-muted">评分已结束</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mb-12">
        <h2 class="text-2xl font-semibold text-neu-fg sm:text-3xl">📜 规则</h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="neu-flat rounded-[28px] p-6">
            <p class="font-semibold text-neu-accent">抽奖规则</p>
            <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-neu-fg/80">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="neu-flat rounded-[28px] p-6">
            <p class="font-semibold text-neu-accent">下午茶评分规则</p>
            <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-neu-fg/80">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <footer class="py-10 text-center text-xs font-medium uppercase tracking-[0.3em] text-neu-muted">{{ config.siteName }} · 第 {{ period.id }} 期</footer>
    </div>
  </div>
</template>

<script setup>
/*
 * style4 · 终端 / Terminal (CRT) —— 与参考实现 (Style1Maximalism) 完全一致的数据契约。
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
import DiceButton from '../components/DiceButton.vue';

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

// ASCII 进度条（终端风），10 格
function asciiBar(rate) {
  const filled = Math.round((Number(rate) || 0) / 10);
  return '█'.repeat(Math.max(0, Math.min(10, filled))) + '░'.repeat(Math.max(0, 10 - filled));
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-term-bg font-mono text-term-fg">
    <div class="pointer-events-none fixed inset-0 -z-10 term-grid"></div>
    <div class="pointer-events-none fixed inset-0 z-50 term-scanlines opacity-70"></div>
    <div class="pointer-events-none fixed left-1/2 top-1/3 -z-10 -translate-x-1/2 select-none text-[26vw] font-bold uppercase text-term-green/[0.04]">SYS</div>

    <div class="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="term-box bg-term-panel px-5 py-6 sm:px-8 sm:py-8">
        <pre class="select-none text-xs leading-tight text-term-dim sm:text-sm">┌──────────────────────────────────────────────┐</pre>
        <p class="px-2 text-sm text-term-amber sm:text-base">
          <span class="text-term-green">{{ config.departmentName }}</span>@aiot:~$ <span class="text-term-fg">./lottery --period {{ period.id }}</span>
        </p>
        <h1 class="mt-3 px-2 text-2xl font-bold uppercase leading-tight text-term-green term-glow sm:text-4xl">
          <span class="text-term-dim">&gt;</span> {{ period.title }}<span class="term-cursor text-term-green">▋</span>
        </h1>
        <p class="mt-2 px-2 text-xs text-term-dim sm:text-sm">// {{ config.siteName }}</p>
        <div class="mt-4 px-2 text-sm font-bold sm:text-base">
          <span v-if="isDrawn" class="text-term-amber">[ STATUS ] 已开奖 :: DONE</span>
          <span v-else-if="lotteryOn" class="text-term-green term-glow">[ STATUS ] 进行中 :: ONLINE · {{ period.participantCount }} 人参与</span>
          <span v-else class="text-term-green term-glow">[ STATUS ] 下午茶评分 :: RUNNING</span>
        </div>
        <pre class="mt-3 select-none text-xs leading-tight text-term-dim sm:text-sm">└──────────────────────────────────────────────┘</pre>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mt-10">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-6 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="term-box bg-term-panel p-6 sm:p-8">
              <h2 class="text-xl font-bold uppercase text-term-green term-glow">[ 参与抽奖 ]</h2>
              <p class="mt-2 text-sm text-term-dim">// 填入姓名与幸运数字，开奖前对其他人保密</p>
              <div class="mt-6 space-y-5">
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-term-amber">姓名 / NAME</label>
                  <div class="flex items-stretch border border-term-dim bg-black focus-within:border-term-green focus-within:shadow-[0_0_12px_rgba(51,255,102,.4)]">
                    <span class="grid place-items-center px-3 text-term-green">&gt;</span>
                    <input v-model="name" @input="emit('name-input', name)" type="text" maxlength="30" :placeholder="config.namePlaceholder || '例如：陈老板'"
                      class="w-full bg-transparent py-3 pr-4 text-term-green caret-term-green placeholder-term-dim/70 outline-none" />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-term-amber">幸运数字 / NUMBER (1-9999)</label>
                  <div class="flex items-center gap-3">
                    <div class="flex min-w-0 flex-1 items-stretch border border-term-dim bg-black focus-within:border-term-green focus-within:shadow-[0_0_12px_rgba(51,255,102,.4)]">
                      <span class="grid place-items-center px-3 text-term-green">&gt;</span>
                      <input v-model="number" type="number" min="1" max="9999" placeholder="888"
                        class="w-full bg-transparent py-3 pr-4 text-term-green caret-term-green placeholder-term-dim/70 outline-none" />
                    </div>
                    <DiceButton @roll="(n) => (number = n)" class="shrink-0 text-term-green" />
                  </div>
                </div>
                <p v-if="errorMsg" class="border border-term-red bg-term-red/10 px-4 py-2 text-sm font-bold text-term-red">ERROR: {{ errorMsg }}</p>
                <div v-if="nameStatus.exists" class="border border-term-amber bg-term-amber/10 px-4 py-3">
                  <p class="text-xs leading-relaxed text-term-amber">// WARN: 该姓名已提交过本期抽奖。重复提交会导致抽奖无效，可先撤销再重新参与。<span class="text-term-dim">（为保密不显示号码）</span></p>
                  <button @click="emit('cancel', name)" class="mt-2 border border-term-amber bg-transparent px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-term-amber transition-colors hover:bg-term-amber hover:text-term-bg">[ 撤销抽奖 ]</button>
                </div>
                <button :disabled="submitting" @click="doSubmit"
                  class="w-full border border-term-green bg-transparent py-3 text-sm font-bold uppercase tracking-widest text-term-green transition-colors hover:bg-term-green hover:text-term-bg disabled:cursor-not-allowed disabled:opacity-40">
                  {{ submitting ? '> 提交中…' : '[ RUN ] > SUBMIT' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <div class="term-box bg-term-panel p-5">
              <h3 class="text-lg font-bold uppercase text-term-amber">// 奖品 ls -l</h3>
              <div class="mt-4 space-y-3">
                <div v-for="(z, i) in period.prizes" :key="i" class="flex items-center gap-3 border border-term-line bg-black/40 p-3">
                  <div class="h-14 w-14 shrink-0 overflow-hidden border border-term-dim">
                    <img v-if="z.image" :src="assetUrl(z.image)" class="h-full w-full object-cover" :alt="z.name" />
                    <div v-else class="grid h-full w-full place-items-center bg-term-bg text-2xl">🎁</div>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-bold text-term-green">{{ z.name }}</p>
                    <p class="text-xs text-term-dim">x{{ z.qty }} 名额</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="term-box bg-term-panel p-8 text-center sm:p-12">
          <p class="text-5xl text-term-green term-glow">[ OK ]</p>
          <h2 class="mt-5 text-2xl font-bold uppercase text-term-green term-glow">提交成功 // SUBMITTED</h2>
          <p class="mt-3 text-sm text-term-dim">// 幸运数字已锁定，开奖前对其他人保密，请耐心等待开奖。</p>
          <p class="mt-3 text-sm font-bold text-term-amber">$ participants = {{ period.participantCount }}</p>
          <p class="mt-2 text-term-green">awaiting draw<span class="term-cursor">▋</span></p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-10">
          <!-- (a) 中奖名单 -->
          <div class="term-box bg-term-panel p-5 sm:p-7">
            <h2 class="text-xl font-bold uppercase text-term-green term-glow sm:text-2xl">[ 中奖名单 ] // winners</h2>
            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="border border-term-line bg-black/40 p-4">
                <div class="flex items-center gap-3">
                  <div class="h-12 w-12 shrink-0 overflow-hidden border border-term-dim">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center bg-term-bg text-xl">🎁</div>
                  </div>
                  <p class="font-bold uppercase text-term-amber">{{ g.prizeName }}</p>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="border border-term-green bg-term-green/10 px-3 py-1 text-sm text-term-green">
                    {{ w.name }} · <span class="font-bold text-term-amber">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- (b) 开奖算法推导 -->
          <div class="term-box bg-term-panel p-5 sm:p-7">
            <h2 class="text-xl font-bold uppercase text-term-green term-glow sm:text-2xl">[ 开奖算法推导 ] // draw.log</h2>
            <p class="mt-2 text-sm text-term-dim">
              # 所有数字之和 = <b class="text-term-amber">{{ result.totalSum }}</b>，共 <b class="text-term-amber">{{ result.participantCount }}</b> 人；每步对剩余的人重新求和取余。
            </p>
            <div class="mt-6 space-y-5">
              <div v-for="(s, si) in result.steps" :key="si" class="border border-term-line bg-black/50 p-4">
                <div class="flex flex-wrap items-center gap-2 text-sm">
                  <span class="border border-term-amber px-2 py-0.5 font-bold uppercase text-term-amber">step {{ si + 1 }} · {{ s.prizeName }}</span>
                  <span class="text-term-green">&gt;&gt; {{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  <span v-for="(e, ei) in s.pool" :key="ei"
                    class="border px-2 py-1 text-xs"
                    :class="ei === s.remainder ? 'border-term-green bg-term-green text-term-bg font-bold' : 'border-term-line text-term-dim'">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-3 text-sm leading-relaxed text-term-fg/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <!-- (c) 全部参与者 -->
          <div class="term-box bg-term-panel p-5 sm:p-7">
            <h3 class="text-lg font-bold uppercase text-term-amber">$ ls participants/ ({{ result.sorted.length }} · sort -n)</h3>
            <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-center justify-between border border-term-line bg-black/30 px-3 py-2 text-sm">
                <span class="truncate text-term-fg">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-bold text-term-green">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mt-10">
        <div class="term-box bg-term-panel p-5 sm:p-7">
          <h2 class="text-xl font-bold uppercase text-term-green term-glow sm:text-2xl">[ 下午茶评分 ] // tea.sh</h2>
          <p class="mt-2 text-sm text-term-dim">
            # 每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}
          </p>
          <div v-if="period.bill && period.bill.show && period.bill.items.length" class="mt-5 border border-term-line bg-black/40 p-4">
            <p class="text-sm font-bold uppercase text-term-amber"># 本期账单 · 合计 ¥{{ period.bill.total }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="b in period.bill.items" :key="b.id" class="border border-term-dim bg-black px-2.5 py-1 text-xs text-term-fg/85">{{ b.title }} · ¥{{ b.amount }}</span>
            </div>
          </div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="border border-term-line bg-black/40 p-4">
              <div class="flex items-center gap-3">
                <div class="h-14 w-14 shrink-0 overflow-hidden border border-term-dim">
                  <img v-if="prod.image" :src="assetUrl(prod.image)" class="h-full w-full object-cover" :alt="prod.name" />
                  <div v-else class="grid h-full w-full place-items-center bg-term-bg text-2xl">🍰</div>
                </div>
                <div class="min-w-0">
                  <p class="truncate font-bold text-term-green">{{ prod.name }}</p>
                  <p class="truncate text-xs text-term-dim">{{ prod.desc }}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center gap-2 text-sm">
                <span class="text-term-dim">[</span>
                <span class="font-bold tracking-tight text-term-green">{{ asciiBar(prod.ratings.goodRate) }}</span>
                <span class="text-term-dim">]</span>
                <span class="shrink-0 font-bold text-term-amber">{{ prod.ratings.goodRate }}%</span>
              </div>
              <p class="mt-1 text-xs text-term-dim">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
              <p v-if="teaExtraText(prod)" class="mt-1 text-xs text-term-amber">📦 {{ teaExtraText(prod) }}</p>
              <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
                <button v-for="(lv, li) in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                  class="border border-term-dim bg-black py-2 text-xs font-bold text-term-fg transition-colors hover:bg-term-green hover:text-term-bg disabled:cursor-not-allowed disabled:opacity-40">
                  [{{ li + 1 }}] {{ lv.label }}
                </button>
              </div>
              <p v-else-if="votedProducts[prod.id]" class="mt-3 border border-term-green bg-term-green/10 py-2 text-center text-xs font-bold text-term-green">// rated · ✓ 已评分</p>
              <p v-else class="mt-3 border border-term-line bg-black/30 py-2 text-center text-xs text-term-dim">// 评分已结束</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mt-10">
        <div class="term-box bg-term-panel p-5 sm:p-7">
          <h2 class="text-xl font-bold uppercase text-term-green term-glow sm:text-2xl">[ 规则 ] // README.md</h2>
          <div class="mt-5 grid gap-5 sm:grid-cols-2">
            <div v-if="config.lotteryModuleEnabled !== false" class="border border-term-line bg-black/40 p-4">
              <p class="text-sm font-bold uppercase text-term-amber"># 抽奖规则</p>
              <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-term-fg/85">{{ config.rulesLottery }}</p>
            </div>
            <div v-if="config.teaModuleEnabled !== false" class="border border-term-line bg-black/40 p-4">
              <p class="text-sm font-bold uppercase text-term-amber"># 下午茶评分规则</p>
              <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-term-fg/85">{{ config.rulesTea }}</p>
            </div>
          </div>
        </div>
      </section>

      <footer class="mt-10 py-6 text-center text-xs text-term-dim">
        <span class="text-term-green">{{ config.departmentName }}</span>@aiot:~$ exit // {{ config.siteName }} · 第 {{ period.id }} 期<span class="term-cursor text-term-green">▋</span>
      </footer>
    </div>
  </div>
</template>

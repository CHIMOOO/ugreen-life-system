<script setup>
/*
 * style7 · 赛博朋克 / Cyberpunk —— 霓虹夜城、故障艺术、HUD 界面。
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

// 霓虹轮换色：粉 / 青 / 紫 / 黄 / 绿
const ACCENTS = ['#FF2A6D', '#05D9E8', '#9D00FF', '#F9F002', '#00FF9F'];
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
  <div class="relative min-h-screen overflow-hidden bg-cyber-bg font-dm text-cyber-fg">
    <!-- 透视网格底图层 -->
    <div class="pointer-events-none fixed inset-0 -z-10 cyber-grid"></div>
    <!-- 顶部 / 底部霓虹渐隐光 -->
    <div class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-cyber-pink/25 via-cyber-purple/10 to-transparent"></div>
    <div class="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-72 bg-gradient-to-t from-cyber-cyan/20 via-cyber-purple/10 to-transparent"></div>
    <div class="pointer-events-none fixed left-1/2 top-1/3 -z-10 -translate-x-1/2 select-none font-orbitron text-[26vw] font-black uppercase italic text-cyber-purple/10">NEON</div>

    <div class="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="cyber-clip border border-cyber-pink/60 bg-cyber-panel/80 px-6 py-9 text-center cyber-glow-pink backdrop-blur sm:px-10 sm:py-12">
        <p class="font-mono text-sm uppercase tracking-[0.35em] text-cyber-cyan cyber-text-cyan">// SYS.PERIOD_{{ String(period.id).padStart(2, '0') }} · {{ config.departmentName }}</p>
        <h1 class="mt-4 font-orbitron text-4xl font-black uppercase italic leading-none tracking-tight text-cyber-pink cyber-text-pink animate-cyber-flicker sm:text-6xl">{{ period.title }}</h1>
        <p class="mt-4 font-orbitron text-sm uppercase tracking-[0.4em] text-cyber-fg/70">{{ config.siteName }}</p>
        <p class="mt-6">
          <span v-if="isDrawn" class="inline-block cyber-clip border border-cyber-yellow bg-cyber-yellow/15 px-5 py-1.5 font-orbitron text-sm font-bold uppercase tracking-widest text-cyber-yellow">[ DRAWN ] 已开奖</span>
          <span v-else-if="lotteryOn" class="inline-block cyber-clip border border-cyber-green bg-cyber-green/10 px-5 py-1.5 font-orbitron text-sm font-bold uppercase tracking-widest text-cyber-green">[ LIVE ] 已有 {{ period.participantCount }} 人参与 · 进行中</span>
          <span v-else class="inline-block cyber-clip border border-cyber-cyan bg-cyber-cyan/10 px-5 py-1.5 font-orbitron text-sm font-bold uppercase tracking-widest text-cyber-cyan">[ LIVE ] 下午茶评分进行中</span>
        </p>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-16 mt-12">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-8 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="cyber-clip border border-cyber-pink/60 bg-cyber-panel/80 p-8 cyber-glow-pink backdrop-blur sm:p-10">
              <h2 class="font-orbitron text-2xl font-black uppercase tracking-wide text-cyber-pink cyber-text-pink sm:text-3xl">▰ 参与抽奖</h2>
              <p class="mt-2 font-mono text-sm text-cyber-fg/70">&gt; 填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block font-orbitron text-xs font-bold uppercase tracking-[0.3em] text-cyber-cyan">你的姓名 // NAME</label>
                  <input v-model="name" @input="emit('name-input', name)" type="text" maxlength="30" :placeholder="config.namePlaceholder || '例如：陈老板'"
                    class="w-full cyber-clip border border-cyber-cyan bg-black/60 px-5 py-4 font-mono text-lg text-cyber-cyan placeholder-cyber-fg/30 outline-none transition focus:cyber-glow-cyan" />
                </div>
                <div>
                  <label class="mb-2 block font-orbitron text-xs font-bold uppercase tracking-[0.3em] text-cyber-yellow">幸运数字 // 1-9999</label>
                  <div class="flex items-center gap-3">
                    <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                      class="min-w-0 flex-1 cyber-clip border border-cyber-yellow bg-black/60 px-5 py-4 font-mono text-lg text-cyber-yellow placeholder-cyber-fg/30 outline-none transition focus:shadow-[0_0_10px_rgba(249,240,2,.7),0_0_24px_rgba(249,240,2,.4)]" />
                    <DiceButton @roll="(n) => (number = n)" class="shrink-0 text-cyber-yellow" />
                  </div>
                </div>
                <p v-if="errorMsg" class="cyber-clip border border-cyber-pink bg-cyber-pink/10 px-5 py-3 font-mono text-sm font-bold text-cyber-pink cyber-text-pink">! ERR // {{ errorMsg }}</p>
                <div v-if="nameStatus.exists" class="cyber-clip border border-cyber-yellow/60 bg-cyber-yellow/10 px-5 py-3">
                  <p class="font-mono text-sm text-cyber-yellow">! WARN // 该姓名已提交过本期抽奖。重复提交会导致抽奖无效，可先撤销再重新参与。<span class="text-cyber-fg/60">（为保密不显示号码）</span></p>
                  <button @click="emit('cancel', name)" class="mt-3 cyber-clip border border-cyber-pink bg-black/50 px-5 py-2 font-orbitron text-xs font-bold uppercase tracking-widest text-cyber-pink transition hover:bg-cyber-pink hover:text-black hover:cyber-glow-pink">&gt; 撤销抽奖</button>
                </div>
                <button :disabled="submitting" @click="doSubmit"
                  class="h-16 w-full cyber-clip bg-cyber-pink px-10 font-orbitron text-lg font-black uppercase tracking-widest text-black cyber-glow-pink transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-50">
                  {{ submitting ? '提交中…' : '&gt;&gt; 立即参与' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <h3 class="font-orbitron text-xl font-black uppercase tracking-wide text-cyber-cyan cyber-text-cyan">▰ 奖品 // LOOT</h3>
            <div class="mt-5 space-y-4">
              <div v-for="(z, i) in period.prizes" :key="i" class="overflow-hidden cyber-clip border bg-cyber-panel/80 backdrop-blur" :style="{ borderColor: accent(i), boxShadow: '0 0 10px ' + accent(i) + '66, 0 0 24px ' + accent(i) + '33' }">
                <button v-if="z.image" type="button" @click="openZoom(assetUrl(z.image))" class="block w-full cursor-zoom-in">
                  <img :src="assetUrl(z.image)" class="h-44 w-full object-cover transition hover:brightness-110" :alt="z.name" />
                </button>
                <div v-else class="grid h-44 w-full place-items-center text-6xl" :style="{ backgroundColor: accent(i) + '22' }">🎁</div>
                <div class="p-4">
                  <p class="truncate font-orbitron text-sm font-black uppercase" :style="{ color: accent(i) }">{{ z.name }}</p>
                  <p class="font-mono text-sm text-cyber-fg/60">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="cyber-clip border border-cyber-cyan/70 bg-cyber-panel/80 p-12 text-center cyber-glow-cyan backdrop-blur">
          <p class="font-orbitron text-7xl font-black text-cyber-cyan cyber-text-cyan animate-cyber-flicker">[ OK ]</p>
          <h2 class="mt-6 font-orbitron text-3xl font-black uppercase tracking-wide text-cyber-cyan cyber-text-cyan sm:text-4xl">提交成功</h2>
          <p class="mt-4 font-mono text-cyber-fg/80">&gt; 你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-4 font-orbitron text-sm font-bold uppercase tracking-widest text-cyber-yellow">当前共 {{ period.participantCount }} 人参与</p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-12">
          <!-- (a) 中奖名单 -->
          <div>
            <h2 class="text-center font-orbitron text-3xl font-black uppercase italic tracking-wide text-cyber-pink cyber-text-pink sm:text-5xl">▰ 中奖名单 // WINNERS</h2>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="cyber-clip border bg-cyber-panel/80 p-6 backdrop-blur" :style="{ borderColor: accent(gi), boxShadow: '0 0 10px ' + accent(gi) + '66, 0 0 24px ' + accent(gi) + '33' }">
                <div class="flex items-center gap-4">
                  <div class="h-14 w-14 shrink-0 overflow-hidden cyber-clip border" :style="{ borderColor: accent(gi + 2) }">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: accent(gi) + '22' }">🎁</div>
                  </div>
                  <p class="font-orbitron text-lg font-black uppercase tracking-wide" :style="{ color: accent(gi) }">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="cyber-clip border border-cyber-fg/20 bg-black/50 px-4 py-2 font-mono text-sm font-bold">
                    {{ w.name }} · <span :style="{ color: accent(gi + 1) }">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- (b) 开奖算法推导 -->
          <div class="cyber-clip border border-cyber-cyan/60 bg-cyber-panel/70 p-6 cyber-glow-cyan backdrop-blur sm:p-10">
            <h2 class="font-orbitron text-2xl font-black uppercase tracking-wide text-cyber-cyan cyber-text-cyan sm:text-3xl">▰ 开奖算法推导 // ALGO.LOG</h2>
            <p class="mt-2 font-mono text-sm text-cyber-fg/70">&gt; 所有数字之和 = <b class="text-cyber-yellow">{{ result.totalSum }}</b>，共 <b class="text-cyber-yellow">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si" class="cyber-clip border bg-black/40 p-5 sm:p-6" :style="{ borderColor: accent(si) }">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="cyber-clip px-4 py-1.5 font-orbitron text-sm font-black uppercase text-black" :style="{ backgroundColor: accent(si) }">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-mono text-lg font-bold text-cyber-cyan cyber-text-cyan">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei" class="cyber-clip border px-3 py-1.5 font-mono text-sm font-bold transition"
                    :class="ei === s.remainder ? 'scale-110 border-transparent bg-cyber-yellow text-black' : 'border-cyber-purple/40 text-cyber-fg/50'">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 font-mono text-sm leading-relaxed text-cyber-fg/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <!-- (c) 全部参与者 -->
          <div>
            <h3 class="font-orbitron text-xl font-black uppercase tracking-wide text-cyber-cyan cyber-text-cyan">▰ 全部参与者 // {{ result.sorted.length }} 人 · 按数字升序</h3>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-center justify-between cyber-clip border border-cyber-purple/40 bg-cyber-panel/60 px-4 py-3 backdrop-blur">
                <span class="truncate font-mono font-bold">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-mono font-black" :style="{ color: accent(ei) }">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-16">
        <h2 class="font-orbitron text-2xl font-black uppercase italic tracking-wide text-cyber-pink cyber-text-pink sm:text-4xl">▰ 下午茶评分 // TEA.MENU</h2>
        <p class="mt-2 font-mono text-sm text-cyber-fg/70">&gt; 每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div v-if="period.bill && period.bill.show && period.bill.items.length" class="mt-5 cyber-clip border border-cyber-yellow/50 bg-cyber-panel/70 p-5 backdrop-blur">
          <p class="font-orbitron text-sm font-black uppercase tracking-widest text-cyber-yellow">📒 本期账单 · 合计 ¥{{ period.bill.total }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="b in period.bill.items" :key="b.id" class="cyber-clip border border-cyber-yellow/30 bg-black/40 px-3 py-1 font-mono text-sm text-cyber-fg/70">{{ b.title }} · ¥{{ b.amount }}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="overflow-hidden cyber-clip border bg-cyber-panel/80 backdrop-blur" :style="{ borderColor: accent(pi), boxShadow: '0 0 10px ' + accent(pi) + '55, 0 0 22px ' + accent(pi) + '22' }">
            <button v-if="prod.image" type="button" @click="openZoom(assetUrl(prod.image))" class="block w-full cursor-zoom-in">
              <img :src="assetUrl(prod.image)" class="h-44 w-full object-cover transition hover:brightness-110" :alt="prod.name" />
            </button>
            <div v-else class="grid h-44 w-full place-items-center text-6xl" :style="{ backgroundColor: accent(pi) + '22' }">🍰</div>
            <div class="p-5">
            <div class="min-w-0">
              <p class="truncate font-orbitron text-base font-black uppercase tracking-wide" :style="{ color: accent(pi) }">{{ prod.name }}</p>
              <p class="truncate font-mono text-sm text-cyber-fg/55">{{ prod.desc }}</p>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-3 flex-1 overflow-hidden cyber-clip border border-cyber-cyan/30 bg-black/50">
                <div class="h-full bg-gradient-to-r from-cyber-cyan to-cyber-pink" :style="{ width: prod.ratings.goodRate + '%' }"></div>
              </div>
              <span class="shrink-0 font-mono text-sm font-bold text-cyber-cyan cyber-text-cyan">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-1 font-mono text-xs text-cyber-fg/45">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 font-mono text-xs text-cyber-yellow/70">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="cyber-clip border border-cyber-cyan/50 bg-black/50 py-2 font-orbitron text-sm font-bold text-cyber-cyan transition hover:scale-105 hover:cyber-glow-cyan active:scale-95 disabled:opacity-50">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-3 cyber-clip border border-cyber-cyan bg-cyber-cyan/10 py-2 text-center font-orbitron text-sm font-bold uppercase tracking-widest text-cyber-cyan cyber-text-cyan">[ VOTED ] 已评分</p>
            <p v-else class="mt-3 cyber-clip border border-cyber-fg/20 bg-black/40 py-2 text-center font-mono text-sm text-cyber-fg/45">评分已结束</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mb-12">
        <h2 class="font-orbitron text-2xl font-black uppercase italic tracking-wide text-cyber-cyan cyber-text-cyan sm:text-4xl">▰ 规则 // RULES.md</h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="cyber-clip border border-cyber-pink/50 bg-cyber-panel/70 p-6 backdrop-blur">
            <p class="font-orbitron text-sm font-black uppercase tracking-widest text-cyber-pink">▹ 抽奖规则</p>
            <p class="mt-3 whitespace-pre-line font-mono text-sm leading-relaxed text-cyber-fg/80">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="cyber-clip border border-cyber-cyan/50 bg-cyber-panel/70 p-6 backdrop-blur">
            <p class="font-orbitron text-sm font-black uppercase tracking-widest text-cyber-cyan">▹ 下午茶评分规则</p>
            <p class="mt-3 whitespace-pre-line font-mono text-sm leading-relaxed text-cyber-fg/80">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <footer class="py-10 text-center font-mono text-sm uppercase tracking-[0.3em] text-cyber-fg/40">// {{ config.siteName }} · SYS.PERIOD_{{ String(period.id).padStart(2, '0') }}</footer>
    </div>
  </div>
</template>

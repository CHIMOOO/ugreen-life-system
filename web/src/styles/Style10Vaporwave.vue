<script setup>
/*
 * style10 · 蒸汽波 / Vaporwave —— 与 style1 数据契约完全一致，仅视觉风格不同。
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

const ACCENTS = ['#FF71CE', '#01CDFE', '#B967FF', '#05FFA1', '#FFFB96'];
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
  <div class="relative min-h-screen overflow-hidden vapor-bg font-outfit text-vapor-fg">
    <!-- 透视霓虹网格地平线（青色） -->
    <div class="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[55vh] vapor-grid" style="animation: vapor-scroll 1.6s linear infinite;"></div>
    <!-- 地平线发光线 -->
    <div class="pointer-events-none fixed inset-x-0 bottom-[55vh] -z-10 h-px bg-vapor-cyan/70 shadow-[0_0_24px_8px_rgba(1,205,254,.6)]"></div>
    <!-- 大标题水印 -->
    <div class="pointer-events-none fixed left-1/2 top-1/3 -z-10 -translate-x-1/2 select-none font-monoton text-[26vw] uppercase text-vapor-pink/10">VOL</div>
    <!-- 散落复古装饰 -->
    <div aria-hidden="true" class="pointer-events-none fixed left-[6%] top-[14%] -z-10 select-none text-6xl text-vapor-cyan/40">▲</div>
    <div aria-hidden="true" class="pointer-events-none fixed right-[8%] top-[22%] -z-10 select-none text-5xl text-vapor-pink/40">▼</div>
    <div aria-hidden="true" class="pointer-events-none fixed left-[10%] bottom-[30%] -z-10 select-none text-4xl text-vapor-purple/40">◆</div>

    <div class="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <!-- ① 头部 -->
      <header class="relative py-12 text-center sm:py-16">
        <!-- 百叶窗方块太阳 -->
        <div class="pointer-events-none absolute left-1/2 top-2 -z-10 h-44 w-44 -translate-x-1/2 overflow-hidden rounded-full vapor-sun opacity-80 blur-[1px] sm:h-56 sm:w-56">
          <div class="absolute inset-x-0 bottom-0 top-1/2 space-y-2">
            <div v-for="b in 6" :key="b" class="h-2 bg-vapor-bg/70" :style="{ marginTop: b * 2 + 'px' }"></div>
          </div>
        </div>
        <p class="font-orbitron text-sm font-bold uppercase tracking-[0.3em] text-vapor-cyan">{{ config.departmentName }} · VOL.{{ String(period.id).padStart(2, '0') }}</p>
        <h1 class="mt-4 font-monoton text-4xl uppercase leading-none vapor-chrome sm:text-6xl">{{ period.title }}</h1>
        <p class="mt-5 font-orbitron text-xs uppercase tracking-[0.3em] text-vapor-pink">{{ config.siteName }}</p>
        <p class="mt-4 font-orbitron text-sm font-bold uppercase tracking-[0.2em]">
          <span v-if="isDrawn" class="text-vapor-yellow drop-shadow-[0_0_12px_rgba(255,251,150,.7)]">★ 已开奖</span>
          <span v-else-if="lotteryOn" class="text-vapor-green drop-shadow-[0_0_12px_rgba(5,255,161,.6)]">● 进行中 · 已有 {{ period.participantCount }} 人参与</span>
          <span v-else class="text-vapor-cyan drop-shadow-[0_0_12px_rgba(1,205,254,.6)]">● 下午茶评分进行中</span>
        </p>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-16">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-8 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="rounded-2xl border border-vapor-pink/50 bg-vapor-panel/70 p-8 vapor-glow backdrop-blur sm:p-10">
              <h2 class="font-orbitron text-2xl font-black uppercase tracking-wider vapor-chrome sm:text-3xl">参与抽奖 · JOIN</h2>
              <p class="mt-2 text-vapor-fg/70">填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-vapor-cyan">你的姓名 / NAME</label>
                  <input v-model="name" type="text" maxlength="30" placeholder="例如：阿狸"
                    class="w-full rounded-xl border border-vapor-cyan bg-black/40 px-5 py-4 text-lg font-bold text-vapor-cyan placeholder-vapor-cyan/40 outline-none transition focus:border-vapor-pink focus:vapor-glow" />
                </div>
                <div>
                  <label class="mb-2 block font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-vapor-pink">幸运数字 / LUCKY (1-9999)</label>
                  <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                    class="w-full rounded-xl border border-vapor-pink bg-black/40 px-5 py-4 text-lg font-bold text-vapor-pink placeholder-vapor-pink/40 outline-none transition focus:border-vapor-cyan focus:vapor-glow" />
                </div>
                <p v-if="errorMsg" class="rounded-xl border border-vapor-pink bg-vapor-pink/15 px-5 py-3 font-bold text-vapor-pink">⚠ {{ errorMsg }}</p>
                <button :disabled="submitting" @click="doSubmit"
                  class="h-15 w-full rounded-full bg-gradient-to-r from-vapor-pink to-vapor-purple px-10 py-4 font-orbitron font-black uppercase tracking-[0.2em] text-white vapor-glow transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50">
                  {{ submitting ? '提交中…' : '▶ 立即参与' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <h3 class="font-orbitron text-xl font-black uppercase tracking-wider text-vapor-cyan">奖品 · PRIZES</h3>
            <div class="mt-5 space-y-4">
              <div v-for="(z, i) in period.prizes" :key="i" class="flex items-center gap-4 rounded-2xl border bg-vapor-panel/60 p-4 vapor-glow backdrop-blur" :style="{ borderColor: accent(i) }">
                <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border" :style="{ borderColor: accent(i + 1) }">
                  <img v-if="z.image" :src="assetUrl(z.image)" class="h-full w-full object-cover" :alt="z.name" />
                  <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: accent(i) + '33' }">🎁</div>
                </div>
                <div class="min-w-0">
                  <p class="truncate font-orbitron font-black uppercase" :style="{ color: accent(i) }">{{ z.name }}</p>
                  <p class="text-sm text-vapor-fg/70">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="rounded-2xl border border-vapor-cyan/60 bg-vapor-panel/60 p-12 text-center vapor-glow backdrop-blur">
          <p class="text-8xl drop-shadow-[0_0_20px_rgba(1,205,254,.6)]">🎊</p>
          <h2 class="mt-6 font-orbitron text-3xl font-black uppercase tracking-wider vapor-chrome sm:text-4xl">提交成功！</h2>
          <p class="mt-4 text-lg text-vapor-fg/80">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-2 font-orbitron font-bold uppercase tracking-[0.2em] text-vapor-cyan">当前共 {{ period.participantCount }} 人参与</p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-12">
          <div>
            <h2 class="text-center font-monoton text-3xl uppercase vapor-chrome sm:text-5xl">★ 中奖名单</h2>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="rounded-2xl border bg-vapor-panel/70 p-6 vapor-glow backdrop-blur" :style="{ borderColor: accent(gi) }">
                <div class="flex items-center gap-4">
                  <div class="h-14 w-14 shrink-0 overflow-hidden rounded-xl border" :style="{ borderColor: accent(gi + 2) }">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: accent(gi) + '33' }">🎁</div>
                  </div>
                  <p class="font-orbitron text-lg font-black uppercase tracking-wide" :style="{ color: accent(gi) }">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="rounded-full border border-white/20 bg-black/40 px-4 py-2 font-bold">
                    {{ w.name }} · <span class="font-orbitron" :style="{ color: accent(gi + 1) }">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-vapor-purple/60 bg-vapor-panel/40 p-6 vapor-glow backdrop-blur sm:p-10">
            <h2 class="font-orbitron text-2xl font-black uppercase tracking-wider text-vapor-purple sm:text-3xl">⌬ 开奖算法推导</h2>
            <p class="mt-2 text-vapor-fg/70">所有数字之和 = <b class="text-vapor-cyan">{{ result.totalSum }}</b>，共 <b class="text-vapor-cyan">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si" class="rounded-2xl border bg-black/30 p-5 vapor-glow sm:p-6" :style="{ borderColor: accent(si) }">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full px-4 py-1.5 font-orbitron font-black uppercase text-vapor-bg" :style="{ backgroundColor: accent(si) }">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-mono text-lg font-bold text-vapor-cyan">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei" class="rounded-lg border px-3 py-1.5 text-sm font-bold transition"
                    :class="ei === s.remainder ? 'scale-110' : 'text-vapor-fg/50'"
                    :style="ei === s.remainder ? { backgroundColor: '#FFFB96', color: '#1A0033', borderColor: '#fff' } : { borderColor: 'rgba(255,227,255,.2)' }">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 leading-relaxed text-vapor-fg/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="font-orbitron text-xl font-black uppercase tracking-wider text-vapor-cyan">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-center justify-between rounded-xl border border-vapor-cyan/30 bg-vapor-panel/40 px-4 py-3 backdrop-blur transition hover:vapor-glow">
                <span class="truncate font-bold">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-mono font-black" :style="{ color: accent(ei) }">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-16">
        <h2 class="font-monoton text-2xl uppercase vapor-chrome sm:text-4xl">☕ 下午茶评分</h2>
        <p class="mt-3 text-vapor-fg/70">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="rounded-2xl border bg-vapor-panel/60 p-5 vapor-glow backdrop-blur" :style="{ borderColor: accent(pi) }">
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border" :style="{ borderColor: accent(pi + 3) }">
                <img v-if="prod.image" :src="assetUrl(prod.image)" class="h-full w-full object-cover" :alt="prod.name" />
                <div v-else class="grid h-full w-full place-items-center text-2xl" :style="{ backgroundColor: accent(pi) + '33' }">🍰</div>
              </div>
              <div class="min-w-0">
                <p class="truncate font-orbitron text-lg font-black uppercase" :style="{ color: accent(pi) }">{{ prod.name }}</p>
                <p class="truncate text-sm text-vapor-fg/60">{{ prod.desc }}</p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-3 flex-1 overflow-hidden rounded-full bg-black/40">
                <div class="h-full rounded-full bg-gradient-to-r from-vapor-pink to-vapor-cyan" :style="{ width: prod.ratings.goodRate + '%' }"></div>
              </div>
              <span class="shrink-0 font-mono text-sm font-black vapor-chrome">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-1 text-xs text-vapor-fg/50">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 text-xs font-bold text-vapor-cyan">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="rounded-full border border-vapor-cyan/40 bg-black/30 py-2 text-sm font-bold text-vapor-fg transition hover:scale-105 hover:vapor-glow active:scale-95 disabled:opacity-50">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-3 rounded-full bg-vapor-green/20 py-2 text-center text-sm font-bold text-vapor-green drop-shadow-[0_0_10px_rgba(5,255,161,.5)]">▣ 已评分</p>
            <p v-else class="mt-3 rounded-full bg-black/30 py-2 text-center text-sm text-vapor-fg/50">评分已结束</p>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="lotteryOn || teaOn" class="mb-12">
        <h2 class="font-orbitron text-2xl font-black uppercase tracking-[0.3em] vapor-chrome sm:text-3xl">A E S T H E T I C · 规则</h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-if="lotteryOn" class="rounded-2xl border border-dashed border-vapor-pink/60 bg-vapor-panel/50 p-6 backdrop-blur">
            <p class="font-orbitron font-black uppercase tracking-wider text-vapor-pink">抽奖规则</p>
            <p class="mt-2 whitespace-pre-line leading-relaxed text-vapor-fg/80">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="teaOn" class="rounded-2xl border border-dashed border-vapor-cyan/60 bg-vapor-panel/50 p-6 backdrop-blur">
            <p class="font-orbitron font-black uppercase tracking-wider text-vapor-cyan">下午茶评分规则</p>
            <p class="mt-2 whitespace-pre-line leading-relaxed text-vapor-fg/80">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <footer class="py-10 text-center font-orbitron text-xs uppercase tracking-[0.3em] text-vapor-fg/40">{{ config.siteName }} · VOL.{{ String(period.id).padStart(2, '0') }}</footer>
    </div>
  </div>
</template>

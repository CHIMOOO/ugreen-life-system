<script setup>
/*
 * style2 · 手绘随笔 / Sketch —— 与 style1 完全一致的数据契约，仅视觉风格不同。
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

// 手绘风：用细微旋转 + 不规则圆角制造「贴纸／便签」错落感
const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg', '-1.5deg', '1deg'];
const tilt = (i) => TILTS[((i % TILTS.length) + TILTS.length) % TILTS.length];
const WOBBLES = [
  '255px 15px 225px 15px / 15px 225px 15px 255px',
  '18px 140px 22px 140px / 140px 18px 140px 22px',
  '140px 18px 130px 20px / 20px 130px 18px 140px',
  '210px 18px 230px 16px / 16px 230px 18px 210px',
];
const wobble = (i) => WOBBLES[((i % WOBBLES.length) + WOBBLES.length) % WOBBLES.length];

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
  <div class="relative min-h-screen paper-grid font-patrick text-sketch-ink">
    <!-- 手绘装饰：随手贴的胶带与涂鸦 -->
    <div aria-hidden="true" class="pointer-events-none fixed left-[5%] top-[12%] hidden text-5xl animate-sketch-bob md:block">✏️</div>
    <div aria-hidden="true" class="pointer-events-none fixed right-[6%] top-[20%] hidden text-5xl animate-sketch-bob md:block" style="animation-delay:-1.2s">📎</div>
    <div aria-hidden="true" class="pointer-events-none fixed bottom-[10%] left-[8%] hidden text-4xl animate-sketch-bob md:block" style="animation-delay:-2s">⭐</div>

    <div class="relative z-10 mx-auto max-w-5xl px-6 py-12 sm:px-8">
      <!-- ① 头部 -->
      <header class="relative py-12 text-center sm:py-16">
        <!-- 顶部「胶带」 -->
        <span aria-hidden="true" class="absolute left-1/2 top-2 h-7 w-32 -translate-x-1/2 -rotate-2 bg-sketch-muted/70 shadow-sketch-soft"></span>
        <p class="inline-block -rotate-1 bg-sketch-postit px-4 py-1 font-kalam text-lg font-bold text-sketch-ink shadow-sketch-soft wobbly-pill">
          {{ config.departmentName }} · 第 {{ period.id }} 期
        </p>
        <h1 class="mt-5 font-kalam text-5xl font-bold leading-tight text-sketch-ink sm:text-6xl">{{ period.title }}</h1>
        <p class="mt-3 font-patrick text-lg text-sketch-blue underline decoration-wavy decoration-sketch-red/60 underline-offset-4">{{ config.siteName }}</p>
        <p class="mt-5">
          <span v-if="isDrawn" class="inline-block rotate-1 border-[3px] border-sketch-ink bg-white px-5 py-2 font-kalam text-lg font-bold shadow-sketch wobbly-pill">🏆 已开奖</span>
          <span v-else-if="lotteryOn" class="inline-block -rotate-1 border-[3px] border-sketch-blue bg-white px-5 py-2 font-kalam text-lg font-bold text-sketch-blue shadow-sketch wobbly-pill">👥 已有 {{ period.participantCount }} 人参与</span>
          <span v-else class="inline-block rotate-1 border-[3px] border-sketch-red bg-white px-5 py-2 font-kalam text-lg font-bold text-sketch-red shadow-sketch wobbly-pill">🍰 下午茶评分进行中</span>
        </p>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-20">
        <!-- 表单 -->
        <div v-if="showForm" class="space-y-10">
          <div class="mx-auto w-full max-w-2xl">
            <div class="border-[3px] border-sketch-ink bg-white p-8 shadow-sketch-lg sm:p-10 wobbly-md">
              <h2 class="font-kalam text-3xl font-bold text-sketch-red">参与抽奖</h2>
              <p class="mt-2 font-patrick text-lg text-sketch-ink/70">填入姓名和幸运数字，开奖前没有人能看到你的信息。</p>
              <div class="mt-8 space-y-6">
                <div>
                  <label class="mb-2 block font-kalam text-lg font-bold text-sketch-ink">你的姓名</label>
                  <input v-model="name" @input="emit('name-input', name)" type="text" maxlength="30" :placeholder="'例如：' + (config.namePlaceholder || '陈老板')"
                    class="w-full border-[3px] border-sketch-ink bg-white px-5 py-3 font-patrick text-lg text-sketch-ink placeholder-sketch-ink/40 outline-none transition focus:border-sketch-blue focus:ring-2 focus:ring-sketch-blue/20 wobbly-pill" />
                </div>
                <div>
                  <label class="mb-2 block font-kalam text-lg font-bold text-sketch-ink">幸运数字 (1-9999)</label>
                  <div class="flex items-center gap-3">
                    <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                      class="min-w-0 flex-1 border-[3px] border-sketch-ink bg-white px-5 py-3 font-patrick text-lg text-sketch-ink placeholder-sketch-ink/40 outline-none transition focus:border-sketch-blue focus:ring-2 focus:ring-sketch-blue/20 wobbly-pill" />
                    <DiceButton @roll="(n) => (number = n)" class="shrink-0 text-sketch-red" />
                  </div>
                </div>
                <p v-if="errorMsg" class="border-[3px] border-dashed border-sketch-red bg-sketch-red/10 px-5 py-3 font-kalam font-bold text-sketch-red wobbly-md">⚠ {{ errorMsg }}</p>
                <div v-if="nameStatus.exists" class="border-[3px] border-dashed border-sketch-blue bg-sketch-postit px-5 py-3 shadow-sketch-soft wobbly-md">
                  <p class="font-patrick text-sm leading-relaxed text-sketch-ink/80">该姓名已提交过本期抽奖。重复提交会导致抽奖无效，可先撤销再重新参与。<span class="text-sketch-ink/50">（为保密不显示号码）</span></p>
                  <button @click="emit('cancel', name)" class="mt-2 border-[3px] border-sketch-ink bg-white px-4 py-1.5 font-kalam text-sm font-bold text-sketch-red shadow-sketch-soft transition-transform duration-100 hover:-rotate-1 hover:bg-sketch-red hover:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none wobbly-pill">撤销抽奖</button>
                </div>
                <button :disabled="submitting" @click="doSubmit"
                  class="h-14 w-full border-[3px] border-sketch-ink bg-white px-8 font-kalam text-xl font-bold text-sketch-ink shadow-sketch transition-transform duration-100 hover:-rotate-1 hover:bg-sketch-red hover:text-white hover:shadow-sketch-soft active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 wobbly-pill">
                  🚀 立即参与
                </button>
              </div>
            </div>
            <ConfirmSubmitDialog :open="showConfirm" :rules="config.rulesLottery" :submitting="submitting"
              :name="pending?.name" :number="pending?.number" :accent="'#4f86c6'"
              @confirm="confirmSubmit" @cancel="showConfirm = false" />
          </div>
          <div>
            <h3 class="font-kalam text-2xl font-bold text-sketch-blue">奖品清单</h3>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="(z, i) in period.prizes" :key="i"
                class="overflow-hidden border-[3px] border-sketch-ink bg-white shadow-sketch transition-transform duration-100 hover:rotate-1"
                :style="{ transform: `rotate(${tilt(i)})`, borderRadius: wobble(i) }">
                <button v-if="z.image" type="button" @click="openZoom(assetUrl(z.image))" class="block w-full cursor-zoom-in border-b-[3px] border-sketch-ink">
                  <img :src="assetUrl(z.image)" class="h-44 w-full object-cover transition hover:brightness-105" :alt="z.name" />
                </button>
                <div v-else class="grid h-44 w-full place-items-center border-b-[3px] border-sketch-ink bg-sketch-muted text-6xl">🎁</div>
                <div class="min-w-0 p-4">
                  <p class="truncate font-kalam text-lg font-bold text-sketch-ink">{{ z.name }}</p>
                  <p class="font-patrick text-sm text-sketch-ink/60">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="relative border-[3px] border-sketch-ink bg-sketch-postit p-12 text-center shadow-sketch-lg wobbly-md">
          <span aria-hidden="true" class="absolute left-1/2 top-3 h-7 w-36 -translate-x-1/2 rotate-2 bg-white/60 shadow-sketch-soft"></span>
          <p class="text-7xl animate-sketch-bob">🎊</p>
          <h2 class="mt-6 font-kalam text-4xl font-bold text-sketch-ink">提交成功！</h2>
          <p class="mt-4 font-patrick text-lg text-sketch-ink/80">你的幸运数字已锁定，开奖前对其他人保密。耐心等待开奖吧～</p>
          <p class="mt-3 inline-block -rotate-1 border-[3px] border-sketch-blue bg-white px-5 py-2 font-kalam text-lg font-bold text-sketch-blue shadow-sketch wobbly-pill">当前共 {{ period.participantCount }} 人参与</p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-14">
          <!-- (a) 中奖名单 -->
          <div>
            <h2 class="text-center font-kalam text-4xl font-bold text-sketch-ink sm:text-5xl">🏆 中奖名单</h2>
            <div class="mt-8 grid gap-6 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi"
                class="border-[3px] border-sketch-ink bg-white p-6 shadow-sketch transition-transform duration-100 hover:-rotate-1"
                :style="{ transform: `rotate(${tilt(gi)})`, borderRadius: wobble(gi) }">
                <div class="flex items-center gap-4">
                  <div class="h-14 w-14 shrink-0 overflow-hidden border-[3px] border-sketch-ink wobbly-md">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center bg-sketch-muted text-2xl">🎁</div>
                  </div>
                  <p class="font-kalam text-xl font-bold text-sketch-red">{{ g.prizeName }}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(w, wi) in g.list" :key="wi" class="border-[3px] border-sketch-ink bg-sketch-postit px-3 py-1.5 font-patrick text-sm font-bold shadow-sketch-soft wobbly-pill">
                    {{ w.name }} · <span class="text-sketch-blue">{{ w.number }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- (b) 开奖算法推导 -->
          <div class="border-[3px] border-sketch-ink bg-white p-6 shadow-sketch-lg sm:p-10 wobbly-md">
            <h2 class="font-kalam text-3xl font-bold text-sketch-blue">🧮 开奖算法推导</h2>
            <p class="mt-2 font-patrick text-lg text-sketch-ink/70">所有数字之和 = <b class="text-sketch-red">{{ result.totalSum }}</b>，共 <b class="text-sketch-red">{{ result.participantCount }}</b> 人。每一步对剩余的人重新求和取余。</p>
            <div class="mt-8 space-y-6">
              <div v-for="(s, si) in result.steps" :key="si"
                class="border-[3px] border-dashed border-sketch-ink bg-sketch-paper p-5 shadow-sketch-soft sm:p-6"
                :style="{ borderRadius: wobble(si + 1) }">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="border-[3px] border-sketch-ink bg-sketch-postit px-4 py-1.5 font-kalam font-bold text-sketch-ink shadow-sketch-soft wobbly-pill">第 {{ si + 1 }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-mono text-lg font-bold text-sketch-blue">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei"
                    class="border-[3px] px-3 py-1.5 font-patrick text-sm font-bold transition-transform duration-100 wobbly-pill"
                    :class="ei === s.remainder ? 'border-sketch-ink bg-sketch-red text-white shadow-sketch -rotate-2 scale-110' : 'border-sketch-ink/40 bg-white text-sketch-ink/70'">
                    {{ e.number }}<template v-if="ei === s.remainder"> ✓ {{ e.name }}</template>
                  </span>
                </div>
                <p class="mt-4 font-patrick text-base leading-relaxed text-sketch-ink/85">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <!-- (c) 全部参与者 -->
          <div>
            <h3 class="font-kalam text-2xl font-bold text-sketch-blue">全部参与者（{{ result.sorted.length }} 人 · 按数字升序）</h3>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <div v-for="(e, ei) in result.sorted" :key="ei"
                class="flex items-center justify-between border-[3px] border-sketch-ink bg-white px-4 py-3 shadow-sketch-soft"
                :style="{ borderRadius: wobble(ei) }">
                <span class="truncate font-patrick font-bold text-sketch-ink">{{ e.name }}</span>
                <span class="ml-2 shrink-0 font-mono font-bold text-sketch-red">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-20">
        <h2 class="font-kalam text-3xl font-bold text-sketch-ink sm:text-4xl">🍰 下午茶评分</h2>
        <p class="mt-2 font-patrick text-lg text-sketch-ink/70">每款只能评一次，好评率 =（推荐+还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div v-if="period.bill && period.bill.show && period.bill.items.length" class="mt-5 border-[3px] border-dashed border-sketch-ink bg-sketch-paper p-5 shadow-sketch-soft wobbly-md">
          <p class="inline-block bg-sketch-postit px-3 py-1 font-kalam text-lg font-bold text-sketch-ink wobbly-pill">📒 本期账单 · 合计 ¥{{ period.bill.total }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="b in period.bill.items" :key="b.id" class="border-[3px] border-sketch-ink/40 bg-white px-3 py-1 font-patrick text-sm text-sketch-ink/70 wobbly-pill">{{ b.title }} · ¥{{ b.amount }}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-6 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id"
            class="overflow-hidden border-[3px] border-sketch-ink bg-white shadow-sketch transition-transform duration-100 hover:rotate-1"
            :style="{ transform: `rotate(${tilt(pi)})`, borderRadius: wobble(pi) }">
            <button v-if="prod.image" type="button" @click="openZoom(assetUrl(prod.image))" class="block w-full cursor-zoom-in border-b-[3px] border-sketch-ink">
              <img :src="assetUrl(prod.image)" class="h-44 w-full object-cover transition hover:brightness-105" :alt="prod.name" />
            </button>
            <div v-else class="grid h-44 w-full place-items-center border-b-[3px] border-sketch-ink bg-sketch-muted text-6xl">🍰</div>
            <div class="p-5">
            <div class="min-w-0">
              <p class="truncate font-kalam text-lg font-bold text-sketch-ink">{{ prod.name }}</p>
              <p class="truncate font-patrick text-sm text-sketch-ink/60">{{ prod.desc }}</p>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-4 flex-1 overflow-hidden border-[3px] border-sketch-ink bg-sketch-muted wobbly-pill">
                <div class="h-full bg-sketch-red" :style="{ width: prod.ratings.goodRate + '%' }"></div>
              </div>
              <span class="shrink-0 font-kalam text-sm font-bold text-sketch-red">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-2 font-patrick text-xs text-sketch-ink/50">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 font-patrick text-xs font-bold text-sketch-blue">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-3 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="border-[3px] border-sketch-ink bg-white py-2 font-kalam text-sm font-bold text-sketch-ink shadow-sketch-soft transition-transform duration-100 hover:-rotate-2 hover:bg-sketch-blue hover:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 wobbly-pill">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-3 border-[3px] border-sketch-blue bg-sketch-blue/10 py-2 text-center font-kalam text-sm font-bold text-sketch-blue wobbly-pill">✓ 已评分</p>
            <p v-else class="mt-3 border-[3px] border-dashed border-sketch-ink/40 bg-sketch-muted/40 py-2 text-center font-patrick text-sm text-sketch-ink/50 wobbly-pill">评分已结束</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 规则 -->
      <section v-if="config.lotteryModuleEnabled !== false || config.teaModuleEnabled !== false" class="mb-12">
        <h2 class="font-kalam text-3xl font-bold text-sketch-ink sm:text-4xl">📜 规则</h2>
        <div class="mt-6 grid gap-6 sm:grid-cols-2">
          <div v-if="config.lotteryModuleEnabled !== false" class="border-[3px] border-dashed border-sketch-ink bg-white p-6 shadow-sketch-soft -rotate-1 wobbly-md">
            <p class="inline-block bg-sketch-postit px-3 py-1 font-kalam text-lg font-bold text-sketch-red wobbly-pill">抽奖规则</p>
            <p class="mt-3 whitespace-pre-line font-patrick text-base leading-relaxed text-sketch-ink/80">{{ config.rulesLottery }}</p>
          </div>
          <div v-if="config.teaModuleEnabled !== false" class="border-[3px] border-dashed border-sketch-ink bg-white p-6 shadow-sketch-soft rotate-1 wobbly-md">
            <p class="inline-block bg-sketch-postit px-3 py-1 font-kalam text-lg font-bold text-sketch-blue wobbly-pill">下午茶评分规则</p>
            <p class="mt-3 whitespace-pre-line font-patrick text-base leading-relaxed text-sketch-ink/80">{{ config.rulesTea }}</p>
          </div>
        </div>
      </section>

      <footer class="py-10 text-center font-kalam text-lg font-bold text-sketch-ink/40">{{ config.siteName }} · 第 {{ period.id }} 期</footer>
    </div>
  </div>
</template>

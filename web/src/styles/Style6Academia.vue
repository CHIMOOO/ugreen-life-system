<script setup>
/*
 * style6 · 学院风 / Dark Academia —— 旧书、羊皮纸、图书馆、古典学术。
 *
 * 数据契约与 style1（参考实现）完全一致；仅视觉风格不同。
 *
 * Props:
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
 * 四块：① 头部 ② 抽奖 ③ 下午茶 ④ 规则。
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

// 罗马数字编号（栏目用）
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const roman = (i) => ROMAN[i] || String(i + 1);

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
  <div class="aca-paper min-h-screen font-garamond text-aca-ink">
    <div class="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <!-- ① 头部 · 扉页 -->
      <header class="py-12 text-center sm:py-16">
        <p class="aca-rule pb-3 text-xs font-semibold uppercase tracking-[0.3em] text-aca-gold">{{ config.departmentName }}</p>
        <div class="py-5 text-2xl text-aca-gold">❦</div>
        <h1 class="font-playfair text-5xl font-bold italic leading-tight text-aca-ink sm:text-6xl">{{ period.title }}</h1>
        <p class="mt-4 font-playfair text-lg italic text-aca-brown">{{ config.siteName }}</p>
        <div class="mx-auto mt-6 max-w-md">
          <div class="aca-rule"></div>
          <p class="py-4 text-sm uppercase tracking-[0.25em] text-aca-brown">
            <span class="text-aca-gold">✦</span>
            <span class="mx-3">第 {{ period.id }} 卷</span>
            <span class="text-aca-gold">·</span>
            <span v-if="isDrawn" class="mx-3 font-semibold text-aca-burgundy">已开奖</span>
            <span v-else-if="lotteryOn" class="mx-3 font-semibold text-aca-forest">进行中 · {{ period.participantCount }} 位参与者</span>
            <span v-else class="mx-3 font-semibold text-aca-forest">品鉴进行中</span>
            <span class="text-aca-gold">✦</span>
          </p>
          <div class="aca-rule"></div>
        </div>
      </header>

      <!-- ② 抽奖 -->
      <section v-if="lotteryOn" class="mb-16">
        <!-- 表单 -->
        <div v-if="showForm" class="grid gap-8 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <div class="aca-frame bg-aca-panel p-7 sm:p-9">
              <h2 class="font-playfair text-3xl font-bold italic text-aca-ink">
                <span class="mr-2 not-italic text-aca-gold">{{ roman(0) }}.</span>参与抽奖
              </h2>
              <div class="aca-rule mt-3"></div>
              <p class="mt-4 italic text-aca-brown">填入姓名与幸运数字。开奖之前，无人能窥见你的卷宗。</p>
              <div class="mt-8 space-y-7">
                <div>
                  <label class="mb-2 block font-playfair italic text-aca-brown">你的姓名</label>
                  <input v-model="name" type="text" maxlength="30" placeholder="例如：阿狸"
                    class="w-full border-b-2 border-aca-ink bg-transparent px-1 py-2 font-garamond text-lg text-aca-ink placeholder-aca-brown/50 outline-none transition focus:border-aca-burgundy" />
                </div>
                <div>
                  <label class="mb-2 block font-playfair italic text-aca-brown">幸运数字 (1-9999)</label>
                  <input v-model="number" type="number" min="1" max="9999" placeholder="例如：888"
                    class="w-full border-b-2 border-aca-ink bg-transparent px-1 py-2 font-garamond text-lg text-aca-ink placeholder-aca-brown/50 outline-none transition focus:border-aca-burgundy" />
                </div>
                <p v-if="errorMsg" class="border-l-4 border-aca-burgundy bg-aca-burgundy/10 px-4 py-3 italic text-aca-burgundy">❦ {{ errorMsg }}</p>
                <button :disabled="submitting" @click="doSubmit"
                  class="w-full bg-aca-burgundy px-8 py-4 font-playfair text-lg uppercase tracking-widest text-aca-paper transition-colors duration-200 hover:bg-aca-ink disabled:opacity-50">
                  {{ submitting ? '提交中…' : '呈递卷宗' }}
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <h3 class="font-playfair text-2xl font-bold italic text-aca-ink">奖品图录</h3>
            <div class="aca-rule mt-3"></div>
            <div class="mt-5 space-y-4">
              <div v-for="(z, i) in period.prizes" :key="i" class="flex items-center gap-4 bg-aca-panel p-4 aca-frame">
                <div class="h-16 w-16 shrink-0 overflow-hidden border-2 border-aca-ink">
                  <img v-if="z.image" :src="assetUrl(z.image)" class="h-full w-full object-cover" :alt="z.name" />
                  <div v-else class="grid h-full w-full place-items-center bg-aca-paper text-2xl">🎁</div>
                </div>
                <div class="min-w-0">
                  <p class="truncate font-playfair text-lg font-semibold text-aca-burgundy">{{ z.name }}</p>
                  <p class="text-sm italic text-aca-brown">{{ z.qty }} 个名额</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已参与 -->
        <div v-else-if="joined && !isDrawn" class="aca-frame bg-aca-panel p-10 text-center sm:p-14">
          <p class="text-5xl text-aca-gold">❦</p>
          <h2 class="mt-6 font-playfair text-4xl font-bold italic text-aca-ink">卷宗已呈递</h2>
          <div class="mx-auto mt-5 max-w-sm">
            <div class="aca-rule"></div>
          </div>
          <p class="mt-5 text-lg italic text-aca-brown">你的幸运数字已封存入册，开奖前对外人保密。请静候揭晓。</p>
          <p class="mt-4 font-playfair italic tracking-wide text-aca-forest">当前共 {{ period.participantCount }} 位参与者</p>
        </div>

        <!-- 开奖结果 -->
        <div v-else-if="isDrawn && result" class="space-y-14">
          <!-- (a) 中奖名单 · 获奖名录 -->
          <div>
            <h2 class="text-center font-playfair text-4xl font-bold italic text-aca-ink sm:text-5xl">
              <span class="mr-2 not-italic text-aca-gold">{{ roman(0) }}.</span>获奖名录
            </h2>
            <div class="mx-auto mt-4 max-w-xs"><div class="aca-rule"></div></div>
            <div class="mt-8 grid gap-5 sm:grid-cols-2">
              <div v-for="(g, gi) in prizeGroups" :key="gi" class="border-2 border-aca-gold bg-aca-panel p-6 shadow-[0_0_0_1px_#B08D57_inset]">
                <div class="flex items-center gap-4">
                  <div class="h-14 w-14 shrink-0 overflow-hidden border-2 border-aca-gold">
                    <img v-if="g.image" :src="assetUrl(g.image)" class="h-full w-full object-cover" :alt="g.prizeName" />
                    <div v-else class="grid h-full w-full place-items-center bg-aca-paper text-2xl">🎁</div>
                  </div>
                  <p class="font-playfair text-xl font-bold italic text-aca-ink">{{ g.prizeName }}</p>
                </div>
                <div class="aca-rule mt-4"></div>
                <ul class="mt-4 space-y-2">
                  <li v-for="(w, wi) in g.list" :key="wi" class="flex items-baseline gap-2">
                    <span class="text-aca-gold">❦</span>
                    <span class="font-semibold text-aca-burgundy underline decoration-aca-gold/60 underline-offset-4">{{ w.name }}</span>
                    <span class="flex-1 self-center border-b border-dotted border-aca-brown/40"></span>
                    <span class="font-playfair italic text-aca-brown">№ {{ w.number }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- (b) 开奖算法推导 · 论证段落 -->
          <div class="aca-frame bg-aca-panel p-6 sm:p-10">
            <h2 class="font-playfair text-3xl font-bold italic text-aca-ink">
              <span class="mr-2 not-italic text-aca-gold">{{ roman(1) }}.</span>开奖算法推导
            </h2>
            <div class="aca-rule mt-3"></div>
            <p class="aca-dropcap mt-5 leading-relaxed text-aca-ink">所有幸运数字之和为 <b class="text-aca-burgundy">{{ result.totalSum }}</b>，共 <b class="text-aca-burgundy">{{ result.participantCount }}</b> 位参与者。每一轮抽取，皆对尚余之人重新求和取余，循此推演，公之于众，以昭公允。</p>
            <div class="mt-8 space-y-8">
              <div v-for="(s, si) in result.steps" :key="si">
                <div v-if="si > 0" class="aca-rule mb-8"></div>
                <div class="flex flex-wrap items-baseline gap-3">
                  <span class="font-playfair text-xl font-bold italic text-aca-burgundy">第 {{ roman(si) }} 抽 · {{ s.prizeName }}</span>
                  <span class="font-playfair text-lg italic tracking-wide text-aca-forest">{{ s.poolSum }} ÷ {{ s.poolSize }} 余 {{ s.remainder }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="(e, ei) in s.pool" :key="ei"
                    class="border px-3 py-1.5 text-sm transition"
                    :class="ei === s.remainder
                      ? 'border-aca-burgundy bg-aca-burgundy text-aca-paper font-semibold'
                      : 'border-aca-brown/40 text-aca-brown'">
                    {{ e.number }}<template v-if="ei === s.remainder"> · {{ e.name }} ❦</template>
                  </span>
                </div>
                <p class="mt-4 leading-relaxed text-aca-ink/90">{{ stepExplain(s) }}</p>
              </div>
            </div>
          </div>

          <!-- (c) 全部参与者 · 目录 -->
          <div>
            <h3 class="font-playfair text-2xl font-bold italic text-aca-ink">
              <span class="mr-2 not-italic text-aca-gold">{{ roman(2) }}.</span>全部参与者（{{ result.sorted.length }} 位 · 按数字升序）
            </h3>
            <div class="aca-rule mt-3"></div>
            <div class="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              <div v-for="(e, ei) in result.sorted" :key="ei" class="flex items-baseline gap-2">
                <span class="text-aca-gold">·</span>
                <span class="truncate font-garamond text-aca-ink">{{ e.name }}</span>
                <span class="flex-1 self-center border-b border-dotted border-aca-brown/40"></span>
                <span class="font-playfair italic text-aca-brown">{{ e.number }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 下午茶 -->
      <section v-if="teaOn" class="mb-16">
        <h2 class="font-playfair text-3xl font-bold italic text-aca-ink sm:text-4xl">
          <span class="mr-2 not-italic text-aca-gold">❦</span>下午茶品鉴
        </h2>
        <div class="aca-rule mt-3"></div>
        <p class="mt-4 italic text-aca-brown">每款仅可品评一次，好评率 =（推荐 + 还行）÷ 总票数。{{ period.tea.ratingOpen ? '' : '（评分已结束）' }}</p>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div v-for="(prod, pi) in period.tea.products" :key="prod.id" class="aca-frame bg-aca-panel p-5">
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden border-2 border-aca-ink">
                <img v-if="prod.image" :src="assetUrl(prod.image)" class="h-full w-full object-cover" :alt="prod.name" />
                <div v-else class="grid h-full w-full place-items-center bg-aca-paper text-2xl">🍰</div>
              </div>
              <div class="min-w-0">
                <p class="truncate font-playfair text-lg font-bold italic text-aca-ink">{{ prod.name }}</p>
                <p class="truncate text-sm italic text-aca-brown">{{ prod.desc }}</p>
              </div>
            </div>
            <div class="aca-rule mt-4"></div>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-2.5 flex-1 overflow-hidden border border-aca-brown/40 bg-aca-paper">
                <div class="h-full bg-aca-forest" :style="{ width: prod.ratings.goodRate + '%' }"></div>
              </div>
              <span class="shrink-0 font-playfair text-sm italic text-aca-forest">好评 {{ prod.ratings.goodRate }}%</span>
            </div>
            <p class="mt-2 text-xs italic text-aca-brown">{{ prod.ratings.total }} 票 · 推荐 {{ prod.ratings.good }} · 还行 {{ prod.ratings.ok }} · 不推荐 {{ prod.ratings.bad }}</p>
            <p v-if="teaExtraText(prod)" class="mt-1 font-playfair text-xs italic text-aca-gold">📦 {{ teaExtraText(prod) }}</p>
            <div v-if="period.tea.ratingOpen && !votedProducts[prod.id]" class="mt-4 grid grid-cols-3 gap-2">
              <button v-for="lv in TEA_LEVELS" :key="lv.key" :disabled="ratingBusy[prod.id]" @click="doRate(prod.id, lv.key)"
                class="border-2 border-aca-ink bg-transparent py-2 text-sm text-aca-ink transition-colors hover:bg-aca-ink hover:text-aca-paper disabled:opacity-50">
                {{ lv.emoji }} {{ lv.label }}
              </button>
            </div>
            <p v-else-if="votedProducts[prod.id]" class="mt-4 border-2 border-aca-burgundy py-2 text-center font-playfair text-sm italic text-aca-burgundy">✓ 已品鉴</p>
            <p v-else class="mt-4 border border-dashed border-aca-brown/50 py-2 text-center text-sm italic text-aca-brown">评分已结束</p>
          </div>
        </div>
      </section>

      <!-- ④ 规则 · 书页正文 -->
      <section class="mb-12">
        <h2 class="font-playfair text-3xl font-bold italic text-aca-ink sm:text-4xl">
          <span class="mr-2 not-italic text-aca-gold">§</span>规则
        </h2>
        <div class="aca-rule mt-3"></div>
        <div class="aca-frame mt-6 bg-aca-panel p-7 sm:p-9">
          <p class="font-playfair text-xl font-bold italic text-aca-burgundy">抽奖规则</p>
          <p class="aca-dropcap mt-3 whitespace-pre-line leading-relaxed text-aca-ink">{{ config.rulesLottery }}</p>
          <div class="aca-rule my-7"></div>
          <p class="font-playfair text-xl font-bold italic text-aca-forest">下午茶评分规则</p>
          <p class="aca-dropcap mt-3 whitespace-pre-line leading-relaxed text-aca-ink">{{ config.rulesTea }}</p>
        </div>
      </section>

      <footer class="py-10 text-center">
        <div class="mx-auto mb-4 max-w-xs"><div class="aca-rule"></div></div>
        <p class="font-playfair italic tracking-[0.2em] text-aca-brown">{{ config.siteName }} · 第 {{ period.id }} 卷 · ❦</p>
      </footer>
    </div>
  </div>
</template>

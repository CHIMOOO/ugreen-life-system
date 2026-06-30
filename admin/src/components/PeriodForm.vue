<script setup>
import { reactive, ref, watch, computed, onMounted } from 'vue';
import { admin, assetUrl, STYLE_OPTIONS } from '../api.js';

const props = defineProps({ period: { type: Object, default: null } });
const emit = defineEmits(['saved']);

const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const defaultPrizeName = (i) => (i < 10 ? `${CN[i]}等奖` : `第${i + 1}等奖`);

const library = ref([]);
const f = reactive(blank());
const saving = ref(false);
const error = ref('');
const isNew = computed(() => !props.period?.id);

function blank() {
  return {
    title: '', style: 'style1', lotteryEnabled: true, teaEnabled: false,
    teaRatingHours: 24, prizes: [{ name: '', qty: 1, image: null }], productIds: [],
  };
}
function loadFrom(p) {
  Object.assign(f, blank());
  if (!p) return;
  f.title = p.title || '';
  f.style = p.style || 'style1';
  f.lotteryEnabled = !!p.lotteryEnabled;
  f.teaEnabled = !!p.teaEnabled;
  f.teaRatingHours = p.tea?.ratingHours || 24;
  f.productIds = Array.isArray(p.productIds) ? [...p.productIds] : [];
  f.prizes = (p.prizes?.length ? p.prizes : [{ name: '', qty: 1, image: null }]).map((z) => ({
    name: z.name || '', qty: z.qty || 1, image: z.image || null,
  }));
}

onMounted(async () => {
  const { data } = await admin.products();
  if (Array.isArray(data)) library.value = data;
});
watch(() => props.period?.id, () => loadFrom(props.period), { immediate: true });

function addPrize() { f.prizes.push({ name: '', qty: 1, image: null }); }
function removePrize(i) { f.prizes.splice(i, 1); if (!f.prizes.length) addPrize(); }
function toggleProduct(id) {
  const i = f.productIds.indexOf(id);
  if (i >= 0) f.productIds.splice(i, 1); else f.productIds.push(id);
}
async function pickImage(e, onUrl) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const { ok, data } = await admin.upload(file);
  if (ok && data?.url) onUrl(data.url); else error.value = '图片上传失败';
}
async function save() {
  error.value = '';
  if (!f.title.trim()) { error.value = '请填写期数标题'; return; }
  saving.value = true;
  const payload = {
    title: f.title.trim(), style: f.style,
    lotteryEnabled: f.lotteryEnabled, teaEnabled: f.teaEnabled,
    teaRatingHours: Number(f.teaRatingHours) || 24,
    prizes: f.prizes.map((z) => ({ name: z.name, qty: Number(z.qty) || 1, image: z.image })),
    productIds: f.productIds,
  };
  const res = isNew.value ? await admin.create(payload) : await admin.update(props.period.id, payload);
  saving.value = false;
  if (res.ok && res.data?.id) emit('saved', res.data);
  else error.value = '保存失败';
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 class="text-lg font-bold text-slate-800">{{ isNew ? '新建期数' : `编辑：${props.period.title}` }}</h2>

    <div class="mt-5 grid gap-5 md:grid-cols-2">
      <label class="block">
        <span class="text-sm font-medium text-slate-600">期数标题</span>
        <input v-model="f.title" type="text" placeholder="例如：第四期 · 春日抽奖" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-slate-600">页面模板（style）</span>
        <select v-model="f.style" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500">
          <option v-for="s in STYLE_OPTIONS" :key="s.v" :value="s.v">{{ s.label }}</option>
        </select>
      </label>
    </div>

    <div class="mt-5 flex flex-wrap gap-6">
      <label class="inline-flex items-center gap-2">
        <input v-model="f.lotteryEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
        <span class="text-sm font-medium text-slate-700">开启抽奖</span>
      </label>
      <label class="inline-flex items-center gap-2">
        <input v-model="f.teaEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
        <span class="text-sm font-medium text-slate-700">开启下午茶评分</span>
      </label>
    </div>

    <!-- 奖品 -->
    <div v-if="f.lotteryEnabled" class="mt-6">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">奖品设置</h3>
        <button @click="addPrize" class="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200">+ 添加奖品</button>
      </div>
      <p class="mt-1 text-xs text-slate-400">名称留空默认「一等奖、二等奖…」；图片可传可不传。</p>
      <div class="mt-3 space-y-3">
        <div v-for="(z, i) in f.prizes" :key="i" class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img v-if="z.image" :src="assetUrl(z.image)" class="h-full w-full object-cover" alt="" />
            <div v-else class="grid h-full w-full place-items-center text-xl text-slate-300">🎁</div>
          </div>
          <input v-model="z.name" type="text" :placeholder="defaultPrizeName(i)" class="min-w-[140px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <div class="flex items-center gap-1">
            <span class="text-xs text-slate-500">数量</span>
            <input v-model="z.qty" type="number" min="1" class="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <label class="cursor-pointer rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-600 ring-1 ring-slate-200 hover:bg-indigo-50">
            上传图<input type="file" accept="image/*" class="hidden" @change="(e) => pickImage(e, (url) => (z.image = url))" />
          </label>
          <button v-if="z.image" @click="z.image = null" class="text-sm text-slate-400 hover:text-rose-500">清除图</button>
          <button @click="removePrize(i)" class="text-sm text-rose-500 hover:text-rose-700">删除</button>
        </div>
      </div>
    </div>

    <!-- 下午茶 -->
    <div v-if="f.teaEnabled" class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 class="text-sm font-semibold text-amber-800">🍰 下午茶设置</h3>
      <label class="mt-3 block max-w-xs">
        <span class="text-sm font-medium text-slate-600">评分有效时长（小时）</span>
        <input v-model="f.teaRatingHours" type="number" min="1" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-amber-500" />
      </label>

      <p class="mt-4 text-sm font-medium text-slate-600">本期录入的下午茶商品（从商品库勾选）</p>
      <p v-if="library.length === 0" class="mt-1 text-sm text-slate-400">商品库为空，请先到「商品库」添加。</p>
      <div class="mt-2 grid gap-2 sm:grid-cols-2">
        <label v-for="p in library" :key="p.id"
          class="flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-2.5 transition"
          :class="f.productIds.includes(p.id) ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'">
          <input type="checkbox" :checked="f.productIds.includes(p.id)" @change="toggleProduct(p.id)" class="h-4 w-4 rounded accent-amber-500" />
          <div class="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            <img v-if="p.image" :src="assetUrl(p.image)" class="h-full w-full object-cover" alt="" />
            <div v-else class="grid h-full w-full place-items-center text-sm text-slate-300">🍰</div>
          </div>
          <span class="truncate text-sm font-medium text-slate-700">{{ p.name }}</span>
        </label>
      </div>
      <p class="mt-2 text-xs text-amber-600">提示：保存后评分有效期从当前时间起重新计算。</p>
    </div>

    <p v-if="error" class="mt-4 text-sm font-medium text-rose-600">{{ error }}</p>
    <div class="mt-6">
      <button @click="save" :disabled="saving" class="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
        {{ saving ? '保存中…' : isNew ? '创建期数' : '保存修改' }}
      </button>
    </div>
  </div>
</template>

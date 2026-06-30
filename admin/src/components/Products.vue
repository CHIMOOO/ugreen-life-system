<script setup>
import { ref, reactive, onMounted } from 'vue';
import { admin, assetUrl } from '../api.js';

const products = ref([]);
const editing = reactive({ id: null, name: '', image: null, desc: '', channel: '', price: '', qty: '' });
const saving = ref(false);

async function load() {
  const { data } = await admin.products();
  if (Array.isArray(data)) products.value = data;
}
onMounted(load);

function startNew() {
  editing.id = null; editing.name = ''; editing.image = null; editing.desc = '';
  editing.channel = ''; editing.price = ''; editing.qty = '';
}
function startEdit(p) {
  editing.id = p.id; editing.name = p.name; editing.image = p.image; editing.desc = p.desc;
  editing.channel = p.channel || ''; editing.price = p.price || ''; editing.qty = p.qty ?? '';
}
async function pickImage(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const { ok, data } = await admin.upload(file);
  if (ok && data?.url) editing.image = data.url;
}
async function save() {
  if (!editing.name.trim()) return;
  saving.value = true;
  const body = {
    name: editing.name.trim(), image: editing.image, desc: editing.desc,
    channel: editing.channel, price: editing.price, qty: editing.qty === '' ? null : editing.qty,
  };
  if (editing.id) await admin.updateProduct(editing.id, body);
  else await admin.createProduct(body);
  saving.value = false;
  startNew();
  await load();
}
async function remove(p) {
  if (!confirm(`删除商品「${p.name}」？相关评分也会一并删除。`)) return;
  await admin.deleteProduct(p.id);
  if (editing.id === p.id) startNew();
  await load();
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1fr_340px]">
    <!-- 列表 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-bold text-slate-800">下午茶商品库</h2>
      <p class="mt-1 text-sm text-slate-500">全局商品库，每一期可从中挑选录入。下方统计为该商品历期累计。</p>

      <div class="mt-4 space-y-3">
        <div v-for="p in products" :key="p.id" class="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-3">
          <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <img v-if="p.image" :src="assetUrl(p.image)" class="h-full w-full object-cover" alt="" />
            <div v-else class="grid h-full w-full place-items-center text-xl text-slate-300">🍰</div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-slate-800">{{ p.name }}</p>
            <p class="truncate text-sm text-slate-400">{{ p.desc || '—' }}</p>
            <p v-if="p.channel || p.price !== '' || p.qty !== ''" class="mt-0.5 text-xs text-slate-400">
              <span v-if="p.channel">渠道：{{ p.channel }}</span>
              <span v-if="p.price !== '' && p.price != null"> · ¥{{ p.price }}</span>
              <span v-if="p.qty !== '' && p.qty != null"> · 数量 {{ p.qty }}</span>
            </p>
          </div>
          <div class="text-right text-sm">
            <p class="font-semibold text-emerald-600">好评 {{ p.stats.goodRate }}%</p>
            <p class="text-slate-400">{{ p.stats.total }} 票</p>
          </div>
          <div class="flex gap-2">
            <button @click="startEdit(p)" class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200">编辑</button>
            <button @click="remove(p)" class="rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100">删除</button>
          </div>
        </div>
        <p v-if="products.length === 0" class="text-sm text-slate-400">商品库为空，右侧添加。</p>
      </div>
    </div>

    <!-- 编辑卡 -->
    <div class="h-fit rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="font-bold text-slate-800">{{ editing.id ? '编辑商品' : '新增商品' }}</h3>
      <label class="mt-4 block">
        <span class="text-sm font-medium text-slate-600">名称</span>
        <input v-model="editing.name" type="text" placeholder="例如：提拉米苏" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" />
      </label>
      <label class="mt-3 block">
        <span class="text-sm font-medium text-slate-600">描述</span>
        <textarea v-model="editing.desc" rows="2" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"></textarea>
      </label>

      <div class="mt-3 rounded-xl bg-slate-50 p-3">
        <p class="text-xs font-semibold text-slate-500">内部信息（默认不对用户开放，可在「系统设置」统一开启展示，均非必填）</p>
        <label class="mt-2 block">
          <span class="text-xs text-slate-500">录入渠道</span>
          <input v-model="editing.channel" type="text" placeholder="例如：楼下甜品店 / 美团" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500" />
        </label>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label class="block">
            <span class="text-xs text-slate-500">价格</span>
            <input v-model="editing.price" type="text" placeholder="例如：32" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500" />
          </label>
          <label class="block">
            <span class="text-xs text-slate-500">数量</span>
            <input v-model="editing.qty" type="number" min="0" placeholder="例如：10" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500" />
          </label>
        </div>
      </div>

      <div class="mt-3 flex items-center gap-3">
        <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <img v-if="editing.image" :src="assetUrl(editing.image)" class="h-full w-full object-cover" alt="" />
          <div v-else class="grid h-full w-full place-items-center text-xl text-slate-300">🍰</div>
        </div>
        <label class="cursor-pointer rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-600 ring-1 ring-slate-200 hover:bg-indigo-50">
          上传图片
          <input type="file" accept="image/*" class="hidden" @change="pickImage" />
        </label>
        <button v-if="editing.image" @click="editing.image = null" class="text-sm text-slate-400 hover:text-rose-500">清除</button>
      </div>
      <div class="mt-5 flex gap-3">
        <button @click="save" :disabled="saving || !editing.name.trim()" class="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
          {{ saving ? '保存中…' : editing.id ? '保存' : '添加' }}
        </button>
        <button v-if="editing.id" @click="startNew" class="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-200">取消编辑</button>
      </div>
    </div>
  </div>
</template>

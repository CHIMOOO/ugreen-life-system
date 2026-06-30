<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { admin } from '../api.js';

const ledger = ref({ items: [], income: 0, expense: 0, balance: 0, advance: 0 });
const periods = ref([]);
const saving = ref(false);
const error = ref('');
const editing = reactive(blank());

function blank() {
  return { id: null, date: today(), title: '', kind: 'expense', amount: '', note: '', periodId: '' };
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

async function load() {
  const [l, p] = await Promise.all([admin.bills(), admin.list()]);
  if (l.data) ledger.value = l.data;
  if (Array.isArray(p.data)) periods.value = p.data;
}
onMounted(load);

const periodTitle = computed(() => Object.fromEntries(periods.value.map((p) => [p.id, p.title])));

const PER = 10;
const page = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(ledger.value.items.length / PER)));
const pagedItems = computed(() => ledger.value.items.slice((page.value - 1) * PER, page.value * PER));

function startNew() {
  Object.assign(editing, blank());
}
function startEdit(b) {
  Object.assign(editing, { id: b.id, date: b.date, title: b.title, kind: b.kind, amount: b.amount, note: b.note, periodId: b.periodId ?? '' });
}
async function autoFill() {
  if (!editing.periodId) return;
  const { data } = await admin.billAuto(editing.periodId);
  if (data) editing.amount = data.total;
}
async function save() {
  error.value = '';
  if (!editing.title.trim()) { error.value = '请填写账单标题'; return; }
  saving.value = true;
  const body = {
    date: editing.date, title: editing.title.trim(), kind: editing.kind,
    amount: editing.amount, note: editing.note, periodId: editing.periodId || null,
  };
  const res = editing.id ? await admin.updateBill(editing.id, body) : await admin.createBill(body);
  saving.value = false;
  if (res.ok && res.data) { ledger.value = res.data; startNew(); }
  else error.value = '保存失败';
}
async function remove(b) {
  if (!confirm(`删除账单「${b.title}」？`)) return;
  const res = await admin.deleteBill(b.id);
  if (res.ok && res.data) { ledger.value = res.data; if (editing.id === b.id) startNew(); }
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1fr_340px]">
    <div class="space-y-6">
      <!-- 结余 -->
      <div class="grid gap-4 sm:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">当前结余</p>
          <p class="mt-1 text-2xl font-bold" :class="ledger.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'">¥{{ ledger.balance }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">累计收入</p>
          <p class="mt-1 text-2xl font-bold text-emerald-600">+¥{{ ledger.income }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">累计支出</p>
          <p class="mt-1 text-2xl font-bold text-rose-600">−¥{{ ledger.expense }}</p>
        </div>
        <div class="rounded-2xl border p-4" :class="ledger.advance > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">当前垫付</p>
          <p class="mt-1 text-2xl font-bold text-amber-600">¥{{ ledger.advance }}</p>
        </div>
      </div>

      <!-- 流水 -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 class="font-bold text-slate-800">流水明细</h3>
        <div class="mt-3 space-y-2">
          <div v-for="b in pagedItems" :key="b.id" class="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span class="w-24 shrink-0 text-sm text-slate-400">{{ b.date }}</span>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-800">{{ b.title }}</p>
              <p v-if="b.note || b.periodId" class="text-xs text-slate-400">
                <span v-if="b.note">{{ b.note }}</span>
                <span v-if="b.periodId && periodTitle[b.periodId]"> · 关联 {{ periodTitle[b.periodId] }}</span>
              </p>
            </div>
            <span class="shrink-0 font-bold" :class="b.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'">{{ b.kind === 'income' ? '+' : '−' }}¥{{ b.amount }}</span>
            <button @click="startEdit(b)" class="rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-200">编辑</button>
            <button @click="remove(b)" class="rounded-lg bg-rose-50 px-2.5 py-1 text-sm text-rose-600 hover:bg-rose-100">删除</button>
          </div>
          <p v-if="ledger.items.length === 0" class="text-sm text-slate-400">还没有账单记录。</p>
        </div>
        <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-3">
          <button :disabled="page <= 1" @click="page--" class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40">← 上一页</button>
          <span class="text-sm text-slate-500">第 {{ page }} / {{ totalPages }} 页</span>
          <button :disabled="page >= totalPages" @click="page++" class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40">下一页 →</button>
        </div>
      </div>
    </div>

    <!-- 录入 -->
    <div class="h-fit rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="font-bold text-slate-800">{{ editing.id ? '编辑账单' : '新增账单' }}</h3>
      <div class="mt-4 space-y-3">
        <label class="block">
          <span class="text-sm font-medium text-slate-600">日期</span>
          <input v-model="editing.date" type="date" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-slate-600">标题</span>
          <input v-model="editing.title" type="text" placeholder="例如：第一期下午茶采购" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-sm font-medium text-slate-600">类型</span>
            <select v-model="editing.kind" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500">
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </label>
          <label class="block">
            <span class="text-sm font-medium text-slate-600">金额 ¥</span>
            <input v-model="editing.amount" type="number" step="0.01" min="0" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" />
          </label>
        </div>
        <label class="block">
          <span class="text-sm font-medium text-slate-600">关联期数（可选）</span>
          <select v-model="editing.periodId" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500">
            <option value="">不关联</option>
            <option v-for="p in periods" :key="p.id" :value="p.id">#{{ p.id }} {{ p.title }}</option>
          </select>
        </label>
        <button v-if="editing.periodId" @click="autoFill" class="w-full rounded-xl bg-sky-50 py-2 text-sm font-medium text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100">⚙ 按本期商品实际金额自动填入</button>
        <label class="block">
          <span class="text-sm font-medium text-slate-600">备注</span>
          <textarea v-model="editing.note" rows="2" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"></textarea>
        </label>
        <p v-if="error" class="text-sm font-medium text-rose-600">{{ error }}</p>
        <div class="flex gap-3">
          <button @click="save" :disabled="saving" class="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">{{ saving ? '保存中…' : editing.id ? '保存' : '添加' }}</button>
          <button v-if="editing.id" @click="startNew" class="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-200">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

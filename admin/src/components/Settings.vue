<script setup>
import { reactive, ref, onMounted } from 'vue';
import { admin, STYLE_OPTIONS } from '../api.js';

const f = reactive({
  departmentName: '', siteName: '', homeStyleMode: 'follow', homeFixedStyle: 'style1',
  lotteryModuleEnabled: true, teaModuleEnabled: true,
  billModuleEnabled: true, periodBillShow: true,
  namePlaceholder: '', teaShowChannel: false, teaShowPrice: false, teaShowQty: false,
  rulesLottery: '', rulesTea: '',
});
const saving = ref(false);
const saved = ref(false);

onMounted(async () => {
  const { data } = await admin.getConfig();
  if (data) Object.assign(f, data);
});

async function save() {
  saving.value = true;
  saved.value = false;
  const { ok } = await admin.saveConfig({ ...f });
  saving.value = false;
  if (ok) { saved.value = true; setTimeout(() => (saved.value = false), 2000); }
}

async function restoreRules() {
  const { data } = await admin.configDefaults();
  if (data) { f.rulesLottery = data.rulesLottery; f.rulesTea = data.rulesTea; }
}

const importMsg = ref('');
async function exportData() {
  const { data } = await admin.exportData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `生活系统数据备份-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
async function importData(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (!confirm('导入会用备份文件覆盖当前所有数据（设置/期数/商品/账单/用户等），不可恢复，确认？')) return;
  importMsg.value = '导入中…';
  try {
    const json = JSON.parse(await file.text());
    const { ok, data } = await admin.importData(json);
    if (ok) {
      importMsg.value = '✓ 导入成功，即将刷新…';
      setTimeout(() => location.reload(), 900);
    } else {
      importMsg.value = '导入失败：' + (data?.error || '');
    }
  } catch {
    importMsg.value = '文件解析失败，请确认是导出的 JSON';
  }
}

const MODES = [
  { v: 'follow', label: '跟随当期（用当前期自己选的风格）' },
  { v: 'random', label: '随机（每次进入随机一种风格）' },
  { v: 'fixed', label: '固定（始终用下面指定的风格）' },
];
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 class="text-lg font-bold text-slate-800">系统设置</h2>
    <p class="mt-1 text-sm text-slate-500">部门名 / 站点名等均从这里配置，便于其他部门复用整套系统。</p>

    <div class="mt-6 grid gap-5 md:grid-cols-2">
      <label class="block">
        <span class="text-sm font-medium text-slate-600">部门名称（变量）</span>
        <input v-model="f.departmentName" type="text" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-slate-600">系统名称</span>
        <input v-model="f.siteName" type="text" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" />
      </label>
    </div>

    <div class="mt-5 rounded-xl bg-slate-50 p-4">
      <p class="text-sm font-semibold text-slate-700">模块开关（系统级，影响主页与所有期数）</p>
      <p class="mt-0.5 text-xs text-slate-500">关闭后用户彻底看不到相关内容（含规则）。期数也可单独开关，最终展示 = 系统级 且 期数级 都开启。</p>
      <div class="mt-3 flex flex-wrap gap-6">
        <label class="inline-flex items-center gap-2">
          <input v-model="f.lotteryModuleEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">开放抽奖模块</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input v-model="f.teaModuleEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">开放下午茶评分模块</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input v-model="f.billModuleEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">首页显示总账单模块</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input v-model="f.periodBillShow" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">默认显示本期账单</span>
        </label>
      </div>
    </div>

    <div class="mt-5 grid gap-5 md:grid-cols-2">
      <label class="block">
        <span class="text-sm font-medium text-slate-600">首页风格模式</span>
        <select v-model="f.homeStyleMode" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500">
          <option v-for="m in MODES" :key="m.v" :value="m.v">{{ m.label }}</option>
        </select>
      </label>
      <label class="block" :class="f.homeStyleMode === 'fixed' ? '' : 'opacity-40'">
        <span class="text-sm font-medium text-slate-600">固定风格（模式为「固定」时生效）</span>
        <select v-model="f.homeFixedStyle" :disabled="f.homeStyleMode !== 'fixed'" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500">
          <option v-for="s in STYLE_OPTIONS" :key="s.v" :value="s.v">{{ s.label }}</option>
        </select>
      </label>
    </div>

    <div class="mt-5 rounded-xl bg-violet-50 p-4">
      <p class="text-sm font-semibold text-violet-800">🎉 趣味设置</p>
      <label class="mt-2 block max-w-md">
        <span class="text-sm font-medium text-slate-600">抽奖姓名输入框的占位提示</span>
        <input v-model="f.namePlaceholder" type="text" placeholder="例如：陈老板" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-violet-500" />
      </label>
    </div>

    <div class="mt-5 rounded-xl bg-amber-50 p-4">
      <p class="text-sm font-semibold text-amber-800">下午茶商品内部信息 · 对用户展示（逐项控制）</p>
      <p class="mt-0.5 text-xs text-slate-500">分别勾选要在前台商品卡展示的字段；不勾选则仅后台可见。对所有商品统一生效。</p>
      <div class="mt-3 flex flex-wrap gap-6">
        <label class="inline-flex items-center gap-2">
          <input v-model="f.teaShowChannel" type="checkbox" class="h-4 w-4 rounded accent-amber-500" />
          <span class="text-sm font-medium text-slate-700">录入渠道</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input v-model="f.teaShowPrice" type="checkbox" class="h-4 w-4 rounded accent-amber-500" />
          <span class="text-sm font-medium text-slate-700">价格</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input v-model="f.teaShowQty" type="checkbox" class="h-4 w-4 rounded accent-amber-500" />
          <span class="text-sm font-medium text-slate-700">数量</span>
        </label>
      </div>
    </div>

    <div class="mt-5 flex items-center justify-between">
      <span class="text-sm font-semibold text-slate-700">规则文案</span>
      <button @click="restoreRules" class="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200">↺ 恢复服务器默认文案</button>
    </div>
    <label class="mt-2 block">
      <span class="text-sm font-medium text-slate-600">抽奖规则文案</span>
      <textarea v-model="f.rulesLottery" rows="4" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"></textarea>
    </label>
    <label class="mt-4 block">
      <span class="text-sm font-medium text-slate-600">下午茶评分规则文案</span>
      <textarea v-model="f.rulesTea" rows="3" class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"></textarea>
    </label>

    <div class="mt-6 rounded-xl bg-slate-50 p-4">
      <p class="text-sm font-semibold text-slate-700">数据备份</p>
      <p class="mt-0.5 text-xs text-slate-500">导出全部后台数据（设置 / 期数 / 商品 / 账单 / 用户 / 指纹等）为 JSON；导入会覆盖现有数据。</p>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button @click="exportData" class="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white transition hover:bg-emerald-700">⬇ 导出数据</button>
        <label class="cursor-pointer rounded-xl bg-white px-5 py-2 font-semibold text-indigo-600 ring-1 ring-slate-200 hover:bg-indigo-50">
          ⬆ 导入数据
          <input type="file" accept="application/json,.json" class="hidden" @change="importData" />
        </label>
        <span v-if="importMsg" class="text-sm font-medium text-slate-600">{{ importMsg }}</span>
      </div>
    </div>

    <div class="mt-6 flex items-center gap-3">
      <button @click="save" :disabled="saving" class="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
        {{ saving ? '保存中…' : '保存设置' }}
      </button>
      <span v-if="saved" class="text-sm font-medium text-emerald-600">✓ 已保存</span>
    </div>
  </div>
</template>

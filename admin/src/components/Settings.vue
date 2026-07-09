<script setup>
import { reactive, ref, onMounted } from 'vue';
import { admin, STYLE_OPTIONS, setToken } from '../api.js';

const f = reactive({
  departmentName: '', siteName: '', homeStyleMode: 'follow', homeFixedStyle: 'style1',
  randomThemeTtl: 0,
  lotteryModuleEnabled: true, teaModuleEnabled: true,
  billModuleEnabled: true, periodBillShow: true,
  namePlaceholder: '', teaShowChannel: false, teaShowPrice: false, teaShowQty: false,
  imageQuality: 90,
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

// ---- 修改管理员密码 ----
const pw = reactive({ old: '', next: '', confirm: '' });
const pwBusy = ref(false);
const pwMsg = ref(''); // { type: 'ok'|'err', text }
const pwMsgType = ref('ok');
async function changePassword() {
  pwMsg.value = '';
  if (!pw.old) { pwMsgType.value = 'err'; pwMsg.value = '请输入当前密码'; return; }
  if (pw.next.length < 4) { pwMsgType.value = 'err'; pwMsg.value = '新密码至少 4 位'; return; }
  if (pw.next !== pw.confirm) { pwMsgType.value = 'err'; pwMsg.value = '两次输入的新密码不一致'; return; }
  if (pw.next === pw.old) { pwMsgType.value = 'err'; pwMsg.value = '新密码不能与当前密码相同'; return; }
  pwBusy.value = true;
  const { ok, data } = await admin.changePassword(pw.old, pw.next);
  pwBusy.value = false;
  if (ok && data?.token) {
    setToken(data.token); // 用新凭据更新本地 token，保持登录态（旧 token 已失效）
    pw.old = pw.next = pw.confirm = '';
    pwMsgType.value = 'ok';
    pwMsg.value = '✓ 密码已修改，下次登录请用新密码';
  } else {
    pwMsgType.value = 'err';
    const map = {
      bad_old_password: '当前密码不正确',
      same_password: '新密码不能与当前密码相同',
      bad_new_password: '新密码无效',
    };
    pwMsg.value = map[data?.error] || '修改失败，请稍后重试';
  }
}

const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
</script>

<template>
  <div class="space-y-5 pb-4">
    <!-- 顶部标题 + 保存（粘顶，分层清晰） -->
    <div class="sticky top-16 z-10 -mx-6 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-3 backdrop-blur">
      <div>
        <h2 class="text-lg font-bold text-slate-800">系统设置</h2>
        <p class="text-xs text-slate-500">按分组管理；改完点右侧保存。换部门时只改这里即可复用整套系统。</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="saved" class="text-sm font-medium text-emerald-600">✓ 已保存</span>
        <button @click="save" :disabled="saving" class="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">{{ saving ? '保存中…' : '保存设置' }}</button>
      </div>
    </div>

    <!-- ① 基础信息 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">① 基础信息</h3>
      <div class="mt-4 grid gap-5 md:grid-cols-2">
        <label class="block">
          <span class="text-sm font-medium text-slate-600">部门名称（变量）</span>
          <input v-model="f.departmentName" type="text" :class="inputCls" />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-slate-600">系统名称</span>
          <input v-model="f.siteName" type="text" :class="inputCls" />
        </label>
      </div>
    </section>

    <!-- ② 首页与风格 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">② 首页与风格</h3>
      <div class="mt-4 grid gap-5 md:grid-cols-2">
        <label class="block">
          <span class="text-sm font-medium text-slate-600">首页风格模式</span>
          <select v-model="f.homeStyleMode" :class="inputCls">
            <option v-for="m in MODES" :key="m.v" :value="m.v">{{ m.label }}</option>
          </select>
        </label>
        <label class="block" :class="f.homeStyleMode === 'fixed' ? '' : 'opacity-40'">
          <span class="text-sm font-medium text-slate-600">固定风格（模式为「固定」时生效）</span>
          <select v-model="f.homeFixedStyle" :disabled="f.homeStyleMode !== 'fixed'" :class="inputCls">
            <option v-for="s in STYLE_OPTIONS" :key="s.v" :value="s.v">{{ s.label }}</option>
          </select>
        </label>
      </div>
      <label class="mt-5 block max-w-md">
        <span class="text-sm font-medium text-slate-600">随机主题缓存时长（分钟）</span>
        <div class="mt-2 flex items-center gap-3">
          <input v-model.number="f.randomThemeTtl" type="number" min="0" max="10080" step="1"
            class="w-28 rounded-xl border border-slate-300 px-3 py-2 text-center outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          <span class="text-sm text-slate-500">分钟</span>
        </div>
        <p class="mt-1.5 text-xs text-slate-500">
          <b class="text-slate-600">&gt; 0</b> 时：所有人在该时长内看到<b class="text-slate-600">同一个</b>随机主题（即固定的当前主题），过期后自动换一个。
          <b class="text-slate-600">0</b> = 每次进入都重新随机。对「随机」风格生效——包括首页模式设为随机、或某一期风格设为随机。
        </p>
      </label>
    </section>

    <!-- ③ 模块开关 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">③ 模块开关（系统级，影响主页与所有期数）</h3>
      <p class="mt-0.5 text-xs text-slate-500">关闭后用户彻底看不到相关内容（含规则）。期数可再单独开关，最终展示 = 系统级 且 期数级。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <input v-model="f.lotteryModuleEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">开放抽奖模块</span>
        </label>
        <label class="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <input v-model="f.teaModuleEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">开放下午茶评分模块</span>
        </label>
        <label class="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <input v-model="f.billModuleEnabled" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">首页显示总账单模块</span>
        </label>
        <label class="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <input v-model="f.periodBillShow" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          <span class="text-sm font-medium text-slate-700">默认显示本期账单</span>
        </label>
      </div>
    </section>

    <!-- ④ 下午茶商品展示 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">④ 下午茶商品内部信息 · 对用户展示</h3>
      <p class="mt-0.5 text-xs text-slate-500">逐项勾选要在前台商品卡展示的字段；不勾选则仅后台可见。对所有商品统一生效。</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <label class="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
          <input v-model="f.teaShowChannel" type="checkbox" class="h-4 w-4 rounded accent-amber-500" />
          <span class="text-sm font-medium text-slate-700">录入渠道</span>
        </label>
        <label class="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
          <input v-model="f.teaShowPrice" type="checkbox" class="h-4 w-4 rounded accent-amber-500" />
          <span class="text-sm font-medium text-slate-700">价格</span>
        </label>
        <label class="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
          <input v-model="f.teaShowQty" type="checkbox" class="h-4 w-4 rounded accent-amber-500" />
          <span class="text-sm font-medium text-slate-700">数量</span>
        </label>
      </div>
    </section>

    <!-- ⑤ 图片上传 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">⑤ 图片上传</h3>
      <p class="mt-0.5 text-xs text-slate-500">后台上传的图片会自动转成体积最小的 WebP 格式。下面是压缩质量：越高越清晰、体积越大；越低越省空间、越糊。推荐 80–90。</p>
      <label class="mt-4 block max-w-md">
        <span class="text-sm font-medium text-slate-600">压缩质量（1–100，默认 90）</span>
        <div class="mt-2 flex items-center gap-4">
          <input v-model.number="f.imageQuality" type="range" min="1" max="100" class="h-2 flex-1 accent-indigo-600" />
          <input v-model.number="f.imageQuality" type="number" min="1" max="100" class="w-20 rounded-xl border border-slate-300 px-3 py-2 text-center outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </div>
      </label>
    </section>

    <!-- ⑥ 趣味设置 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">⑥ 趣味设置</h3>
      <label class="mt-4 block max-w-md">
        <span class="text-sm font-medium text-slate-600">抽奖姓名输入框的占位提示</span>
        <input v-model="f.namePlaceholder" type="text" placeholder="例如：陈老板" :class="inputCls" />
      </label>
    </section>

    <!-- ⑥ 规则文案 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-800">⑦ 规则文案</h3>
        <button @click="restoreRules" class="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200">↺ 恢复服务器默认</button>
      </div>
      <label class="mt-4 block">
        <span class="text-sm font-medium text-slate-600">抽奖规则文案</span>
        <textarea v-model="f.rulesLottery" rows="4" :class="inputCls"></textarea>
      </label>
      <label class="mt-4 block">
        <span class="text-sm font-medium text-slate-600">下午茶评分规则文案</span>
        <textarea v-model="f.rulesTea" rows="3" :class="inputCls"></textarea>
      </label>
    </section>

    <!-- ⑦ 数据备份 -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">⑧ 数据备份</h3>
      <p class="mt-0.5 text-xs text-slate-500">导出全部后台数据（设置 / 期数 / 商品 / 账单 / 用户 / 指纹等）为 JSON；导入会覆盖现有数据。</p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button @click="exportData" class="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white transition hover:bg-emerald-700">⬇ 导出数据</button>
        <label class="cursor-pointer rounded-xl bg-white px-5 py-2 font-semibold text-indigo-600 ring-1 ring-slate-200 hover:bg-indigo-50">
          ⬆ 导入数据
          <input type="file" accept="application/json,.json" class="hidden" @change="importData" />
        </label>
        <span v-if="importMsg" class="text-sm font-medium text-slate-600">{{ importMsg }}</span>
      </div>
    </section>

    <!-- ⑨ 修改管理员密码（独立操作：需验证当前密码，不随「保存设置」一起提交） -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 class="text-base font-bold text-slate-800">⑨ 修改管理员密码</h3>
      <p class="mt-0.5 text-xs text-slate-500">修改后环境变量里的默认密码即失效，请牢记新密码。密码在本地哈希后再提交，明文不出网。</p>
      <div class="mt-4 grid max-w-md gap-4">
        <label class="block">
          <span class="text-sm font-medium text-slate-600">当前密码</span>
          <input v-model="pw.old" type="password" autocomplete="current-password" :class="inputCls" />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-slate-600">新密码（至少 4 位）</span>
          <input v-model="pw.next" type="password" autocomplete="new-password" :class="inputCls" />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-slate-600">确认新密码</span>
          <input v-model="pw.confirm" type="password" autocomplete="new-password" :class="inputCls" @keyup.enter="changePassword" />
        </label>
        <div class="flex items-center gap-3">
          <button @click="changePassword" :disabled="pwBusy" class="rounded-xl bg-slate-800 px-5 py-2 font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50">{{ pwBusy ? '修改中…' : '修改密码' }}</button>
          <span v-if="pwMsg" class="text-sm font-medium" :class="pwMsgType === 'ok' ? 'text-emerald-600' : 'text-rose-600'">{{ pwMsg }}</span>
        </div>
      </div>
    </section>

    <div class="flex items-center gap-3">
      <button @click="save" :disabled="saving" class="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">{{ saving ? '保存中…' : '保存设置' }}</button>
      <span v-if="saved" class="text-sm font-medium text-emerald-600">✓ 已保存</span>
    </div>
  </div>
</template>

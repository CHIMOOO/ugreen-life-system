<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../api.js';

const users = ref([]);
const selected = ref(null); // 用户详情
const loadingDetail = ref(false);

async function load() {
  const { data } = await admin.users();
  if (Array.isArray(data)) users.value = data;
}
onMounted(load);

async function open(name) {
  loadingDetail.value = true;
  selected.value = null;
  const { data } = await admin.userDetail(name);
  loadingDetail.value = false;
  if (data && !data.error) selected.value = data;
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[300px_1fr]">
    <!-- 用户列表 -->
    <aside class="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 class="font-bold text-slate-800">用户库（{{ users.length }}）</h3>
      <p class="mt-0.5 text-xs text-slate-400">按姓名聚合，无需账号密码，仅供参考。</p>
      <div class="mt-3 space-y-2">
        <button v-for="u in users" :key="u.name" @click="open(u.name)"
          class="w-full rounded-xl border p-3 text-left transition hover:border-indigo-300"
          :class="selected?.name === u.name ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'">
          <p class="font-semibold text-slate-800">{{ u.name }}</p>
          <div class="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>🎲 抽奖 {{ u.lotteryCount }}</span>
            <span>🍰 评分 {{ u.ratingCount }}</span>
            <span>🔎 指纹 {{ u.fpCount }}</span>
          </div>
        </button>
        <p v-if="users.length === 0" class="text-sm text-slate-400">还没有用户记录。</p>
      </div>
    </aside>

    <!-- 用户详情 -->
    <main>
      <div v-if="!selected && !loadingDetail" class="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-400">选择左侧用户查看各模块信息</div>
      <div v-else-if="loadingDetail" class="grid h-64 place-items-center text-slate-400">加载中…</div>
      <div v-else class="space-y-6">
        <h2 class="text-xl font-bold text-slate-800">{{ selected.name }}</h2>

        <!-- 抽奖模块 -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 class="font-bold text-slate-800">🎲 抽奖模块 · 每次抽奖的数字</h3>
          <div v-if="selected.lottery.length" class="mt-3 space-y-2">
            <div v-for="(e, i) in selected.lottery" :key="i" class="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
              <span class="text-slate-600">{{ e.periodTitle || ('期 #' + e.periodId) }}</span>
              <span class="font-mono text-lg font-bold text-indigo-600">{{ e.number }}</span>
            </div>
          </div>
          <p v-else class="mt-2 text-sm text-slate-400">暂无抽奖记录。</p>
        </section>

        <!-- 评分模块 -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 class="font-bold text-slate-800">🍰 评分模块 · 对每个商品的评分次数</h3>
          <div v-if="selected.ratings.length" class="mt-3 flex flex-wrap gap-2">
            <span v-for="(r, i) in selected.ratings" :key="i" class="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 ring-1 ring-amber-200">
              {{ r.product }} · {{ r.count }} 次
            </span>
          </div>
          <p v-else class="mt-2 text-sm text-slate-400">暂无评分记录（评分时需带姓名才会归入用户）。</p>
        </section>

        <!-- 指纹模块 -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 class="font-bold text-slate-800">🔎 指纹模块 · 每次提交的指纹信息</h3>
          <div v-if="selected.fingerprints.length" class="mt-3 space-y-2">
            <div v-for="(f, i) in selected.fingerprints" :key="i" class="rounded-xl bg-slate-50 p-3 text-sm">
              <div class="flex items-center justify-between">
                <span class="rounded px-2 py-0.5 text-xs font-medium"
                  :class="f.kind === 'cancel' ? 'bg-rose-100 text-rose-700' : f.kind === 'rating' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'">
                  {{ f.kind === 'cancel' ? '撤销' : f.kind === 'rating' ? '评分' : '抽奖' }}
                </span>
                <span class="text-xs text-slate-400">{{ (f.createdAt || '').replace('T', ' ').slice(0, 19) }}</span>
              </div>
              <p class="mt-1 break-all font-mono text-xs text-slate-600">{{ f.fp }}</p>
            </div>
          </div>
          <p v-else class="mt-2 text-sm text-slate-400">暂无指纹记录。</p>
        </section>
      </div>
    </main>
  </div>
</template>

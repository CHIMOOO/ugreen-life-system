<script setup>
import { ref } from 'vue';
import { admin, setToken } from '../api.js';

const emit = defineEmits(['login']);
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  if (!password.value) { error.value = '请输入密码'; return; }
  loading.value = true;
  const { ok, data } = await admin.login(password.value);
  loading.value = false;
  if (ok && data?.token) {
    setToken(data.token);
    emit('login');
  } else {
    error.value = data?.error === 'bad_password' ? '密码错误' : '登录失败，请稍后重试';
  }
}
</script>

<template>
  <div class="grid min-h-screen place-items-center px-4">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      <div class="text-center">
        <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl">🎲</div>
        <h1 class="mt-4 text-xl font-bold text-slate-800">抽奖管理后台</h1>
        <p class="mt-1 text-sm text-slate-500">请输入管理密码</p>
      </div>
      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <input
          v-model="password"
          type="password"
          placeholder="管理密码"
          class="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <p v-if="error" class="text-sm font-medium text-rose-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
      <p class="mt-4 text-center text-xs text-slate-400">默认密码 admin123（可用环境变量 ADMIN_PASSWORD 修改）</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { getToken, clearToken } from './api.js';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';

const authed = ref(!!getToken());
function onLogin() {
  authed.value = true;
}
function logout() {
  clearToken();
  authed.value = false;
}
</script>

<template>
  <Login v-if="!authed" @login="onLogin" />
  <Dashboard v-else @logout="logout" />
</template>

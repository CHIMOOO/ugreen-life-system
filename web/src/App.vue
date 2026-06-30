<script setup>
// 每个视图自带完整页面风格（首页/下午茶为粘土风，抽奖子页为各自模板），
// 故根组件只保留路由出口。
</script>

<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
</template>

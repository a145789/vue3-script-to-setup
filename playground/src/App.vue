<script setup lang="ts">
import * as monaco from 'monaco-editor';
import { useDark } from '@vueuse/core';

const isDark = useDark()
watchEffect(() => {
  monaco.editor.setTheme(isDark.value ? 'vitesse-dark' : 'vitesse-light');
})
</script>

<template>
  <div class="flex flex-col h-full">
    <Header class="flex-shrink-0" />
    <div class="flex-1 box-border pt-3px flex">
      <Edit />

      <div class="flex-shrink-0 w-2px bg-[rgba(0,0,0,0.2)] dark:bg-#ddd" />

      <View />
    </div>
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  width: 100%;
}
</style>


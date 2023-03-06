<template>
  <svg :width="`${size}px`" :height="`${size}px`" viewBox="0 0 24 24">
    <g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98" />
      <path d="M15.41 6.51l-6.82 3.98" />
    </g>
  </svg>
</template>

<script lang="ts" setup>
defineProps<{ size: number }>()
</script>

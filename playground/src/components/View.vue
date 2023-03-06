<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
const { code: originCode, codeType, propsNotOnlyTs } = useUrlKeepParams()

const output = {
  warn(message: string) {
    Snackbar.warning(message)
  },
  error(message: string) {
    Snackbar.error(message)
  },
  log(message: string) {
    Snackbar.info(message)
  },
  success(message: string) {
    Snackbar.success(message)
  },
}

const code = useTransform(codeType, computed(() => atou(originCode.value)), computed(() => Boolean(Number(propsNotOnlyTs.value))), output)

const language = computed(() => {
  return codeType.value === 'sfc' ? 'html' : 'javascript'
})

const { copy } = useClipboard()

function copyCode() {
  copy(code.value)

  output.success(`Copied code to clipboard!`)
}

const monaco = ref<{ setValue: (value: string) => void } | null>(null)
watchEffect(() => {
  monaco.value?.setValue(code.value)
})
</script>

<template>
  <div class="h-full flex-1 flex flex-col">
    <var-paper class="flex-shrink-0 px-30px flex items-center justify-end" :elevation="1" :height="36">
      <var-checkbox v-model="propsNotOnlyTs" checked-value="1" unchecked-value="0">
        <span :class="TEXT_COLOR">PropsNotOnlyTs</span>
      </var-checkbox>
      <var-button type="warning" round class="ml-6px">
        <var-icon name="content-copy" :size="16" title="copy code" @click="copyCode" />
      </var-button>
    </var-paper>

    <div class="flex-1 box-border pt-2px">
      <Monaco v-model="code" :language="language" read-only ref="monaco" />
    </div>
  </div>
</template>

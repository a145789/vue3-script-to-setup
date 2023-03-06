<script setup lang="ts">
const { code, codeType } = useUrlKeepParams()

const monaco = ref<{ setValue: (value: string) => void } | null>(null)

const editCode = computed({
  get() {
    return atou(code.value)
  },
  set(value) {
    code.value = utoa(value)
  }
})

watch(() => codeType.value, () => {
  code.value = ''
  monaco.value?.setValue('')
})

const language = computed(() => {
  return codeType.value === 'sfc' ? 'html' : 'javascript'
})
</script>

<template>
  <div class="h-full flex-1 flex flex-col">
    <var-paper class="flex-shrink-0 px-30px flex items-center" :elevation="1" :height="36">
      <var-radio-group v-model="codeType" class="text-14px">
        <var-radio :checked-value="CodeType.SFC" icon-size="18px">
          <span :class="TEXT_COLOR">SFC</span>
        </var-radio>
        <var-radio :checked-value="CodeType.SCRIPT" icon-size="18px">
          <span :class="TEXT_COLOR">Script</span>
        </var-radio>
      </var-radio-group>
    </var-paper>

    <div class="flex-1 box-border pt-2px">
      <Monaco v-model="editCode" :language="language" ref="monaco" />
    </div>
  </div>
</template>

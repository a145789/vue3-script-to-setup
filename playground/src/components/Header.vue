<script setup lang="tsx">
import { StyleProvider, Themes } from '@varlet/ui';
import { useDark, useToggle } from '@vueuse/core'
import Share from './Share.vue'

const isDark = useDark()
const toggleDark = useToggle(isDark)

watchEffect(() => {
  StyleProvider(isDark.value ? Themes.dark : null)
})

async function shareLink() {
  await navigator.clipboard.writeText(location.href)
  Snackbar.success('Sharable URL has been copied to clipboard.')
}

const handleIcon = computed(() => (
  <>
    <var-button round>
      <var-icon name={isDark.value ? 'white-balance-sunny' : 'weather-night'} size={ICON_SIZE}
        transition="300" onClick={() => toggleDark()} />
    </var-button>

    <var-button type="info" round>
      <Share size={ICON_SIZE} onClick={() => shareLink()} title="share link" />
    </var-button>

    <var-link target="_blank" href="https://github.com/a145789/vue3-script-to-setup" underline="none">
      <var-button type="success" round>
        <var-icon name="github" size={ICON_SIZE} title="github" />
      </var-button>
    </var-link>
  </>
))

const iconClass = 'text-#555 dark:text-#fff'
</script>

<template>
  <var-paper :elevation="2" :height="50" class="px-25px">
    <var-row align="center" justify="space-between" class="h-full">
      <var-col :span="12" :xs="20">
        <div class="font-500 text-20px" :class="TEXT_COLOR">Vue3 script to script-setup</div>
      </var-col>
      <var-col :span="12" :xs="2">
        <var-space justify="flex-end" class="w-full hidden sm:flex" :class="iconClass">
          <component :is="handleIcon" />
        </var-space>

        <var-menu>
          <var-button round class="block sm:hidden">
            <var-icon name="menu" :size="ICON_SIZE" :class="iconClass" />
          </var-button>

          <template #menu>
            <div class="flex flex-col px-12px py-8px h-120px justify-between" :class="iconClass">
              <component :is="handleIcon" />
            </div>
          </template>
        </var-menu>
      </var-col>
    </var-row>
  </var-paper>
</template>

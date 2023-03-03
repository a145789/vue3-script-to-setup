<script setup lang="ts">
import { transformScript, FileType } from '../../src/index'
import initSwc, { parseSync } from '@swc/wasm-web'

const count = ref(0)

const text = ref('')

async function init() {
  await initSwc()

  const code = transformScript({
    fileType: FileType.ts,
    script: `
    import { defineComponent, PropType, ref } from "vue"
import Header from "../components/Header.vue"
import Tab from "../components/Tab.vue"
import touchdir from "vtouchdir"
export default defineComponent({
  name: 'App',
  components: {
    Header,
    Tab,
  },
  directives: {
    force: {},
    touchdir,
  },
  props: {
    items: Array as PropType<number[]>
  },
  emit: ["click"],
  setup(props, { emit, attrs, slots: mySlots, expose }) {
    const bar = ref(0)
    expose({ bar })
    emit("change");
    return {
      bar
    }
  }
})`.trim(),
    offset: 0,
    parseSync: parseSync as any,
    output: {
      warn() {

      },
      log() {

      },
      success() {

      },
      error() {
      }
    }
  })

  if (code) {
    text.value = code
  }
}

init()
</script>

<template>
  <div>
    <div>
      {{ count }}
      <var-button @click="count++" type="primary">click</var-button>
    </div>
    <var-paper :elevation="2">
      <pre>
              {{ text }}
            </pre>
    </var-paper>
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


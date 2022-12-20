<script lang="ts">
import { PropType, ref, watch } from 'vue'
import Header from "../components/Header.vue"
import Tab from "../components/Tab.vue"
export default {
  name: 'Home',
  components: {
    Header,
    Tab,
  },
  props: {
    // 源数据
    source: {
      type: String as PropType<"Main" | "visitor">
    },
    showTable: Boolean,
    maxLimit: {
      type: Number,
      default: 0
    },
    time: {
      type: Date,
      required: true
    }
  },
  setup(theProps) {
    const foo = ref(0)

    watch(() => theProps.maxLimit, (value) => {
      foo.value = value
    })
    return { foo }
  }
}
</script>

<template>
  <div>App</div>
</template>

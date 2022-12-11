<script lang="ts">
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
})
</script>

<template>
  <div>App</div>
</template>

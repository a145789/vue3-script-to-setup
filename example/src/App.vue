<script lang="ts">
import { defineComponent } from 'vue'
import Home from "./views/Home.vue"
import NotFound from "./views/404.vue"
import NoPermission from "./views/401.vue"
export default defineComponent({
    name: 'App',
    components: {
        Home,
        NotFound,
        NoPermission
    },
    setup() {
        return {}
    }
})
</script>

<template>
    <div>App</div>
</template>

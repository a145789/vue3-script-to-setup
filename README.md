<h1 align="center">vue3-script-to-setup</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/vue3-script-to-setup" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/vue3-script-to-setup" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/vue3-script-to-setup" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/dt/vue3-script-to-setup" alt="NPM Downloads" /></a>
  <a href="https://github.com/a145789/vue3-script-to-setup/blob/master/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/a145789/vue3-script-to-setup" alt="License" /></a>
</p>
<p align="center">Quickly transform your vue3 script to setup mode</p>
<p align="center">快速将 vue3 script 转换为 setup 模式</p>
<p align="center">
  <a href="https://a145789.github.io/vue3-script-to-setup/#code=PHNjcmlwdCBsYW5nPSJ0cyI%2BDQppbXBvcnQgeyBkZWZpbmVDb21wb25lbnQsIFByb3BUeXBlLCByZWYgfSBmcm9tICJ2dWUiDQppbXBvcnQgSGVhZGVyIGZyb20gIi4uL2NvbXBvbmVudHMvSGVhZGVyLnZ1ZSINCmltcG9ydCBUYWIgZnJvbSAiLi4vY29tcG9uZW50cy9UYWIudnVlIg0KaW1wb3J0IHRvdWNoZGlyIGZyb20gInZ0b3VjaGRpciINCmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbXBvbmVudCh7DQogIG5hbWU6ICdBcHAnLA0KICBjb21wb25lbnRzOiB7DQogICAgSGVhZGVyLA0KICAgIFRhYiwNCiAgfSwNCiAgZGlyZWN0aXZlczogew0KICAgIGZvcmNlOiB7fSwNCiAgICB0b3VjaGRpciwNCiAgfSwNCiAgcHJvcHM6IHsNCiAgICBpdGVtczogQXJyYXkgYXMgUHJvcFR5cGU8bnVtYmVyW10%2BDQogIH0sDQogIGVtaXQ6IFsiY2xpY2siXSwNCiAgc2V0dXAocHJvcHMsIHsgZW1pdCwgYXR0cnMsIHNsb3RzOiBteVNsb3RzLCBleHBvc2UgfSkgew0KICAgIGNvbnN0IGJhciA9IHJlZigwKQ0KICAgIGV4cG9zZSh7IGJhciB9KQ0KICAgIGVtaXQoImNoYW5nZSIpOw0KICAgIHJldHVybiB7DQogICAgICBiYXINCiAgICB9DQogIH0NCn0pDQo8L3NjcmlwdD4NCg0KPHRlbXBsYXRlPg0KICA8ZGl2PkFwcDwvZGl2Pg0KPC90ZW1wbGF0ZT4%3D&codeType=sfc&propsNotOnlyTs=0" target="_blank">
    Playground 在线尝试
  </a>
</p>

**origin code**
```html
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
```

```bash
npx tosetup /src/App.vue
```

**transform code**

```html
<script lang="ts" setup>
import { ref, useAttrs, useSlots,  } from "vue";
import Header from "../components/Header.vue";
import Tab from "../components/Tab.vue";
import vTouchdir from "vtouchdir";

const props = defineProps<{items?: number[]; }>();

const emit = defineEmits(["click", "change"]);

// custom directive 
const vForce = {};


const attrs = useAttrs();
const mySlots = useSlots();

const bar = ref(0);
        emit("change");
 defineExpose({ bar });



</script>

<template>
  <div>App</div>
</template>
```

## Installation

### npm
```bash
npm install --save-dev vue3-script-to-setup
```

### yarn
```bash
yarn add vue3-script-to-setup -D
```
### pnpm
```bash
pnpm add vue3-script-to-setup -D
```

## Usage

### Using Command

```bash
npx tosetup [filePath]
```

example
```bash
npx tosetup /src/App.vue --propsNotOnlyTs
```

A new `App.new.vue` file will be created in the same directory

将会在同目录下创建一个 `App.new.vue` 的新文件

### command

| options | english | chinese |
| ------- | ------- | ------- |
| --propsNotOnlyTs | `props` not using [TypeScript-only Features](https://vuejs.org/api/sfc-script-setup.html#typescript-only-features) | `props` 不使用 [TypeScript-only Features](https://vuejs.org/api/sfc-script-setup.html#typescript-only-features) |
| --notUseNewFile | instead of creating a new file, replace the contents of the file directly with the `setup` mode | 不创建一个新文件，而是将文件中的内容直接替换为 `setup` 模式 |

### Using tosetup.config

Create a `tosetup.config.ts/tosetup.config.js` file in the root directory

在根目录下创建一个 `tosetup.config.ts/tosetup.config.js` 文件

```ts
import { defineConfig } from "vue3-script-to-setup";

export default defineConfig({
  propsNotOnlyTs: true,
  notUseNewFile: true,
  path: {
    "example/src": {
      mode: "*",
      excludes: [],
    },
    "example/src/components": {
      mode: "*",
      excludes: "Header.vue",
    }, // Find the .vue file in the example/src directory, exclude Header.vue files
    "example/src/views": ["404.vue"], // transform only the 404.vue in the example/src/views directory
  },
});
```

```bash
npx tosetup 
```
defaultOption 

```ts
interface DefaultOption {
  propsNotOnlyTs?: boolean;
  notUseNewFile?: boolean;
  path: {
    [key: string]:
      | string
      | string[]
      | {
          mode: "*" | "**";
          excludes: string | string[];
        };
  };
}
```

## Limitations/限制

Unable to transform `TypeScript-only Features` of `defineEmits`, support only

无法将 `defineEmits` 转换为 `TypeScript-only Features` 模式，仅支持转换为数组

```ts
const emit = defineEmits(['change', 'delete'])
```

If `expose` is not specified, the reference may fail in the outer layer.

如果在 `script` 代码下子组件没有通过 `expose` 暴露内部状态，转换为 `setup` 代码后父组件将引用失败。

```ts
// Child.vue
export default {
  setup() {
    function foo() {}
    return { foo }
  }
}

// Parent.vue
export default {
  mounted() {
    // Child.vue is script code, it`s work
    // Child.vue is setup code, foo is undefined, need `expose({ foo })`
    this.$refs.child.foo()
  }
}
```

## Not supported/不支持

```ts
export default defineComponent({
  name: 'App',
  ...optoons,  // ❌
  directives: {
    ...directives,  // ❌
  },
  emit: ["click"],
  // ...options ❌
  setup(props, { emit, ...options }) {
    const obj = reactive({ a, b, c })
    options.expose() // ❌
    
    const { ... } = toRefs(obj) // ✅
    function handle() {} // ✅
    return {
      ...toRefs(obj),  // ❌
      handle() {}, // ❌
    }
  }
})
```

## License

[MIT](https://github.com/a145789/vue3-script-to-setup/blob/main/LICENSE)

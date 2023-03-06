import { fileURLToPath, URL } from "node:url";

import { defineConfig, type PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { viteStaticCopy } from "vite-plugin-static-copy";
import Components from "unplugin-vue-components/vite";
import AutoImport from "unplugin-auto-import/vite";
import { VarletUIResolver } from "unplugin-vue-components/resolvers";
import Unocss from "unocss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    vue(),
    vueJsx(),
    Unocss({
      safelist: ["text-#444", "dark:text-#ddd"],
      theme: {
        breakpoints: {
          sm: "768px",
        },
      },
    }),
    AutoImport({
      imports: ["vue", "vue-router"],
      dirs: ["./src/composables", "./src/constants"],
      dts: true,
      vueTemplate: true,
      resolvers: [VarletUIResolver({ autoImport: true })],
    }),
    Components({
      dirs: ["src/components"],
      // allow auto load markdown components under `./src/components/`
      extensions: ["vue"],
      // allow auto import and register components used in markdown
      include: [/\.vue$/, /\.vue\?vue/],
      dts: true,
      resolvers: [VarletUIResolver({ autoImport: true })],
    }),
  ];
  if (mode !== "production") {
    plugins.push(
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/@swc/wasm-web/wasm-web_bg.wasm",
            dest: "node_modules/.vite/deps/",
          },
        ],
      }),
    );
  }
  return {
    plugins,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});

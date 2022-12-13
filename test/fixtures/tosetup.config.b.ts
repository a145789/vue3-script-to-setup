import { defineConfig } from "../../src/index";

export default defineConfig({
  propsNotOnlyTs: true,
  path: {
    "example/src": {
      mode: "**",
      excludes: ["views/Home.vue"],
    },
  },
});

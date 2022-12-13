import { defineConfig } from "../../src";

export default defineConfig({
  propsNotOnlyTs: true,
  path: {
    "example/src": {
      mode: "**",
      excludes: ["views/Home.vue"],
    },
  },
});

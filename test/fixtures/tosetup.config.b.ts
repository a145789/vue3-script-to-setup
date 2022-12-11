import { defineConfig } from "../../src/utils";

export default defineConfig({
  propsNotOnlyTs: true,
  path: {
    "example/src": {
      mode: "**",
      excludes: ["views/Home.vue"],
    },
  },
});

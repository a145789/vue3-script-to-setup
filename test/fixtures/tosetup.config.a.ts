import { defineConfig } from "../../src/index";

export default defineConfig({
  path: {
    "example/src": {
      mode: "*",
      excludes: [],
    },
    "example/src/components": {
      mode: "*",
      excludes: "Header.vue",
    },
    "example/src/views": ["404.vue"],
  },
});

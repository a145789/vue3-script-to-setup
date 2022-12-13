import { defineConfig } from "../../src";

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

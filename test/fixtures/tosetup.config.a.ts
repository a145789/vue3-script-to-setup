import { defineConfig } from "../../src/utils";

export default defineConfig({
  "example/src": {
    mode: "*",
    excludes: [],
  },
  "example/src/components": {
    mode: "*",
    excludes: "Header.vue",
  },
  "example/src/views": ["404.vue"],
});

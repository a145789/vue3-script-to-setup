import { defineConfig } from "../../src/utils";

export default defineConfig({
  "example/src": {
    mode: "**",
    excludes: ["views/Home.vue"],
  },
});

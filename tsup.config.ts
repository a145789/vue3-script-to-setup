import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts", "./src/setup.ts"],
  format: ["esm"],
  target: "node14",
  clean: true,
  dts: true,
});

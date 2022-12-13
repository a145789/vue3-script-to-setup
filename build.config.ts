import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/setup"],
  declaration: true,
  clean: true,
  rollup: {
    inlineDependencies: true,
  },
});

import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/setup"],
  rollup: {
    inlineDependencies: true,
  },
  clean: true,
  declaration: true,
});

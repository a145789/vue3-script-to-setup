import { DefaultOption } from "./constants";

export { transformSfc, transformScript } from "./transform";

export { Output, SfcOptions, ScriptOptions } from "./constants";

export function defineConfig(option: DefaultOption) {
  return option;
}

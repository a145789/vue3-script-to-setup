import { DefaultOption } from "./constants";

export { transformSfc, transformScript } from "./transform";

export type { Output, SfcOptions, ScriptOptions } from "./constants";

export { FileType } from "./constants";

export function defineConfig(option: DefaultOption) {
  return option;
}

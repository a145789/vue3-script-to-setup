import { DefaultOption } from "./constants";

export { transformSfc, transformScript } from "./transform";

export function defineConfig(option: DefaultOption) {
  return option;
}

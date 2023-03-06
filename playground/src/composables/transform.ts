import {
  transformScript,
  transformSfc,
  FileType,
  type Output,
} from "../../../src/index";
import initSwc, { parseSync } from "@swc/wasm-web";
import type { CodeType } from "@/constants";

export function useTransform(
  type: Ref<CodeType>,
  originCode: ComputedRef<string>,
  propsNotOnlyTs: Ref<boolean>,
  output: Output,
) {
  const isReady = ref(false);
  async function init() {
    await initSwc();
    isReady.value = true;
  }

  const code = ref("");
  watchEffect(() => {
    if (!(isReady.value && originCode.value)) {
      code.value = "";
      return;
    }

    const text = originCode.value.trim();
    try {
      if (type.value === "sfc") {
        code.value =
          transformSfc(text, {
            parseSync: parseSync as any,
            output,
            propsNotOnlyTs: propsNotOnlyTs.value,
          }) || "";
      } else {
        code.value =
          transformScript({
            fileType: FileType.ts,
            script: text,
            propsNotOnlyTs: propsNotOnlyTs.value,
            output,
            parseSync: parseSync as any,
            offset: 0,
          }) || "";
      }
    } catch (error) {
      output.error("Compilation error, please check the console.");
      console.log(error);
    }
  });

  init();

  return code;
}

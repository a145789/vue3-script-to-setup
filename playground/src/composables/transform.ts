import {
  transformScript,
  transformSfc,
  FileType,
  type Output,
} from "../../../src/index";
import initSwc, { parseSync } from "@swc/wasm-web";
import type { CodeType } from "@/constants";
import type { MaybeRefOrGetter } from "vue";

export function useTransform(
  type: MaybeRefOrGetter<CodeType>,
  originCode: MaybeRefOrGetter<string>,
  propsNotOnlyTs: MaybeRefOrGetter<boolean>,
  output: Output,
) {
  const isReady = ref(false);
  async function init() {
    await initSwc();
    isReady.value = true;
  }

  const code = ref("");
  watchEffect(() => {
    if (!(isReady.value && toValue(originCode))) {
      code.value = "";
      return;
    }

    const text = toValue(originCode).trim();
    try {
      if (toValue(type) === "sfc") {
        code.value =
          transformSfc(text, {
            parseSync: parseSync as any,
            output,
            propsNotOnlyTs: toValue(propsNotOnlyTs),
          }) || "";
      } else {
        code.value =
          transformScript({
            fileType: FileType.ts,
            script: text,
            propsNotOnlyTs: toValue(propsNotOnlyTs),
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

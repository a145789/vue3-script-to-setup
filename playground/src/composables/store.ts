import { CodeType } from "@/constants";
import { useUrlSearchParams } from "@vueuse/core";

export function createStore<T extends object>(cb: () => T) {
  const value = cb();

  return () => toRefs(value);
}

const initialValue: {
  code: string;
  codeType: CodeType;
  propsNotOnlyTs: "0" | "1";
} = {
  code: "",
  codeType: CodeType.SFC,
  propsNotOnlyTs: "0",
};
export const useUrlKeepParams = createStore(() => {
  const params = useUrlSearchParams("hash-params", {
    initialValue,
  });

  const keys = Object.keys(initialValue) as (keyof typeof initialValue)[];
  for (const key of keys) {
    if (!(key in params)) {
      (params as any)[key] = initialValue[key];
    }
  }

  return params;
});

import { parse } from "vue/compiler-sfc";
import { readFileSync } from "fs";

export function parseSfc(pathNames: string[]) {
  for (const path of pathNames) {
    const sfc = readFileSync(path).toString();
    const {
      descriptor: { script, scriptSetup },
    } = parse(sfc);

    if (scriptSetup || !script) {
      continue;
    }

    console.log(script);
  }
}

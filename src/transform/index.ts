import { parse } from "vue/compiler-sfc";
import { readFileSync } from "fs";
import { CommandsOption, FileType } from "../constants";
import transformScript from "./transformScript";
import { output } from "../utils";

export function parseSfc(pathNames: string[], option: CommandsOption) {
  for (const path of pathNames) {
    const sfc = readFileSync(path).toString();
    const {
      descriptor: { script, scriptSetup },
    } = parse(sfc);

    if (scriptSetup || !script) {
      continue;
    }

    let code: string | null = null;
    try {
      code = transformScript({
        ...option,
        fileType: script.lang === "ts" ? FileType.ts : FileType.js,
        script: script.content,
        offset: 0,
        fileAbsolutePath: path,
        setupScript: "",
      });
    } catch (error) {
      output.error(`transform script failed in the ${path}`);
      console.log(error);
    } finally {
      if (!code) {
      }
    }
  }
}

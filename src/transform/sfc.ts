import { parse } from "vue/compiler-sfc";
import { readFileSync } from "fs";
import { CommandsOption, FileType } from "../constants";
import transformScript from "./script";
import { output } from "../utils";
import MagicString from "magic-string";

export function transformSfc(path: string, option: CommandsOption) {
  const sfc = readFileSync(path).toString();
  const {
    descriptor: { script, scriptSetup },
  } = parse(sfc);

  if (scriptSetup || !script) {
    return null;
  }

  let code: string | null = null;
  try {
    code = transformScript({
      ...option,
      fileType: script.lang === "ts" ? FileType.ts : FileType.js,
      script: script.content.trim(),
      offset: 0,
      fileAbsolutePath: path,
    });
  } catch (error) {
    output.error(`transform script failed in the ${path}`);
    console.log(error);
  } finally {
    if (code) {
      const ms = new MagicString(sfc);
      ms.update(script.loc.start.offset, script.loc.end.offset, `\n${code}`);
      ms.replaceAll(/\<\bscript\b.*\>/g, (str) => {
        const lastIdx = str.length - 1;
        return `${str.slice(0, lastIdx)} setup${str[lastIdx]}`;
      });

      return ms.toString();
    } else {
      return null;
    }
  }
}

export default transformSfc;

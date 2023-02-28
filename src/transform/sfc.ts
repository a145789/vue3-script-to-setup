import { parse } from "vue/compiler-sfc";
import { CommandsOption, FileType } from "../constants";
import transformScript from "./script";
import { output } from "../utils";
import MagicString from "magic-string";

export function transformSfc(
  sfc: string,
  option: CommandsOption,
  path = "code",
) {
  const {
    descriptor: { script, scriptSetup },
  } = parse(sfc);

  if (scriptSetup || !script) {
    output.log(`skip ${path}`);
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
      output.error(`File ${path} transform failure.\n`);
      return null;
    }
  }
}

export default transformSfc;

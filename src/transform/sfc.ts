import { parse } from "vue/compiler-sfc";
import { SfcOptions, FileType } from "../constants";
import transformScript from "./script";
import MagicString from "magic-string";

function transformSfc(sfc: string, options: SfcOptions) {
  const {
    descriptor: { script, scriptSetup },
  } = parse(sfc);

  const { output } = options;

  if (scriptSetup || !script) {
    output.log("Cannot find the code to be transform");
    return null;
  }

  let code: string | null = null;
  try {
    code = transformScript({
      ...options,
      fileType: script.lang === "ts" ? FileType.ts : FileType.js,
      script: script.content.trim(),
      offset: 0,
    });
  } catch (error) {
    output.error("transform script failed");
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
      output.error("transform failure");
      return null;
    }
  }
}

export default transformSfc;

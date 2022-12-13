import { writeFileSync } from "fs";
import { CommandsOption } from "./constants";

function writeFile(
  code: string,
  path: string,
  { notUseNewFile }: CommandsOption,
) {
  const index = path.indexOf(".vue");
  const file = notUseNewFile ? path : `${path.slice(0, index)}.new.vue`;

  writeFileSync(file, code);

  return file;
}

export default writeFile;

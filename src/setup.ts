import { findUpSync } from "find-up";
import { getTheFileAbsolutePath, output, useConfigPath } from "./utils";
import { transformSfc } from "./transform";
import { CommandsOption } from "./constants";
import writeFile from "./writeFile";

const CONFIG_FILE_NAME = "tosetup.config" as const;

async function setup() {
  const start = Date.now();
  const argv = process.argv.slice(2).filter(Boolean);

  let { pathNames, commands } = argv.reduce<{
    pathNames: string[];
    commands: CommandsOption;
  }>(
    (p, c) => {
      if (c.startsWith("--")) {
        switch (c.split("--")[1] as keyof typeof p.commands) {
          case "propsNotOnlyTs":
            p.commands.propsNotOnlyTs = true;
            break;
          case "notUseNewFile":
            p.commands.notUseNewFile = true;
            break;

          default:
            break;
        }
        return p;
      }

      const absolutePath = getTheFileAbsolutePath(c);
      if (absolutePath) {
        p.pathNames.push(absolutePath);
      }

      return p;
    },
    { pathNames: [], commands: {} },
  );

  if (!pathNames.length) {
    const configPath = findUpSync([
      `${CONFIG_FILE_NAME}.js`,
      `${CONFIG_FILE_NAME}.ts`,
    ]);
    if (!configPath) {
      output.error(
        `Please enter a file path or use a ${CONFIG_FILE_NAME} file.`,
      );
      process.exit(1);
    }

    const config = await useConfigPath(CONFIG_FILE_NAME);

    pathNames = config.pathNames;

    commands = { ...commands, ...config.option };
  }
  for (const path of pathNames) {
    output.log(`File ${path} start of transform...`);
    const code = transformSfc(path, commands);
    if (code) {
      try {
        const file = writeFile(code, path, commands);
        output.success(`File ${file} transform success.\n`);
      } catch (error) {
        output.error(`write ${path} failure.\n`);
        console.log(error);
      }
    }
  }

  output.log(`Done in ${Math.floor(Date.now() - start)}ms.`);
}

setup();

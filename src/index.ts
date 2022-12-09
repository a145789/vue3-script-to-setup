import { findUpSync } from "find-up";
import { getTheFileAbsolutePath, useConfigPath } from "./utils";
import { parseSfc } from "./parse/parser";

const CONFIG_FILE_NAME = "tosetup.config" as const;

async function setup() {
  const argv = process.argv.slice(2).filter(Boolean);

  let { pathNames, commands } = argv.reduce<{
    pathNames: string[];
    commands: string[];
  }>(
    (p, c) => {
      if (c.startsWith("--")) {
        p.commands.push(c);
        return p;
      }

      const absolutePath = getTheFileAbsolutePath(c);
      if (absolutePath) {
        p.pathNames.push(absolutePath);
      }

      return p;
    },
    { pathNames: [], commands: [] },
  );

  if (!pathNames.length) {
    const configPath = findUpSync(CONFIG_FILE_NAME);
    if (!configPath) {
      console.error(
        `Please enter a file path or use a ${CONFIG_FILE_NAME} file.`,
      );
      process.exit(1);
    }

    pathNames = await useConfigPath(CONFIG_FILE_NAME);
  }

  parseSfc(pathNames);
}

setup();

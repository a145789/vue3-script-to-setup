import fs from "fs";
import { resolve } from "path";
import fg from "fast-glob";
import { loadConfig } from "unconfig";
import slash from "slash";
import type { DefaultOption } from "./constants";

export const cwd = process.cwd();

export function pathResolve(...paths: string[]) {
  return slash(resolve(...paths));
}

export function getTheFileAbsolutePath(...pathNames: string[]) {
  const lastFile = pathNames[pathNames.length - 1] || "";
  if (!lastFile.endsWith(".vue")) {
    return;
  }
  const absolutePath = pathResolve(cwd, ...pathNames);
  try {
    fs.accessSync(absolutePath, fs.constants.F_OK);
    return absolutePath;
  } catch {
    console.warn(`File ${absolutePath} cannot be accessed`);
    return;
  }
}

export async function useConfigPath(files: string, beginDir = cwd) {
  const pathNames: string[] = [];
  const { config } = await loadConfig<DefaultOption>({
    sources: {
      files,
      extensions: ["ts", "js"],
    },
    cwd: beginDir,
  });

  const { path, ...option } = config;
  const keys = Object.keys(path);

  for (const key of keys) {
    const item = path[key];
    const files = Array.isArray(item)
      ? item
      : [typeof item === "string" ? item : item.mode];
    let vueFiles = getFgVueFile(files.map((p) => pathResolve(cwd, key, p)));

    if (typeof item === "object" && !Array.isArray(item)) {
      const excludes = Array.isArray(item.excludes)
        ? item.excludes
        : [item.excludes];
      const excludePaths = excludes.map((p) => pathResolve(cwd, key, p));

      vueFiles = vueFiles.filter((p) => !excludePaths.includes(p));
    }
    pathNames.push(...vueFiles);
  }

  return { pathNames, option };
}

function getFgVueFile(paths: string[]) {
  return fg.sync(paths).filter((p) => p.endsWith(".vue"));
}

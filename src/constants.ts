import type { ArrowFunctionExpression, MethodProperty } from "@swc/core";
import type { ParseOptions } from "@swc/core";
import { parseSync } from "@swc/core";

export type ParseSyncType = typeof parseSync;

export const enum FileType {
  js,
  ts,
}

export interface DefaultOption {
  propsNotOnlyTs?: boolean;
  notUseNewFile?: boolean;
  path: {
    [key: string]:
      | string
      | string[]
      | {
          mode: "*" | "**";
          excludes: string | string[];
        };
  };
}

export type CommandsOption = Omit<DefaultOption, "path"> & { path: string };
export interface Config {
  fileType: FileType;
  script: string;
  offset: number;
  fileAbsolutePath: string;
  propsNotOnlyTs?: boolean;
}

export const parseOption = {
  target: "es2022",
  syntax: "typescript",
  comments: true,
} as ParseOptions;

export type SetupAst = ArrowFunctionExpression | MethodProperty;

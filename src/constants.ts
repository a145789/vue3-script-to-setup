import type { ArrowFunctionExpression, MethodProperty } from "@swc/core";
import type { ParseOptions } from "@swc/core";
import { parseSync } from "@swc/core";

export type ParseSyncType = typeof parseSync;

export enum FileType {
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

export type CommandsOption = Omit<DefaultOption, "path">;

export interface Output {
  warn(message: string): void;
  error(message: string): void;
  log(message: string): void;
  success(message: string): void;
}

export interface Handlers {
  parseSync: ParseSyncType;
  output: Output;
}

export type SfcOptions = Pick<CommandsOption, "propsNotOnlyTs"> & Handlers;

export type ScriptOptions = {
  fileType: FileType;
  script: string;
  offset: number;
  propsNotOnlyTs?: boolean;
} & Handlers;

export const parseOption = {
  target: "es2022",
  syntax: "typescript",
  comments: true,
} as ParseOptions;

export type SetupAst = ArrowFunctionExpression | MethodProperty;

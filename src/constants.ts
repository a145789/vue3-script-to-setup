import type {
  ParseOptions,
  ArrowFunctionExpression,
  MethodProperty,
} from "@swc/core";

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

export type CommandsOption = Omit<DefaultOption, "path">;
export interface Config {
  fileType: FileType;
  script: string;
  offset: number;
  fileAbsolutePath: string;
  propsNotOnlyTs?: boolean;
  setupScript?: string;
}

export const parseOption = {
  target: "es2022",
  syntax: "typescript",
  comments: true,
} as ParseOptions;

export type SetupAst = ArrowFunctionExpression | MethodProperty;

export const USE_ATTRS = "useAttrs" as const;
export const USE_SLOTS = "useSlots" as const;

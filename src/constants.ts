import type {
  ParseOptions,
  ArrowFunctionExpression,
  MethodProperty,
} from "@swc/core";

export const enum FileType {
  js,
  ts,
}

export interface Config {
  fileType: FileType;
  script: string;
  offset: number;
  setupScript?: string;
  fileAbsolutePath: string;
}

export const parseOption = {
  target: "es2022",
  syntax: "typescript",
  comments: true,
} as ParseOptions;

export type SetupAst = ArrowFunctionExpression | MethodProperty;

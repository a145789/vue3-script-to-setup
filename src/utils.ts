import fs from "fs";
import { resolve } from "path";
import fg from "fast-glob";
import { loadConfig } from "unconfig";
import type {
  AssignmentPatternProperty,
  CallExpression,
  Expression,
  Identifier,
  KeyValuePatternProperty,
  ObjectPattern,
  TsType,
  TsTypeReference,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import { blue, green, red, yellow } from "colorette";
import slash from "slash";
import { DefaultOption, SetupAst, VisitorCb } from "./constants";
import type MagicString from "magic-string";

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
    output.warn(`File ${absolutePath} cannot be accessed.`);
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

export function getPropsValueIdentifier(
  ast: Expression,
  keyValue: string,
  script: string,
  offset: number,
  required = false,
) {
  if (ast.type === "Identifier") {
    let value = "";
    switch (ast.value) {
      case "Function":
      case "Date": {
        value = ast.value;
        break;
      }
      case "Array": {
        value = "any[]";
        break;
      }
      default:
        value = ast.value.toLocaleLowerCase();
        break;
    }
    return `${keyValue}${required ? "" : "?"}: ${value}; `;
  }

  if (ast.type === "TsAsExpression") {
    const {
      span: { start, end },
    } = (ast.typeAnnotation as TsTypeReference).typeParams!.params[0];

    return `${keyValue}${required ? "" : "?"}: ${script.slice(
      start - offset,
      end - offset,
    )}; `;
  }

  if (ast.type === "ArrayExpression") {
    const {
      span: { start, end },
    } = ast;
    return `${keyValue}${required ? "" : "?"}: ${script.slice(
      start - offset,
      end - offset,
    )}; `;
  }
  return "";
}

export function getSetupSecondParams(
  key: "attrs" | "slots" | "emit" | "expose",
  setupAst: SetupAst,
  fileAbsolutePath: string,
) {
  if (!(setupAst.params.length || setupAst.params[1])) {
    return;
  }

  const [_, setupParamsAst] = setupAst.params;

  if (!setupParamsAst) {
    return;
  }

  if (
    setupParamsAst.type !== "ObjectPattern" &&
    setupParamsAst.type !== "Parameter"
  ) {
    output.warn(
      `The second argument to the setup function is not an object and cannot be resolved in the ${fileAbsolutePath}`,
    );
    return;
  }

  const { properties } =
    setupParamsAst.type === "ObjectPattern"
      ? setupParamsAst
      : (setupParamsAst.pat as ObjectPattern);

  if (properties.some((ast) => ast.type === "RestElement")) {
    output.warn(
      `The second argument to the setup function has rest element(...rest) and cannot be resolved in the ${fileAbsolutePath}`,
    );
    return;
  }

  const nameAst = (
    properties as (AssignmentPatternProperty | KeyValuePatternProperty)[]
  ).find((ast) => (ast.key as Identifier).value === key);
  if (!nameAst) {
    return;
  }

  return nameAst.type === "AssignmentPatternProperty"
    ? nameAst.key.value
    : (nameAst.value as Identifier).value;
}

export class MapVisitor extends Visitor {
  private ms: MagicString;
  constructor(visitCb: VisitorCb[], ms: MagicString) {
    super();
    this.ms = ms;
    const keys = [
      ...new Set(visitCb.flatMap((item) => Object.keys(item))),
    ] as (keyof Visitor)[];

    for (const key of keys) {
      if (key in this) {
        this[key] = (n: any) => {
          for (const visit of visitCb) {
            n = (visit[key] as any)?.call(this, n) || n;
          }
          (super[key] as any)?.();
          return n;
        };
      }
    }
  }
  visitTsType(n: TsType) {
    return n;
  }
}

export class GetCallExpressionFirstArg extends Visitor {
  public firstArgAst: Expression[] = [];
  private callName = "";
  constructor(callName: string) {
    super();
    this.callName = callName;
  }

  visitCallExpression(n: CallExpression): Expression {
    const { callName } = this;
    if (
      n.callee.type === "Identifier" &&
      n.callee.value === callName &&
      n.arguments[0]
    ) {
      this.firstArgAst.push(n.arguments[0].expression);
    }
    return n;
  }

  visitFn(n: SetupAst): SetupAst {
    switch (n.type) {
      case "ArrowFunctionExpression":
        this.visitArrowFunctionExpression(n);
        break;
      case "MethodProperty":
        this.visitMethodProperty(n);
        break;
    }

    return n;
  }

  visitTsType(n: TsType) {
    return n;
  }
}

export const output = {
  warn: (message: string) => console.log(yellow(message)),
  error: (message: string) => console.log(red(message)),
  log: (message: string) => console.log(blue(message)),
  success: (message: string) => console.log(green(message)),
};

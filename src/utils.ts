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
  Options,
  TsTypeReference,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import { yellow } from "colorette";
import slash from "slash";
import { SetupAst } from "./constants";

export const cwd = process.cwd();

export function pathResolve(...paths: string[]) {
  return slash(resolve(...paths));
}

export function getTheFileAbsolutePath(...pathNames: string[]) {
  const lastFile = pathNames.at(-1) || "";
  if (!lastFile.endsWith(".vue")) {
    return;
  }
  const absolutePath = pathResolve(cwd, ...pathNames);
  try {
    fs.accessSync(absolutePath, fs.constants.F_OK);
    return absolutePath;
  } catch {
    console.warn(yellow(`File ${absolutePath} cannot be accessed.`));
    return;
  }
}

type Config = {
  [key: string]:
    | string
    | string[]
    | {
        mode: "*" | "**";
        excludes: string | string[];
      };
};
export async function useConfigPath(files: string, beginDir = cwd) {
  const pathNames: string[] = [];
  const { config } = await loadConfig<Config>({
    sources: {
      files,
      extensions: ["ts", "js"],
    },
    cwd: beginDir,
  });

  const keys = Object.keys(config);

  for (const key of keys) {
    const item = config[key];
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

  return pathNames;
}

function getFgVueFile(paths: string[]) {
  return fg.sync(paths).filter((p) => p.endsWith(".vue"));
}

export function defineConfig(config: Config) {
  return config;
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

export function getSetupHasSecondParams(
  key: "attrs" | "slots" | "emit" | "expose",
  setupAst: SetupAst,
) {
  if (!(setupAst.params.length || setupAst.params[1])) {
    return;
  }

  const [_, setupParamsAst] = setupAst.params;
  if (setupParamsAst.type !== "ObjectPattern") {
    console.warn("");
    return;
  }
  if (setupParamsAst.properties.some((ast) => ast.type === "RestElement")) {
    console.warn("");
    return;
  }

  const nameAst = (
    setupParamsAst.properties as (
      | AssignmentPatternProperty
      | KeyValuePatternProperty
    )[]
  ).find((ast) => (ast.key as Identifier).value === key);
  if (!nameAst) {
    return;
  }

  return nameAst.type === "AssignmentPatternProperty"
    ? nameAst.key.value
    : (nameAst.value as Identifier).value;
}

export class MapVisitor extends Visitor {
  constructor(visitCb: Partial<Visitor>[]) {
    super();
    const keys = [
      ...new Set(visitCb.flatMap((item) => Object.keys(item))),
    ] as (keyof Visitor)[];

    for (const key of keys) {
      this[key] = (n: any) => {
        for (const visit of visitCb) {
          n = (visit[key] as any)?.call(this, n);
        }
        return n;
      };
    }
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
}

export function getSwcOptions(plugin: Visitor): Options {
  return {
    jsc: {
      parser: {
        syntax: "typescript",
        tsx: false,
      },
      target: "es2022",
      loose: false,
      minify: {
        compress: false,
        mangle: false,
      },
      preserveAllComments: true,
      transform: {
        optimizer: undefined,
      },
    },
    module: {
      type: "es6",
    },
    minify: false,
    isModule: true,
    inlineSourcesContent: true,
    plugin: (n) => plugin.visitProgram(n),
  };
}

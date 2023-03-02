import fs from "fs";
import { resolve } from "path";
import fg from "fast-glob";
import { loadConfig } from "unconfig";
import type {
  AssignmentPatternProperty,
  CallExpression,
  Expression,
  Identifier,
  ImportDeclaration,
  KeyValuePatternProperty,
  ObjectPattern,
  Span,
  TsType,
  TsTypeReference,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import slash from "slash";
import type { DefaultOption, Output, SetupAst } from "./constants";
import type MagicString from "magic-string";
import type { TransformOption } from "./transform/script";

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

function getPropsValueIdentifier(identifier: string) {
  let value = "";
  switch (identifier) {
    case "Function":
    case "Date": {
      value = identifier;
      break;
    }
    case "Array": {
      value = "any[]";
      break;
    }
    default: {
      value = identifier.toLocaleLowerCase();
      break;
    }
  }
  return value;
}
export function getPropsValue(
  ast: Expression,
  keyValue: string,
  script: string,
  offset: number,
  required = false,
) {
  if (ast.type === "Identifier") {
    return `${keyValue}${required ? "" : "?"}: ${getPropsValueIdentifier(
      ast.value,
    )}; `;
  }

  if (ast.type === "TsAsExpression") {
    const { span } = (ast.typeAnnotation as TsTypeReference).typeParams!
      .params[0];
    const { start, end } = getRealSpan(span, offset);
    return `${keyValue}${required ? "" : "?"}: ${script.slice(start, end)}; `;
  }

  if (ast.type === "ArrayExpression") {
    return `${keyValue}${required ? "" : "?"}: ${ast.elements
      .map((element) =>
        getPropsValueIdentifier((element!.expression as Identifier).value),
      )
      .join(" | ")}; `;
  }
  return "";
}

export function getSetupSecondParams(
  key: "attrs" | "slots" | "emit" | "expose",
  setupAst: SetupAst,
  output: Output,
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
      "The second argument to the setup function is not an object and cannot be resolved",
    );
    return;
  }

  const { properties } =
    setupParamsAst.type === "ObjectPattern"
      ? setupParamsAst
      : (setupParamsAst.pat as ObjectPattern);

  if (properties.some((ast) => ast.type === "RestElement")) {
    output.warn(
      "The second argument to the setup function has rest element(...rest) and cannot be resolved",
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

Visitor.prototype.visitTsType = (n: TsType) => {
  return n;
};
export class MapVisitor extends Visitor {
  constructor(visitCb: TransformOption["props"][], ms: MagicString) {
    super();
    const visits = visitCb.map((V) => new V!(ms));
    const keys = [
      ...new Set(
        visitCb.flatMap((item) => Object.getOwnPropertyNames(item!.prototype)),
      ),
    ].filter((key) => key !== "constructor") as (keyof Visitor)[];

    for (const key of keys) {
      if (key in this && typeof this[key] === "function") {
        this[key] = (n: any) => {
          for (const visit of visits) {
            (visit[key] as any)?.(n);
          }

          (super[key] as any)(n);
          return n;
        };
      }
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

    super.visitCallExpression(n);
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

export function getSpecifierOffset(
  n: ImportDeclaration,
  index: number,
  script: string,
  offset: number,
) {
  const { specifiers } = n;
  const ast = specifiers[index];
  let { end } = getRealSpan({ start: 0, end: ast.span.end }, offset);
  const span = getRealSpan({ start: ast.span.start, end: n.span.end }, offset);
  if (index + 1 === specifiers.length) {
    const commaIdx = script.slice(span.start, span.end).indexOf(",");
    if (commaIdx !== -1) {
      end = span.start + 1;
    }
  } else {
    end = getRealSpan(specifiers[index + 1].span, offset).start;
  }

  return { start: span.start, end };
}

function isUniCode(str: string) {
  return str.charCodeAt(0) > 127;
}

function getUniCodeLen(str: string) {
  return new TextEncoder().encode(str).length;
}

let unicodeMap: Map<number, number> = new Map();
export function genScriptUnicodeMap(script: string, offset: number) {
  if (unicodeMap.size !== 0) {
    unicodeMap = new Map();
  }
  let keyOffset = 0;
  let valueOffset = 0;
  for (let i = 0, len = script.length; i < len; i++) {
    const str = script[i];
    if (isUniCode(str)) {
      const len = getUniCodeLen(str);
      keyOffset += len;
      valueOffset += len - 1;
      unicodeMap.set(i + keyOffset + offset, valueOffset);
    }
  }
}

export function getRealSpan(
  { start, end }: Omit<Span, "ctxt">,
  offset: number,
) {
  if (!unicodeMap.size) {
    return { start: start - offset, end: end - offset };
  } else {
    let realStart = start;
    let realEnd = end;
    unicodeMap.forEach((value, key) => {
      if (start > key) {
        realStart = start - value;
      }
      if (end > key) {
        realEnd = end - value;
      }
    });

    return { start: realStart - offset, end: realEnd - offset };
  }
}

import type {
  ArrayExpression,
  ArrowFunctionExpression,
  Expression,
  Identifier,
  KeyValueProperty,
  MethodProperty,
  ModuleItem,
  ObjectExpression,
  Program,
  PropertyName,
  Span,
  Statement,
  TsType,
} from "@swc/core";
import { transformSync } from "@swc/core";

import { parseSync } from "@swc/core";
import { Visitor } from "@swc/core/Visitor";

import {
  Config,
  parseOption,
  USE_ATTRS,
  USE_SLOTS,
  VisitorCb,
} from "../constants";
import { getSwcOptions, MapVisitor, output } from "../utils";
import transformComponents from "./components";
import transformDirectives from "./directives";
import transformEmits from "./emits";
import transformProps from "./props";
import MagicString from "magic-string";
import transformExpose from "./expose";
import transformAttrsAndSlots from "./attrsAndSlots";

const ILLEGAL_OPTIONS_API = [
  "data",
  "watch",
  "computed",
  "methods",
  "created",
  "beforeMount",
  "mounted",
  "beforeUnmount",
  "unmounted",
  "beforeUpdate",
  "updated",
  "activated",
  "deactivated",
  "render",
  "errorCaptured",
  "serverPrefetch",
  "mixins",
  "extends",
] as readonly string[];

interface TransformOption {
  props?: {
    visitCb?: VisitorCb;
    str: string;
  };
  emits?: string;
  components?: string;
  directives?: {
    visitCb: VisitorCb;
    str: string;
  } | null;
  attrsAndSlots?: {
    getMagicString: (ast: Program, script: string) => string;
    str: string;
  } | null;
  expose?: {
    visitCb: VisitorCb;
    str: string;
  } | null;
}

function transformScript(config: Config) {
  const program = parseSync(config.script, parseOption);
  const {
    body,
    span: { start },
  } = program;

  config.offset = start;

  const exportDefaultAst = body.find(
    (item) => item.type === "ExportDefaultExpression",
  ) as { expression: Expression; span: Span };

  if (!exportDefaultAst) {
    output.warn(
      `The export default cannot be found in the ${config.fileAbsolutePath}`,
    );
    return null;
  }
  let optionAst: ObjectExpression | null = null;
  switch (exportDefaultAst.expression.type) {
    case "CallExpression": {
      optionAst = exportDefaultAst.expression.arguments[0]
        .expression as ObjectExpression;
      break;
    }
    case "ObjectExpression": {
      optionAst = exportDefaultAst.expression;
      break;
    }

    default:
      break;
  }

  if (!optionAst) {
    output.warn(
      `The options cannot be found in the ${config.fileAbsolutePath}`,
    );
    return null;
  }

  const setupAstIndex = optionAst.properties.findIndex((ast) => {
    if (
      (ast.type === "MethodProperty" || ast.type === "KeyValueProperty") &&
      (ast.key.type === "Identifier" || ast.key.type === "StringLiteral")
    ) {
      switch (ast.type) {
        case "MethodProperty":
          return ast.key.value === "setup";
        case "KeyValueProperty":
          return (
            ast.value.type === "ArrowFunctionExpression" &&
            ast.key.value === "setup"
          );

        default:
          return false;
      }
    }
    return false;
  });

  const [setupAst] = optionAst.properties.splice(setupAstIndex, 1) as [
    MethodProperty | KeyValueProperty,
  ];
  if (!setupAst) {
    output.warn(
      `There is no setup method in options in the ${config.fileAbsolutePath}`,
    );
    return null;
  }
  const setupFnAst =
    setupAst.type === "MethodProperty"
      ? setupAst
      : (setupAst.value as ArrowFunctionExpression);

  config.setupScript = config.script.slice(
    setupFnAst.span.start - config.offset,
    setupFnAst.span.end - config.offset,
  );

  const transformOption: TransformOption = {};
  for (const ast of optionAst.properties) {
    if (ast.type === "SpreadElement") {
      output.warn(
        `The Spread syntax(...) cannot be resolved in options in the ${config.fileAbsolutePath}`,
      );
      return null;
    }
    if (
      ast.type === "GetterProperty" ||
      ast.type === "SetterProperty" ||
      ast.type === "AssignmentProperty" ||
      ast.type === "MethodProperty"
    ) {
      continue;
    }

    const key = ast.type === "Identifier" ? ast.value : getOptionKey(ast.key);
    if (!key || ILLEGAL_OPTIONS_API.includes(key)) {
      output.warn(
        `${ILLEGAL_OPTIONS_API.join()} cannot be parsed in option in the ${
          config.fileAbsolutePath
        }`,
      );
      return null;
    }
    try {
      switch (key) {
        case "props": {
          transformOption.props = transformProps(
            ast.value as ArrayExpression | Identifier | ObjectExpression,
            setupFnAst,
            config,
          );
          break;
        }
        case "emit": {
          transformOption.emits = transformEmits(
            ast.value as ArrayExpression | Identifier | ObjectExpression,
            setupFnAst,
            config,
          );
          break;
        }
        case "components": {
          transformOption.components = transformComponents(
            ast.value as ArrayExpression | Identifier | ObjectExpression,
            setupFnAst,
            config,
          );
          break;
        }
        case "directives": {
          transformOption.directives = transformDirectives(
            ast.value as Identifier | ObjectExpression,
            setupFnAst,
            config,
          );
          break;
        }
        default:
          break;
      }
    } catch (error) {
      output.error(
        `Error parsing option item in the ${config.fileAbsolutePath}`,
      );
      console.log(error);
    }
  }

  try {
    transformOption.expose = transformExpose(setupFnAst, config);
    transformOption.attrsAndSlots = transformAttrsAndSlots(setupFnAst, config);
  } catch (error) {
    output.error(`Error parsing option item in the ${config.fileAbsolutePath}`);
    console.log(error);
  }

  let script = config.script;

  const visitCb: VisitorCb = {
    visitImportDeclaration(n) {
      if (n.source.value === "vue") {
        n.specifiers = n.specifiers.filter(
          (ast) => ast.local.value !== "defineComponent",
        );
      }

      return n;
    },
  };

  const visitCbs = [
    transformOption?.props?.visitCb!,
    transformOption?.directives?.visitCb!,
    transformOption?.expose?.visitCb!,
    visitCb,
  ].filter(Boolean);
  if (visitCbs.length) {
    const { code } = transformSync(
      script,
      getSwcOptions(new MapVisitor(visitCbs)),
    );
    script = code;
  }

  if (transformOption?.attrsAndSlots?.getMagicString) {
    script = transformOption.attrsAndSlots.getMagicString(
      parseSync(script, parseOption),
      script,
    );
  }

  const ast = parseSync(script, parseOption);

  const transformSetup = new TransformSetup(
    new MagicString(script),
    ast.span.start,
    script,
    transformOption,
  );
  transformSetup.visitProgram(ast);

  return transformSetup.getString();
}

export default transformScript;

function getOptionKey(key: PropertyName) {
  switch (key.type) {
    case "Identifier":
    case "StringLiteral":
      return key.value;

    default:
      return "";
  }
}

class TransformSetup extends Visitor {
  private stmts: Statement[] = [];
  ms: MagicString;
  offset: number;
  script: string;
  transformOption: TransformOption;
  constructor(
    ms: MagicString,
    offset: number,
    script: string,
    transformOption: TransformOption,
  ) {
    super();
    this.ms = ms;
    this.offset = offset;
    this.script = script;
    this.transformOption = transformOption;
  }

  getString() {
    return this.ms.toString();
  }

  visitModuleItems(items: ModuleItem[]) {
    for (let index = 0; index < items.length; index++) {
      const ast = items[index];
      if (ast.type === "ExportDefaultExpression") {
        this.visitModuleItem(ast);
        const indexs = this.stmts
          .reduce<{ start: number | null; end: number | null }[]>(
            (p, c, currentIndex, array) => {
              const { start, end } = c.span;
              const index = p[p.length - 1];
              if (c.type === "ReturnStatement") {
                if (index) {
                  index.end = end;
                }
                p.push({ start: null, end: null });
                return p;
              }
              if (p.length > 1 && index.start === null && index.end === null) {
                index.start = start;
                return p;
              }
              if (currentIndex === 0 && !p.length) {
                p.push({ start, end: null });
              }
              if (currentIndex === array.length - 1) {
                index.end = end;
              }
              return p;
            },
            [],
          )
          .filter((index) => index.start !== null && index.end !== null);

        this.ms.update(
          ast.span.start - this.offset,
          ast.span.end - this.offset,
          indexs
            .map(({ start, end }) =>
              this.script.slice(start! - this.offset, end! - this.offset),
            )
            .join("\n"),
        );

        const { props, emits, components, directives, attrsAndSlots, expose } =
          this.transformOption;
        this.ms.appendLeft(
          ast.span.start - this.offset,
          `${props ? `\n${props.str}\n` : ""}${emits ? `\n${emits}\n` : ""}${
            components ? `\n${components}\n` : ""
          }${directives?.str ? `\n${directives.str}\n` : ""}${
            attrsAndSlots?.str ? `\n${attrsAndSlots.str}\n` : ""
          }`,
        );

        this.ms.appendRight(
          ast.span.end - this.offset,
          `${expose?.str ? `\n${expose.str}\n` : ""}`,
        );
      }

      if (
        ast.type === "ExpressionStatement" &&
        ast.expression.type === "CallExpression" &&
        ast.expression.callee.type === "Identifier" &&
        (ast.expression.callee.value === USE_ATTRS ||
          ast.expression.callee.value === USE_SLOTS)
      ) {
        const {
          span: { start, end },
        } = ast;
        this.ms.remove(start - this.offset, end - this.offset);
      }
    }

    return items;
  }

  visitMethodProperty(node: MethodProperty) {
    if (
      (node.key.type === "Identifier" || node.key.type === "StringLiteral") &&
      node.key.value === "setup"
    ) {
      this.stmts = node.body?.stmts?.filter(
        (ast) => ast.type !== "ReturnStatement",
      )!;
    }
    return node;
  }

  visitKeyValueProperty(node: KeyValueProperty) {
    if (
      (node.key.type === "Identifier" || node.key.type === "StringLiteral") &&
      node.key.value === "setup" &&
      node.value.type === "ArrowFunctionExpression"
    ) {
      const { body } = node.value;
      this.stmts =
        body.type === "BlockStatement"
          ? body.stmts.filter((ast) => ast.type !== "ReturnStatement")!
          : [];
    }
    return node;
  }

  visitTsType(n: TsType) {
    return n;
  }
}

import type {
  ArrayExpression,
  ArrowFunctionExpression,
  ExportDefaultExpression,
  Expression,
  Identifier,
  ImportDeclaration,
  KeyValueProperty,
  MethodProperty,
  ObjectExpression,
  PropertyName,
  Span,
  Statement,
} from "@swc/core";

import { parseSync } from "@swc/core";

import { Config, parseOption } from "../constants";
import {
  genScriptUnicodeMap,
  getRealSpan,
  getSpecifierOffset,
  MapVisitor,
  output,
} from "../utils";
import transformComponents from "./components";
import transformDirectives from "./directives";
import transformEmits from "./emits";
import transformProps from "./props";
import MagicString from "magic-string";
import transformExpose from "./expose";
import transformAttrsAndSlots from "./attrsAndSlots";
import { Visitor } from "@swc/core/Visitor.js";

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

export interface TransformOption {
  props?: ReturnType<typeof transformProps>;
  emits?: ReturnType<typeof transformEmits>;
  components?: ReturnType<typeof transformComponents>;
  directives?: ReturnType<typeof transformDirectives>;
  attrsAndSlots?: ReturnType<typeof transformAttrsAndSlots>;
  expose?: ReturnType<typeof transformExpose>;
  setup?: ReturnType<typeof transformProps>;
}

function transformScript(config: Config) {
  const program = parseSync(config.script, parseOption);

  const {
    body,
    span: { start },
  } = program;

  config.offset = start;
  genScriptUnicodeMap(config.script, start);

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

  const setupAst = optionAst.properties.find((ast) => {
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
  }) as MethodProperty | KeyValueProperty;
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
      const value = ast.type === "Identifier" ? ast : ast.value;
      switch (key) {
        case "props": {
          transformOption.props = transformProps(
            value as ArrayExpression | Identifier | ObjectExpression,
            setupFnAst,
            config,
          );
          break;
        }
        case "emits": {
          transformOption.emits = transformEmits(
            value as ArrayExpression | Identifier | ObjectExpression,
            setupFnAst,
            config,
          );
          break;
        }
        case "components": {
          transformOption.components = transformComponents(
            value as ArrayExpression | Identifier | ObjectExpression,
            setupFnAst,
            config,
          );
          break;
        }
        case "directives": {
          transformOption.directives = transformDirectives(
            value as Identifier | ObjectExpression,
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
    if (!transformOption.emits) {
      transformOption.emits = transformEmits(null, setupFnAst, config);
    }
    transformOption.expose = transformExpose(setupFnAst, config);
    transformOption.attrsAndSlots = transformAttrsAndSlots(setupFnAst, config);
  } catch (error) {
    output.error(`Error parsing option item in the ${config.fileAbsolutePath}`);
    console.log(error);
  }

  const { script, offset } = config;
  class SetupVisitor extends Visitor {
    ms: MagicString;
    exportDefaultExpressionSpan = {
      start: 0,
      end: 0,
    };
    constructor(ms: MagicString) {
      super();
      this.ms = ms;
    }
    visitExportDefaultExpression(node: ExportDefaultExpression) {
      this.exportDefaultExpressionSpan = node.span;
      return node;
    }
    myVisitStatements(items: Statement[]) {
      const { start, end } = this.exportDefaultExpressionSpan;

      for (const ast of items) {
        if (ast.type === "ReturnStatement") {
          const { start, end } = getRealSpan(ast.span, offset);
          this.ms.remove(start, end);
          break;
        }
      }

      const firstNode = items[0];
      const lastNode = items[items.length - 1];
      if (firstNode) {
        const frontSpan = getRealSpan(
          { start, end: firstNode.span.start },
          offset,
        );
        this.ms.remove(frontSpan.start, frontSpan.end);
        const rearSpan = getRealSpan({ start: lastNode.span.end, end }, offset);
        this.ms.remove(rearSpan.start, rearSpan.end);
      }

      return items;
    }
    visitMethodProperty(node: MethodProperty) {
      if (
        (node.key.type === "Identifier" || node.key.type === "StringLiteral") &&
        node.key.value === "setup" &&
        node.body?.stmts
      ) {
        this.myVisitStatements(node.body.stmts);
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
        if (body.type === "BlockStatement") {
          this.myVisitStatements(body.stmts);
        }
      }
      return node;
    }
    visitImportDeclaration(n: ImportDeclaration) {
      if (n.source.value === "vue") {
        const index = n.specifiers.findIndex(
          (ast) => ast.local.value === "defineComponent",
        );
        if (index !== -1) {
          const { start, end } = getSpecifierOffset(n, index, script, offset);
          this.ms.remove(start, end);
          n.specifiers.splice(index, 1);
        }
        if (!n.specifiers.length) {
          const { start, end } = getRealSpan(n.span, offset);
          this.ms.remove(start, end);
        }
      }

      return n;
    }
  }

  transformOption.setup = SetupVisitor;

  const ms = new MagicString(script);

  const visitCbs = [
    transformOption?.components,
    transformOption?.props,
    transformOption?.emits,
    transformOption?.directives,
    transformOption?.attrsAndSlots,
    transformOption?.setup,
    transformOption?.expose,
  ].filter(Boolean) as TransformOption["props"][];
  if (visitCbs.length) {
    const visitor = new MapVisitor(visitCbs, ms);
    visitor.visitProgram(program);
  }

  return `${ms.toString()}\n`;
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

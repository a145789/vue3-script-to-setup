import type {
  ArrayExpression,
  ArrowFunctionExpression,
  Expression,
  Identifier,
  KeyValueProperty,
  MethodProperty,
  ObjectExpression,
  PropertyName,
  Span,
  Statement,
} from "@swc/core";

import { parseSync } from "@swc/core";

import { Config, parseOption, VisitorCb } from "../constants";
import { MapVisitor, output } from "../utils";
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
  props?: VisitorCb;
  emits?: VisitorCb;
  components?: VisitorCb;
  directives?: VisitorCb;
  attrsAndSlots?: VisitorCb;
  expose?: VisitorCb;
  setup?: VisitorCb;
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

  const transformOption: TransformOption = {
    setup: {
      visitExportDefaultExpression(node) {
        this.exportDefaultExpressionSpan = node.span;
        return node;
      },
      myVisitStatements(items: Statement[]) {
        const { start, end } = this.exportDefaultExpressionSpan!;

        for (const ast of items) {
          if (ast.type === "ReturnStatement") {
            this.ms?.remove(ast.span.start - offset, ast.span.end - offset);
            break;
          }
        }

        const firstNode = items[0];
        const lastNode = items[items.length - 1];
        if (firstNode) {
          this.ms?.remove(start - offset, firstNode.span.start);
          this.ms?.remove(lastNode.span.end - offset, end - offset);
        }

        return items;
      },
      visitMethodProperty(node: MethodProperty) {
        if (
          (node.key.type === "Identifier" ||
            node.key.type === "StringLiteral") &&
          node.key.value === "setup" &&
          node.body?.stmts
        ) {
          this.myVisitStatements(node.body.stmts);
        }
        return node;
      },
      visitKeyValueProperty(node: KeyValueProperty) {
        if (
          (node.key.type === "Identifier" ||
            node.key.type === "StringLiteral") &&
          node.key.value === "setup" &&
          node.value.type === "ArrowFunctionExpression"
        ) {
          const { body } = node.value;
          if (body.type === "BlockStatement") {
            this.myVisitStatements(body.stmts);
          }
        }
        return node;
      },
      visitImportDeclaration(n) {
        if (n.source.value === "vue") {
          if (
            n.specifiers.some((ast) => ast.local.value === "defineComponent")
          ) {
            const {
              span: { start, end },
            } = n;
            const importStr = script
              .slice(start - offset, end - offset)
              .replace(/defineComponent\s*\,?/g, "");
            this.ms?.update(start - offset, end - offset, importStr);
          }
        }

        return n;
      },
    },
  };
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

  const { script, offset } = config;

  const ms = new MagicString(script);

  const visitCbs = [
    transformOption?.components,
    transformOption?.props,
    transformOption?.emits,
    transformOption?.directives,
    transformOption?.attrsAndSlots,
    transformOption?.setup,
    transformOption?.expose,
  ].filter(Boolean) as VisitorCb[];
  if (visitCbs.length) {
    const visitor = new MapVisitor(visitCbs, ms);
    visitor.visitProgram(program);
  }

  return ms.toString();
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

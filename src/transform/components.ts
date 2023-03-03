import type {
  ArrayExpression,
  ExportDefaultExpression,
  Identifier,
  ObjectExpression,
} from "@swc/core";
import { ScriptOptions, SetupAst } from "../constants";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";
import { getRealSpan } from "./utils";

function transformComponents(
  componentsAst: ArrayExpression | Identifier | ObjectExpression,
  _setupAst: SetupAst,
  config: ScriptOptions,
) {
  const { script, offset } = config;
  if (
    componentsAst.type === "ArrayExpression" ||
    componentsAst.type === "Identifier"
  ) {
    return;
  }

  const { properties } = componentsAst;

  const str = properties.reduce((p, c) => {
    if (c.type === "KeyValueProperty" && c.key.type !== "Computed") {
      const key = c.key.value;

      const { span } = c.value as Identifier;

      const { start, end } = getRealSpan(span, offset);
      p += `const ${key} = ${script.slice(start, end)};\n`;
    }

    return p;
  }, "");

  if (!str) {
    return;
  } else {
    class MyVisitor extends Visitor {
      ms: MagicString;
      constructor(ms: MagicString) {
        super();
        this.ms = ms;
      }
      visitExportDefaultExpression(node: ExportDefaultExpression) {
        const { start } = getRealSpan(node.span, offset);
        this.ms.appendLeft(start, str);

        return node;
      }
    }
    return MyVisitor;
  }
}

export default transformComponents;

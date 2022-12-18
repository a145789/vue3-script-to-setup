import type {
  ArrayExpression,
  ExportDefaultExpression,
  Identifier,
  ObjectExpression,
} from "@swc/core";
import { Config, SetupAst } from "../constants";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

function transformComponents(
  componentsAst: ArrayExpression | Identifier | ObjectExpression,
  _setupAst: SetupAst,
  config: Config,
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

      const {
        span: { start, end },
      } = c.value as Identifier;

      p += `const ${key} = ${script.slice(start - offset, end - offset)};\n`;
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
        const {
          span: { start },
        } = node;
        this.ms.appendLeft(start - offset, str);

        return node;
      }
    }
    return MyVisitor;
  }
}

export default transformComponents;

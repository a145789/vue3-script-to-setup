import type { ArrayExpression, Identifier, ObjectExpression } from "@swc/core";
import { Config, SetupAst, VisitorCb } from "../constants";

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
    return {
      visitExportDefaultExpression(node) {
        const {
          span: { start },
        } = node;
        this.ms?.appendLeft(start - offset, str);

        return node;
      },
    } as VisitorCb;
  }
}

export default transformComponents;

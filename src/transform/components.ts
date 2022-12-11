import type { ArrayExpression, Identifier, ObjectExpression } from "@swc/core";
import { Config, SetupAst } from "../constants";

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
    return "";
  }

  const { properties } = componentsAst;

  return properties.reduce((p, c) => {
    if (c.type === "KeyValueProperty" && c.key.type !== "Computed") {
      const key = c.key.value;

      const {
        span: { start, end },
      } = c.value as Identifier;

      p += `const ${key} = ${script.slice(start - offset, end - offset)};\n`;
    }

    return p;
  }, "");
}

export default transformComponents;

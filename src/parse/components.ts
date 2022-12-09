import type {
    ArrayExpression,
    ArrowFunctionExpression,
    Identifier,
    MethodProperty,
    ObjectExpression,
  } from "@swc/core";
  import { Config } from "../constants";
  
  function transformComponents(
    componentsAst: ArrayExpression | Identifier | ObjectExpression,
    _setupAst: ArrowFunctionExpression | MethodProperty,
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
  
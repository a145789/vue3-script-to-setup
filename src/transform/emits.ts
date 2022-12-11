import type { Identifier, ArrayExpression, ObjectExpression } from "@swc/core";

import { Config, SetupAst } from "../constants";
import { GetCallExpressionFirstArg, getSetupSecondParams } from "../utils";

function transformEmits(
  emitsAst: ArrayExpression | ObjectExpression | Identifier,
  setupAst: SetupAst,
  config: Config,
) {
  const { script, offset, setupScript, fileAbsolutePath } = config;
  const name = getSetupSecondParams("emit", setupAst, fileAbsolutePath);
  if (!name) {
    return "";
  }

  const preCode = `const ${name} = `;

  if (emitsAst.type === "ObjectExpression") {
    const {
      span: { start, end },
    } = emitsAst;
    return `${preCode}defineEmits(${script.slice(
      start - offset,
      end - offset,
    )});`;
  }

  if (emitsAst.type === "Identifier") {
    return `${preCode}defineEmits(${emitsAst.value});`;
  }

  let emitNames: string[] = [];
  if (setupScript) {
    const visitor = new GetCallExpressionFirstArg(name);
    visitor.visitFn(setupAst);

    const setupOffset = setupAst.span.start;

    emitNames = (visitor.firstArgAst as Identifier[]).map((ast) => {
      const {
        span: { start, end },
      } = ast;
      return setupScript.slice(start - setupOffset, end - setupOffset);
    });
  }

  const keys = emitsAst.elements.map((ast) => {
    const {
      span: { start, end },
    } = ast!.expression as Identifier;
    return script.slice(start - offset, end - offset);
  });

  return `${preCode}defineEmits([${[...keys, ...emitNames].join(", ")}]);`;
}

export default transformEmits;

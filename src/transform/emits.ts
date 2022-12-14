import type { Identifier, ArrayExpression, ObjectExpression } from "@swc/core";

import { Config, SetupAst, VisitorCb } from "../constants";
import { GetCallExpressionFirstArg, getSetupSecondParams } from "../utils";

function transformEmits(
  emitsAst: ArrayExpression | ObjectExpression | Identifier,
  setupAst: SetupAst,
  config: Config,
) {
  const { script, offset, setupScript, fileAbsolutePath } = config;
  const name = getSetupSecondParams("emit", setupAst, fileAbsolutePath);
  if (!name) {
    return;
  }

  const preCode = `const ${name} = `;
  let str = "";
  const visitStrCb: VisitorCb = {
    visitExportDefaultExpression(node) {
      const {
        span: { start },
      } = node;
      this.ms?.appendLeft(start - offset, str);

      return node;
    },
  };

  if (emitsAst.type === "ObjectExpression") {
    const {
      span: { start, end },
    } = emitsAst;
    str = `${preCode}defineEmits(${script.slice(
      start - offset,
      end - offset,
    )});`;

    return visitStrCb;
  }

  if (emitsAst.type === "Identifier") {
    str = `${preCode}defineEmits(${emitsAst.value});`;
    return visitStrCb;
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

  str = `${preCode}defineEmits([${[...keys, ...emitNames].join(", ")}]);`;
  return visitStrCb;
}

export default transformEmits;

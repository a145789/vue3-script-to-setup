import type {
  Identifier,
  ArrayExpression,
  ObjectExpression,
  ExportDefaultExpression,
} from "@swc/core";

import { Config, SetupAst } from "../constants";
import {
  GetCallExpressionFirstArg,
  getRealSpan,
  getSetupSecondParams,
} from "../utils";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

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

  if (emitsAst.type === "ObjectExpression") {
    const { start, end } = getRealSpan(emitsAst.span, offset);
    str = `${preCode}defineEmits(${script.slice(start, end)});\n`;

    return MyVisitor;
  }

  if (emitsAst.type === "Identifier") {
    str = `${preCode}defineEmits(${emitsAst.value});`;
    return MyVisitor;
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
    const { span } = ast!.expression as Identifier;
    const { start, end } = getRealSpan(span, offset);
    return script.slice(start, end);
  });

  str = `${preCode}defineEmits([${[...keys, ...emitNames].join(", ")}]);\n`;
  return MyVisitor;
}

export default transformEmits;

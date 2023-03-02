import { ScriptOptions, SetupAst } from "../constants";
import {
  GetCallExpressionFirstArg,
  getRealSpan,
  getSetupSecondParams,
} from "../utils";
import type {
  BlockStatement,
  ExportDefaultExpression,
  KeyValueProperty,
  MethodProperty,
  Statement,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

function transformExpose(setupAst: SetupAst, config: ScriptOptions) {
  const { script, offset, output } = config;
  const name = getSetupSecondParams("expose", setupAst, output);
  if (!name) {
    return;
  }

  let exposeArg: string[] = [];
  if ((setupAst.body as BlockStatement)?.stmts?.length) {
    const visitor = new GetCallExpressionFirstArg(name);
    visitor.visitFn(setupAst);

    exposeArg = visitor.firstArgAst
      .flatMap((ast) => {
        if (ast.type !== "ObjectExpression") {
          return "";
        }

        const { start, end } = getRealSpan(ast.span, offset);

        return script.slice(start, end).replace(/{|}/g, "").split(",");
      })
      .filter((s) => Boolean(s.trim()));
  }
  class MyVisitor extends Visitor {
    ms: MagicString;
    constructor(ms: MagicString) {
      super();
      this.ms = ms;
    }
    visitMethodProperty(n: MethodProperty) {
      if (n.key.type === "Identifier" && n.key.value === "setup") {
        if (n.body) {
          n.body.stmts = this.myVisitStatements(n.body.stmts);
        }
      }

      return n;
    }
    visitKeyValueProperty(n: KeyValueProperty) {
      if (
        n.key.type === "Identifier" &&
        n.key.value === "setup" &&
        n.value.type === "ArrowFunctionExpression"
      ) {
        if (n.value.body.type === "BlockStatement") {
          n.value.body.stmts = this.myVisitStatements(n.value.body.stmts);
        }
      }
      return n;
    }
    myVisitStatements(stmts: Statement[]): Statement[] {
      for (const stmt of stmts) {
        if (
          stmt.type === "ExpressionStatement" &&
          stmt.expression.type === "CallExpression" &&
          stmt.expression.callee.type === "Identifier" &&
          stmt.expression.callee.value === name
        ) {
          const { start, end } = getRealSpan(stmt.span, offset);
          this.ms.remove(start, end);
        }
      }
      return stmts;
    }
    visitExportDefaultExpression(node: ExportDefaultExpression) {
      const { end } = getRealSpan(node.span, offset);
      this.ms.appendRight(end, `defineExpose({${exposeArg.join(",")}});\n`);

      return node;
    }
  }

  return MyVisitor;
}

export default transformExpose;

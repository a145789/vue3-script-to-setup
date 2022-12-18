import { Config, SetupAst } from "../constants";
import { GetCallExpressionFirstArg, getSetupSecondParams } from "../utils";
import {
  ExportDefaultExpression,
  KeyValueProperty,
  MethodProperty,
  Statement,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

function transformExpose(setupAst: SetupAst, config: Config) {
  const { setupScript, offset, fileAbsolutePath } = config;
  const name = getSetupSecondParams("expose", setupAst, fileAbsolutePath);
  if (!name) {
    return;
  }

  let exposeArg: string[] = [];
  if (setupScript) {
    const visitor = new GetCallExpressionFirstArg(name);
    visitor.visitFn(setupAst);

    const setupOffset = setupAst.span.start;
    exposeArg = visitor.firstArgAst
      .flatMap((ast) => {
        if (ast.type !== "ObjectExpression") {
          return "";
        }

        const {
          span: { start, end },
        } = ast;

        return setupScript
          .slice(start - setupOffset, end - setupOffset)
          .replace(/{|}/g, "")
          .split(",");
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
          this.ms.remove(stmt.span.start - offset, stmt.span.end - offset);
        }
      }
      return stmts;
    }
    visitExportDefaultExpression(node: ExportDefaultExpression) {
      const {
        span: { end },
      } = node;
      this.ms.appendRight(
        end - offset,
        `defineExpose({${exposeArg.join(",")}});\n`,
      );

      return node;
    }
  }

  return MyVisitor;
}

export default transformExpose;

import type { ArrowFunctionExpression, MethodProperty } from "@swc/core";
import { Config } from "../constants";
import Visitor from "@swc/core/Visitor";
import { GetCallExpressionFirstArg, getSetupHasSecondParams } from "../utils";

function transformExpose(
  _: null,
  setupAst: ArrowFunctionExpression | MethodProperty,
  config: Config,
) {
  const { setupScript } = config;
  const name = getSetupHasSecondParams("expose", setupAst);
  if (!name) {
    return null;
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

  const str = `const ${name} = defineExpose({${exposeArg.join(",")}});`;

  const visitCb: Partial<Visitor> = {
    visitMethodProperty(n) {
      if (n.key.type === "Identifier" && n.key.value === "setup") {
        if (n.body) {
          n.body.stmts = this.visitStatements!(n.body.stmts);
        }
      }
      return n;
    },
    visitKeyValueProperty(n) {
      if (
        n.key.type === "Identifier" &&
        n.key.value === "setup" &&
        n.value.type === "ArrowFunctionExpression"
      ) {
        if (n.value.body.type === "BlockStatement") {
          n.value.body.stmts = this.visitStatements!(n.value.body.stmts);
        }
      }
      return n;
    },
    visitStatements(stmts) {
      return stmts.filter(
        (stmt) =>
          !(
            stmt.type === "ExpressionStatement" &&
            stmt.expression.type === "CallExpression" &&
            stmt.expression.callee.type === "Identifier" &&
            stmt.expression.callee.value === name
          ),
      );
    },
  };

  return {
    visitCb,
    str,
  };
}

export default transformExpose;

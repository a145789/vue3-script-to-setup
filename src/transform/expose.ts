import { Config, SetupAst, VisitorCb } from "../constants";
import { GetCallExpressionFirstArg, getSetupSecondParams } from "../utils";
import { Statement } from "@swc/core";

function transformExpose(setupAst: SetupAst, config: Config) {
  const { setupScript, fileAbsolutePath } = config;
  const name = getSetupSecondParams("expose", setupAst, fileAbsolutePath);
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

  const visitCb: VisitorCb = {
    visitMethodProperty(n) {
      n.key = this.visitPropertyName!(n.key);
      if (n.body) {
        n.body = this.visitBlockStatement!(n.body);
      }
      n.decorators = this.visitDecorators!(n.decorators);
      n.params = this.visitParameters!(n.params);
      n.returnType = this.visitTsTypeAnnotation!(n.returnType);
      n.typeParameters = this.visitTsTypeParameterDeclaration!(
        n.typeParameters,
      );
      if (n.key.type === "Identifier" && n.key.value === "setup") {
        if (n.body) {
          n.body.stmts = this.myVisitStatements(n.body.stmts);
        }
      }

      return n;
    },
    visitKeyValueProperty(n) {
      n.key = this.visitPropertyName!(n.key);
      n.value = this.visitExpression!(n.value);
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
    },
    myVisitStatements(stmts: Statement[]): Statement[] {
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

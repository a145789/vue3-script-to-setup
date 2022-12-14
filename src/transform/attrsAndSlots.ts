import type { ImportSpecifier } from "@swc/core";
import {
  Config,
  SetupAst,
  USE_ATTRS,
  USE_SLOTS,
  VisitorCb,
} from "../constants";
import { getSetupSecondParams } from "../utils";

function transformAttrsAndSlots(
  setupAst: SetupAst,
  { offset, fileAbsolutePath }: Config,
) {
  const attrsName = getSetupSecondParams("attrs", setupAst, fileAbsolutePath);
  const slotsName = getSetupSecondParams("slots", setupAst, fileAbsolutePath);
  if (!(attrsName || slotsName)) {
    return;
  }

  const visitCb: VisitorCb = {
    visitImportDeclaration(n) {
      if (n.source.value === "vue") {
        this.myVisitImportSpecifiers(n.specifiers);
      }
      return n;
    },
    myVisitImportSpecifiers(n: ImportSpecifier[]) {
      this.isHas = n.reduce((p, ast) => {
        if (ast.type === "ImportSpecifier") {
          if (ast.local.value === USE_ATTRS) {
            p.attrs = true;
          }

          if (ast.local.value === USE_SLOTS) {
            p.slots = true;
          }
        }

        return p;
      }, this.isHas);

      const {
        ms,
        isHas: { attrs, slots },
        declarationEnd,
      } = this;

      const lastNode = n[n.length - 1];

      if (lastNode) {
        const {
          span: { end },
        } = lastNode;

        ms?.appendRight(
          end - offset,
          `${
            ms
              ?.toString()
              .slice(end - offset, declarationEnd - offset)
              .includes(",")
              ? ""
              : ", "
          }${!attrs ? `${USE_ATTRS}, ` : ""}${!slots ? `${USE_SLOTS}, ` : ""}`,
        );
      }

      return n;
    },
    visitExportDefaultExpression(node) {
      const {
        ms,
        isHas: { attrs, slots },
      } = this;
      if (!(attrs && slots)) {
        return node;
      }

      const {
        span: { start },
      } = node;
      ms?.appendLeft(
        start - offset,
        `\n${!attrs ? `const ${attrsName} = useAttrs();\n` : ""}${
          !slots ? `const ${slotsName} = useSlots();\n` : ""
        }\n`,
      );

      return node;
    },
  };

  return visitCb;
}

export default transformAttrsAndSlots;

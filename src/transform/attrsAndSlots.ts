import type {
  ExportDefaultExpression,
  ImportDeclaration,
  ImportSpecifier,
} from "@swc/core";
import { Config, SetupAst } from "../constants";
import { getSetupSecondParams } from "../utils";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

function transformAttrsAndSlots(
  setupAst: SetupAst,
  { offset, fileAbsolutePath }: Config,
) {
  const attrsName = getSetupSecondParams("attrs", setupAst, fileAbsolutePath);
  const slotsName = getSetupSecondParams("slots", setupAst, fileAbsolutePath);
  if (!(attrsName || slotsName)) {
    return;
  }

  class MyVisitor extends Visitor {
    ms: MagicString;
    isHas = {
      attrs: false,
      slots: false,
    };
    constructor(ms: MagicString) {
      super();
      this.ms = ms;
    }
    visitImportDeclaration(n: ImportDeclaration) {
      if (n.source.value === "vue") {
        this.myVisitImportSpecifiers(n.specifiers);
      }
      return n;
    }
    myVisitImportSpecifiers(n: ImportSpecifier[]) {
      this.isHas = n.reduce((p, ast) => {
        if (ast.type === "ImportSpecifier") {
          if (ast.local.value === "useAttrs") {
            p.attrs = true;
          }

          if (ast.local.value === "useSlots") {
            p.slots = true;
          }
        }

        return p;
      }, this.isHas);

      const {
        ms,
        isHas: { attrs, slots },
      } = this;

      const firstNode = n[0];

      if (firstNode) {
        const {
          span: { start },
        } = firstNode;

        ms.appendLeft(
          start - offset,
          `${!attrs ? "useAttrs, " : ""}${!slots ? "useSlots, " : ""}`,
        );
      }

      return n;
    }
    visitExportDefaultExpression(node: ExportDefaultExpression) {
      const {
        ms,
        isHas: { attrs, slots },
      } = this;
      if (attrs && slots) {
        return node;
      }

      const {
        span: { start },
      } = node;
      ms.appendLeft(
        start - offset,
        `\n${!attrs ? `const ${attrsName} = useAttrs();\n` : ""}${
          !slots ? `const ${slotsName} = useSlots();\n` : ""
        }\n`,
      );

      return node;
    }
  }

  return MyVisitor;
}

export default transformAttrsAndSlots;

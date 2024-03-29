import type {
  ExportDefaultExpression,
  ImportDeclaration,
  ImportSpecifier,
} from "@swc/core";
import { ScriptOptions, SetupAst } from "../constants";
import { getRealSpan, getSetupSecondParams } from "./utils";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

function transformAttrsAndSlots(
  setupAst: SetupAst,
  { offset, output }: ScriptOptions,
) {
  const attrsName = getSetupSecondParams("attrs", setupAst, output);
  const slotsName = getSetupSecondParams("slots", setupAst, output);
  if (!(attrsName || slotsName)) {
    return;
  }

  class MyVisitor extends Visitor {
    ms: MagicString;
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
      const { attrs, slots } = n.reduce(
        (p, ast) => {
          if (ast.type === "ImportSpecifier") {
            if (ast.local.value === "useAttrs") {
              p.attrs = true;
            }

            if (ast.local.value === "useSlots") {
              p.slots = true;
            }
          }

          return p;
        },
        {
          attrs: false,
          slots: false,
        },
      );

      const firstNode = n[0];
      if (firstNode) {
        const { start } = getRealSpan(firstNode.span, offset);
        this.ms.appendLeft(
          start,
          `${!attrs && attrsName ? "useAttrs, " : ""}${
            !slots && slotsName ? "useSlots, " : ""
          }`,
        );
        if (!attrs && attrsName) {
          n.unshift({
            type: "ImportSpecifier",
            span: {
              start: 41,
              end: 50,
              ctxt: 0,
            },
            local: {
              type: "Identifier",
              span: {
                start: 41,
                end: 50,
                ctxt: 1,
              },
              value: "useAttrs",
              optional: false,
            },
            isTypeOnly: false,
          });
        }
        if (!slots && slotsName) {
          n.unshift({
            type: "ImportSpecifier",
            span: {
              start: 41,
              end: 50,
              ctxt: 0,
            },
            local: {
              type: "Identifier",
              span: {
                start: 41,
                end: 50,
                ctxt: 1,
              },
              value: "useSlots",
              optional: false,
            },
            isTypeOnly: false,
          });
        }
      }

      return n;
    }
    visitExportDefaultExpression(node: ExportDefaultExpression) {
      const { start } = getRealSpan(node.span, offset);
      this.ms.appendLeft(
        start,
        `\n${attrsName ? `const ${attrsName} = useAttrs();\n` : ""}${
          slotsName ? `const ${slotsName} = useSlots();\n` : ""
        }\n`,
      );

      return node;
    }
  }

  return MyVisitor;
}

export default transformAttrsAndSlots;

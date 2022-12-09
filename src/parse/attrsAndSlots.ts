import type {
    ArrowFunctionExpression,
    ImportSpecifier,
    MethodProperty,
  } from "@swc/core";
  import { Config } from "../constants";
  import type Visitor from "@swc/core/Visitor";
  import { getSetupHasSecondParams } from "../utils";
  
  const USE_ATTRS = "useAttrs" as const;
  const USE_SLOTS = "useSlots" as const;
  
  function transformAttrsAndSlots(
    _: null,
    setupAst: ArrowFunctionExpression | MethodProperty,
    _config: Config,
  ) {
    const attrsName = getSetupHasSecondParams("attrs", setupAst);
    const slotsName = getSetupHasSecondParams("slots", setupAst);
    if (!(attrsName || slotsName)) {
      return null;
    }
  
    const str = `${attrsName ? `const ${attrsName} = useAttrs();\n` : ""}${
      slotsName ? `const ${slotsName} = useSlots();\n` : ""
    }`;
  
    //   TODO: 方案等待
    const visitCb: Partial<Visitor> = {
      visitImportDeclaration(n) {
        if (n.source.value === "vue") {
          n.specifiers = this.visitImportSpecifiers?.(n.specifiers) || [];
        }
  
        return n;
      },
      visitImportSpecifiers(n) {
        if (
          !n.some(
            (ast) =>
              ast.type === "ImportSpecifier" && ast.local.value === USE_ATTRS,
          )
        ) {
          const importSpecifier: ImportSpecifier = {
            type: "ImportSpecifier",
            span: {
              start: 0,
              end: 0,
              ctxt: 0,
            },
            local: {
              type: "Identifier",
              span: {
                start: 0,
                end: 0,
                ctxt: 0,
              },
              value: "",
              optional: false,
            },
            imported: null as any,
            isTypeOnly: false,
          };
          importSpecifier.local.value = USE_ATTRS;
          n.push(importSpecifier);
        }
  
        if (
          !n.some(
            (ast) =>
              ast.type === "ImportSpecifier" && ast.local.value === USE_SLOTS,
          )
        ) {
          const importSpecifier: ImportSpecifier = {
            type: "ImportSpecifier",
            span: {
              start: 0,
              end: 0,
              ctxt: 0,
            },
            local: {
              type: "Identifier",
              span: {
                start: 0,
                end: 0,
                ctxt: 0,
              },
              value: "",
              optional: false,
            },
            imported: null as any,
            isTypeOnly: false,
          };
          importSpecifier.local.value = USE_SLOTS;
          n.push(importSpecifier);
        }
        return n;
      },
    };
  
    return {
      visitCb,
      str,
    };
  }
  
  export default transformAttrsAndSlots;
  
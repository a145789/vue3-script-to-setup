import type { Identifier, ObjectExpression } from "@swc/core";
import { Config, SetupAst, VisitorCb } from "../constants";
import { output } from "../utils";

function transformDirectiveName(name: string) {
  return `v${name.slice(0, 1).toLocaleUpperCase() + name.slice(1)}`;
}

function transformDirectives(
  directivesAst: Identifier | ObjectExpression,
  _setupAst: SetupAst,
  config: Config,
) {
  const { script, offset, fileAbsolutePath } = config;
  if (
    directivesAst.type === "Identifier" ||
    directivesAst.properties.some((ast) => ast.type === "SpreadElement")
  ) {
    output.warn(
      `Please manually modify the custom directives in ${fileAbsolutePath}.`,
    );
    return null;
  }

  const { properties } = directivesAst;

  if (!properties.length) {
    return null;
  }

  const importDirective: string[] = [];
  const str = `// custom directive \n${properties.reduce((p, c) => {
    if (c.type === "Identifier") {
      // 设置一个转换回调
      importDirective.push(c.value);
    }

    if (c.type === "KeyValueProperty" && c.key.type !== "Computed") {
      const key = String(c.key.value);

      const {
        span: { start, end },
      } = c.value as Identifier;

      p += `const v${
        key.slice(0, 1).toLocaleUpperCase() + key.slice(1)
      } = ${script.slice(start - offset, end - offset)};\n`;
    }

    return p;
  }, "")}`;

  const visitCb: VisitorCb = {
    visitImportDefaultSpecifier(n) {
      n.local = this.visitBindingIdentifier!(n.local);

      const { value } = n.local;
      if (importDirective.includes(value)) {
        n.local.value = transformDirectiveName(value);
      }
      return n;
    },

    visitNamedImportSpecifier(n) {
      n.local = this.visitBindingIdentifier!(n.local);
      if (n.imported) {
        n.imported = this.visitModuleExportName!(n.imported);
      }

      const { local, imported } = n;
      if (!imported) {
        if (importDirective.includes(local.value)) {
          n.local = {
            type: "Identifier",
            span: { start: 0, end: 0, ctxt: 0 },
            value: transformDirectiveName(local.value),
            optional: false,
          };
        }
      } else {
        if (importDirective.includes(local.value)) {
          n.local.value = transformDirectiveName(local.value);
        }
      }
      return n;
    },

    visitKeyValueProperty(n) {
      n.key = this.visitPropertyName!(n.key);
      n.value = this.visitExpression!(n.value);
      if (
        n.key.type === "Identifier" &&
        n.key.value === "directives" &&
        n.value.type === "ObjectExpression"
      ) {
        for (const ast of n.value.properties) {
          if (
            ast.type === "Identifier" &&
            importDirective.includes(ast.value)
          ) {
            ast.value = transformDirectiveName(ast.value);
          }
        }
      }
      return n;
    },
  };

  return {
    visitCb,
    str,
  };
}

export default transformDirectives;

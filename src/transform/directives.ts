import type {
  ExportDefaultExpression,
  Identifier,
  ImportDefaultSpecifier,
  NamedImportSpecifier,
  ObjectExpression,
} from "@swc/core";
import { Config, SetupAst } from "../constants";
import { output } from "../utils";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

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
    return;
  }

  const { properties } = directivesAst;

  if (!properties.length) {
    return;
  }

  const importDirective: string[] = [];
  const customDirective = properties.reduce((p, c) => {
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
  }, "");
  class MyVisitor extends Visitor {
    ms: MagicString;
    constructor(ms: MagicString) {
      super();
      this.ms = ms;
    }
    visitImportDefaultSpecifier(n: ImportDefaultSpecifier) {
      const {
        value,
        span: { start, end },
      } = n.local;
      if (importDirective.includes(value)) {
        this.ms.update(
          start - offset,
          end - offset,
          transformDirectiveName(value),
        );
      }
      return n;
    }
    visitNamedImportSpecifier(n: NamedImportSpecifier) {
      const {
        local: { value, span: { start, end } },
        imported,
      } = n;
      if (!imported) {
        if (importDirective.includes(value)) {
          this.ms.appendRight(
            end - offset,
            ` as ${transformDirectiveName(value)}`,
          );
        }
      } else {
        if (importDirective.includes(value)) {
          this.ms.update(
            start - offset,
            end - offset,
            transformDirectiveName(value),
          );
        }
      }
      return n;
    }
    visitExportDefaultExpression(n: ExportDefaultExpression) {
      if (!customDirective) {
        return n;
      }
      const {
        span: { start },
      } = n;
      this.ms.appendLeft(
        start - offset,
        `// custom directive \n${customDirective}`,
      );

      return n;
    }
  }

  return MyVisitor;
}

export default transformDirectives;

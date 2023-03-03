import type {
  ExportDefaultExpression,
  Identifier,
  ImportDefaultSpecifier,
  NamedImportSpecifier,
  ObjectExpression,
} from "@swc/core";
import { ScriptOptions, SetupAst } from "../constants";
import { getRealSpan } from "./utils";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

function transformDirectiveName(name: string) {
  return `v${name.slice(0, 1).toLocaleUpperCase() + name.slice(1)}`;
}

function transformDirectives(
  directivesAst: Identifier | ObjectExpression,
  _setupAst: SetupAst,
  config: ScriptOptions,
) {
  const { script, offset, output } = config;
  if (
    directivesAst.type === "Identifier" ||
    directivesAst.properties.some((ast) => ast.type === "SpreadElement")
  ) {
    output.warn("Please manually modify the custom directives");
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

      const { span } = c.value as Identifier;

      const { start, end } = getRealSpan(span, offset);
      p += `const v${
        key.slice(0, 1).toLocaleUpperCase() + key.slice(1)
      } = ${script.slice(start, end)};\n`;
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
      const { value, span } = n.local;
      const { start, end } = getRealSpan(span, offset);
      if (importDirective.includes(value)) {
        this.ms.update(start, end, transformDirectiveName(value));
      }
      return n;
    }
    visitNamedImportSpecifier(n: NamedImportSpecifier) {
      const {
        local: { value, span },
        imported,
      } = n;
      if (!imported) {
        if (importDirective.includes(value)) {
          const { end } = getRealSpan(span, offset);
          this.ms.appendRight(end, ` as ${transformDirectiveName(value)}`);
        }
      } else {
        if (importDirective.includes(value)) {
          const { start, end } = getRealSpan(span, offset);
          this.ms.update(start, end, transformDirectiveName(value));
        }
      }
      return n;
    }
    visitExportDefaultExpression(n: ExportDefaultExpression) {
      if (!customDirective) {
        return n;
      }

      const { start } = getRealSpan(n.span, offset);
      this.ms.appendLeft(start, `// custom directive \n${customDirective}`);

      return n;
    }
  }

  return MyVisitor;
}

export default transformDirectives;

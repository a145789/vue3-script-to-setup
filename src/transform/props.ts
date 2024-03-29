import type {
  ArrayExpression,
  BooleanLiteral,
  ExportDefaultExpression,
  Identifier,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportSpecifier,
  KeyValueProperty,
  NamedImportSpecifier,
  ObjectExpression,
} from "@swc/core";
import { ScriptOptions, FileType, SetupAst } from "../constants";
import { getPropsValue, getRealSpan, getSpecifierOffset } from "./utils";
import { Visitor } from "@swc/core/Visitor.js";
import type MagicString from "magic-string";

function transformProps(
  propsAst: ArrayExpression | Identifier | ObjectExpression,
  setupAst: SetupAst,
  config: ScriptOptions,
) {
  const { script, offset, fileType, propsNotOnlyTs } = config;

  let preCode = "";
  let propsName = "";
  if (setupAst.params.length) {
    const propsNameAst =
      setupAst.type === "MethodProperty"
        ? setupAst.params[0].pat
        : setupAst.params[0];

    propsName = propsNameAst.type === "Identifier" ? propsNameAst.value : "";
    preCode = propsName ? `const ${propsName} = ` : "";
  }

  let isNormalProps = true;
  let isSamePropsName = false;
  let str = "";
  class MyVisitor extends Visitor {
    ms: MagicString;
    constructor(ms: MagicString) {
      super();
      this.ms = ms;
    }
    visitExportDefaultExpression(node: ExportDefaultExpression) {
      const { start } = getRealSpan(node.span, offset);
      this.ms.appendLeft(start, str);

      return node;
    }
    visitImportDeclaration(n: ImportDeclaration) {
      if (isNormalProps) {
        return n;
      }
      if (n.source.value === "vue") {
        const index = n.specifiers.findIndex(
          (ast) => ast.local.value === "PropType",
        );
        if (index !== -1) {
          const { start, end } = getSpecifierOffset(n, index, script, offset);
          this.ms.remove(start, end);
          n.specifiers.splice(index, 1);
        }
      }

      return n;
    }
    visitImportDefaultSpecifier(n: ImportDefaultSpecifier): ImportSpecifier {
      if (!isSamePropsName) {
        return n;
      }
      const { value, span } = n.local;
      const { start, end } = getRealSpan(span, offset);
      if (value === propsName) {
        this.ms.update(start, end, `$${propsName}`);
      }
      return n;
    }
    visitNamedImportSpecifier(n: NamedImportSpecifier) {
      if (!isSamePropsName) {
        return n;
      }
      const {
        local: { value, span },
        imported,
      } = n;
      if (!imported) {
        if (value === propsName) {
          const { end } = getRealSpan(span, offset);
          this.ms.appendRight(end, ` as $${propsName}`);
        }
      } else {
        if (value === propsName) {
          const { start, end } = getRealSpan(span, offset);
          this.ms.update(start, end, `$${propsName}`);
        }
      }
      return n;
    }
  }
  if (propsAst.type === "ArrayExpression") {
    const { start, end } = getRealSpan(propsAst.span, offset);
    str = `${preCode}defineProps(${script.slice(start, end)});\n`;
    return MyVisitor;
  }

  if (propsAst.type === "Identifier") {
    if (propsName !== propsAst.value) {
      str = `${preCode}defineProps(${propsAst.value});\n`;
    } else {
      str = `${preCode}defineProps($${propsAst.value});\n`;
      isSamePropsName = true;
    }
    return MyVisitor;
  }

  if (!propsAst.properties.length) {
    str = `${preCode}defineProps();\n`;
    return MyVisitor;
  }

  isNormalProps =
    propsNotOnlyTs ||
    fileType !== FileType.ts ||
    propsAst.properties.some(
      (ast) =>
        ast.type === "AssignmentProperty" ||
        ast.type === "GetterProperty" ||
        ast.type === "Identifier" ||
        ast.type === "MethodProperty" ||
        ast.type === "SetterProperty" ||
        ast.type === "SpreadElement" ||
        (ast.type === "KeyValueProperty" &&
          ast.value.type !== "Identifier" &&
          ast.value.type !== "TsAsExpression" &&
          ast.value.type !== "ArrayExpression" &&
          (ast.value.type !== "ObjectExpression" ||
            (ast.value.type === "ObjectExpression" &&
              ast.value.properties.some(
                (item) =>
                  item.type === "KeyValueProperty" &&
                  (((item.key.type === "StringLiteral" ||
                    item.key.type === "Identifier") &&
                    item.key.value === "validator") ||
                    item.key.type === "Computed" ||
                    item.value.type === "MemberExpression"),
              )))),
    );

  if (isNormalProps) {
    const { start, end } = getRealSpan(propsAst.span, offset);
    str = `${preCode}defineProps(${script.slice(start, end)});\n`;
    return MyVisitor;
  }

  let propsDefault = "";
  const propsType = (propsAst.properties as KeyValueProperty[]).map(
    ({ key, value }) => {
      const keyValue = (key as Identifier).value;
      const valueIdentifier = getPropsValue(value, keyValue, script, offset);
      if (valueIdentifier) {
        return valueIdentifier;
      }

      const { properties } = value as { properties: KeyValueProperty[] };
      if (!properties.length) {
        return "";
      }

      const requiredAstIndex = properties.findIndex(
        (ast) => (ast.key as Identifier).value === "required",
      );
      let required = false;
      if (requiredAstIndex !== -1) {
        const [requiredAst] = properties.splice(requiredAstIndex, 1);
        required = (requiredAst.value as BooleanLiteral).value;
      }
      const { propType, defaultProp } = properties.reduce<{
        propType?: string;
        defaultProp?: string;
      }>((p, c) => {
        const typeKeyValue = (c.key as Identifier).value;
        if (typeKeyValue === "type") {
          p.propType = getPropsValue(
            c.value,
            keyValue,
            script,
            offset,
            required,
          );
        }

        if (typeKeyValue === "default") {
          const { span } = c.value as Identifier;
          const { start, end } = getRealSpan(span, offset);
          p.defaultProp = script.slice(start, end);
        }
        return p;
      }, {});

      if (defaultProp) {
        propsDefault += `${keyValue}: ${defaultProp}, `;
      }

      return propType;
    },
  );

  const propsTypeTem = `defineProps<{ ${propsType.join("")} }>()`;

  str = `${preCode}${
    propsDefault
      ? `withDefaults(${propsTypeTem}, { ${propsDefault} });\n`
      : `${propsTypeTem};\n`
  }`;
  return MyVisitor;
}

export default transformProps;

import type {
  ArrayExpression,
  BooleanLiteral,
  Identifier,
  KeyValueProperty,
  ObjectExpression,
} from "@swc/core";
import { Config, FileType, SetupAst, VisitorCb } from "../constants";
import { getPropsValueIdentifier } from "../utils";

function transformProps(
  propsAst: ArrayExpression | Identifier | ObjectExpression,
  setupAst: SetupAst,
  config: Config,
): {
  visitCb?: VisitorCb;
  str: string;
} {
  const { script, offset, fileType, propsNotOnlyTs } = config;

  let preCode = "";
  if (setupAst.params.length) {
    const propsNameAst =
      setupAst.type === "MethodProperty"
        ? setupAst.params[0].pat
        : setupAst.params[0];

    const propsName =
      propsNameAst.type === "Identifier" ? propsNameAst.value : "";
    preCode = propsName ? `const ${propsName} = ` : "";
  }

  if (propsAst.type === "ArrayExpression") {
    const {
      span: { start, end },
    } = propsAst;

    return {
      str: `${preCode}defineProps(${script.slice(
        start - offset,
        end - offset,
      )})`,
    };
  }
  if (propsAst.type === "Identifier") {
    return {
      str: `${preCode}defineProps(${propsAst.value})`,
    };
  }

  if (!propsAst.properties.length) {
    return {
      str: `${preCode}defineProps()`,
    };
  }

  const isNormalProps =
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
    const {
      span: { start, end },
    } = propsAst;
    return {
      str: `${preCode}defineProps(${script.slice(
        start - offset,
        end - offset,
      )})`,
    };
  }

  let propsDefault = "";
  const propsType = (propsAst.properties as KeyValueProperty[]).map(
    ({ key, value }) => {
      const keyValue = (key as Identifier).value;
      const valueIdentifier = getPropsValueIdentifier(
        value,
        keyValue,
        script,
        offset,
      );
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
          p.propType = getPropsValueIdentifier(
            c.value,
            keyValue,
            script,
            offset,
            required,
          );
        }

        if (typeKeyValue === "default") {
          const {
            span: { start, end },
          } = c.value as Identifier;
          p.defaultProp = script.slice(start - offset, end - offset);
        }
        return p;
      }, {});

      if (defaultProp) {
        propsDefault += `${keyValue}: ${defaultProp}, `;
      }

      return propType;
    },
  );

  const propsTypeTem = `defineProps<{${propsType.join("")}}>()`;

  const visitCb: VisitorCb = {
    visitImportDeclaration(n) {
      n.source = this.visitStringLiteral!(n.source);
      n.specifiers = this.visitImportSpecifiers!(n.specifiers || []);

      if (n.source.value === "vue") {
        n.specifiers = n.specifiers.filter(
          (ast) => ast.local.value !== "PropType",
        );
      }

      return n;
    },
  };

  return {
    visitCb,
    str: `${preCode}${
      propsDefault
        ? `withDefaults(${propsTypeTem}, { ${propsDefault} });`
        : `${propsTypeTem};`
    }`,
  };
}

export default transformProps;

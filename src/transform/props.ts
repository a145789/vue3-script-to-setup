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
) {
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

  let str = "";
  const visitStrCb: VisitorCb = {
    visitExportDefaultExpression(node) {
      const {
        span: { start },
      } = node;
      this.ms?.appendLeft(start - offset, str);

      return node;
    },
  };
  if (propsAst.type === "ArrayExpression") {
    const {
      span: { start, end },
    } = propsAst;

    str = `${preCode}defineProps(${script.slice(
      start - offset,
      end - offset,
    )})`;
    return visitStrCb;
  }
  if (propsAst.type === "Identifier") {
    str = `${preCode}defineProps(${propsAst.value})`;
    return visitStrCb;
  }

  if (!propsAst.properties.length) {
    str = `${preCode}defineProps()`;
    return visitStrCb;
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
    str = `${preCode}defineProps(${script.slice(
      start - offset,
      end - offset,
    )})`;
    return visitStrCb;
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
      if (n.source.value === "vue") {
        if (n.specifiers.some((ast) => ast.local.value === "PropType")) {
          const {
            span: { start, end },
          } = n;
          const importStr = script
            .slice(start - offset, end - offset)
            .replace(/PropType\s*\,?/g, "");
          this.ms?.update(start - offset, end - offset, importStr);
        }
      }

      return n;
    },
  };
  str = `${preCode}${
    propsDefault
      ? `withDefaults(${propsTypeTem}, { ${propsDefault} });`
      : `${propsTypeTem};`
  }`;
  return {
    ...visitCb,
    ...visitStrCb,
  };
}

export default transformProps;

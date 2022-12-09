import type {
    ArrowFunctionExpression,
    Expression,
    KeyValueProperty,
    MethodProperty,
    ObjectExpression,
    PropertyName,
  } from "@swc/core";
  
  import { parseSync } from "@swc/core";
  
  import { Config, parseOption } from "../constants";
  import transformProps from "./props";
  
  const ILLEGAL_OPTIONS_API = [
    "data",
    "watch",
    "computed",
    "methods",
    "created",
    "beforeMount",
    "mounted",
    "beforeUnmount",
    "unmounted",
    "beforeUpdate",
    "updated",
    "activated",
    "deactivated",
    "render",
    "errorCaptured",
    "serverPrefetch",
    "mixins",
    "extends",
  ] as readonly string[];
  
  function filterOptions(config: Config) {
    const { body } = parseSync(config.script, parseOption);
  
    const exportDefaultAst = body.find(
      (item) => item.type === "ExportDefaultExpression",
    ) as { expression: Expression };
  
    if (!exportDefaultAst) {
      console.warn("");
      return null;
    }
    let optionAst: ObjectExpression | null = null;
    switch (exportDefaultAst.expression.type) {
      case "CallExpression": {
        optionAst = exportDefaultAst.expression.arguments[0]
          .expression as ObjectExpression;
        break;
      }
      case "ObjectExpression": {
        optionAst = exportDefaultAst.expression;
        break;
      }
  
      default:
        optionAst = null;
        break;
    }
  
    if (!optionAst) {
      console.warn("");
      return null;
    }
  
    const setupAstIndex = optionAst.properties.findIndex((ast) => {
      if (
        (ast.type === "MethodProperty" || ast.type === "KeyValueProperty") &&
        (ast.key.type === "Identifier" || ast.key.type === "StringLiteral")
      ) {
        switch (ast.type) {
          case "MethodProperty":
            return ast.key.value === "setup";
          case "KeyValueProperty":
            return (
              ast.value.type === "ArrowFunctionExpression" &&
              ast.key.value === "setup"
            );
  
          default:
            return false;
        }
      }
      return false;
    });
  
    const [setupAst] = optionAst.properties.splice(setupAstIndex, 1) as [
      MethodProperty | KeyValueProperty,
    ];
    if (!setupAst) {
      console.warn("");
      return null;
    }
  
    const setupFnAst =
      setupAst.type === "MethodProperty"
        ? setupAst
        : (setupAst.value as ArrowFunctionExpression);
  
    // console.log(optionAst);
    for (const ast of optionAst.properties) {
      if (ast.type === "SpreadElement") {
        console.warn("");
        return null;
      }
      if (
        ast.type === "GetterProperty" ||
        ast.type === "SetterProperty" ||
        ast.type === "AssignmentProperty"
      ) {
        continue;
      }
  
      const key = ast.type === "Identifier" ? ast.value : getOptionKey(ast.key);
      if (!key || ILLEGAL_OPTIONS_API.includes(key)) {
        console.warn("");
        return null;
      }
  
      switch (key) {
        case "props": {
          transformProps((ast as any).value, setupFnAst, config);
          break;
        }
        case "emit":
          break;
        case "components":
          break;
        case "directives":
          break;
        default:
          break;
      }
    }
  }
  
  export default filterOptions;
  
  function getOptionKey(key: PropertyName) {
    switch (key.type) {
      case "Identifier":
      case "StringLiteral":
        return key.value;
  
      default:
        return "";
    }
  }
  
import type {
  ImportSpecifier,
  ImportDeclaration,
  Program,
  ModuleItem,
  TsType,
} from "@swc/core";
import { Config, SetupAst, USE_ATTRS, USE_SLOTS } from "../constants";
import Visitor from "@swc/core/Visitor";
import { getSetupSecondParams } from "../utils";
import MagicString from "magic-string";

function transformAttrsAndSlots(
  setupAst: SetupAst,
  { fileAbsolutePath }: Config,
) {
  const attrsName = getSetupSecondParams("attrs", setupAst, fileAbsolutePath);
  const slotsName = getSetupSecondParams("slots", setupAst, fileAbsolutePath);
  if (!(attrsName || slotsName)) {
    return null;
  }

  const str = `${attrsName ? `const ${attrsName} = useAttrs();\n` : ""}${
    slotsName ? `const ${slotsName} = useSlots();\n` : ""
  }`;

  return {
    getMagicString,
    str,
  };
}

export default transformAttrsAndSlots;

class MyVisitor extends Visitor {
  private ms: MagicString;
  private offset = 0;
  private isHas = {
    attrs: false,
    slots: false,
  };
  private declarationEnd = 0;
  constructor(ms: MagicString, offset: number) {
    super();
    this.ms = ms;
    this.offset = offset;
  }
  visitImportDeclaration(n: ImportDeclaration): ImportDeclaration {
    if (n.source.value === "vue") {
      this.visitImportSpecifiers(n.specifiers) || [];
      this.declarationEnd = n.span.end;
    }

    return n;
  }
  visitImportSpecifiers(n: ImportSpecifier[]): ImportSpecifier[] {
    this.isHas = n.reduce((p, ast) => {
      if (ast.type === "ImportSpecifier") {
        if (ast.local.value === USE_ATTRS) {
          p.attrs = true;
        }

        if (ast.local.value === USE_SLOTS) {
          p.slots = true;
        }
      }

      return p;
    }, this.isHas);

    const { ms, isHas, declarationEnd, offset } = this;

    const lastNode = n[n.length - 1];

    if (lastNode) {
      const {
        span: { end },
      } = lastNode;

      ms.appendRight(
        end - offset,
        `${
          ms
            .toString()
            .slice(end - offset, declarationEnd - offset)
            .includes(",")
            ? ""
            : ", "
        }${!isHas.attrs ? `${USE_ATTRS}, ` : ""}${
          !isHas.slots ? `${USE_SLOTS}, ` : ""
        }`,
      );
    }

    return n;
  }

  visitModuleItems(items: ModuleItem[]) {
    items = items.map(this.visitModuleItem.bind(this));
    const { ms, isHas, offset } = this;

    const end = items[items.length - 1]?.span.end ?? offset;

    ms.appendRight(
      end + 1 - offset,
      `${!isHas.attrs ? `\n${USE_ATTRS}();` : ""}${
        !isHas.slots ? `\n${USE_SLOTS}();` : ""
      }`,
    );
    return items;
  }

  visitTsType(n: TsType) {
    return n;
  }
}

function getMagicString(ast: Program, script: string) {
  const ms = new MagicString(script);

  const visitor = new MyVisitor(ms, ast.span.start);
  visitor.visitProgram(ast);

  return ms.toString();
}

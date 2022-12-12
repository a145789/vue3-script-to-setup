import { describe, expect, it } from "vitest";
import {
  cwd,
  pathResolve,
  getSwcOptions,
  getTheFileAbsolutePath,
  MapVisitor,
  useConfigPath,
} from "../src/utils";
import fg from "fast-glob";
import transformProps from "../src/transform/props";
import { FileType } from "../src/constants";
import {
  getAttrsAndSlotsAst,
  getComponentsAst,
  getDirectivesAst,
  getEmitsAst,
  getPropsAst,
  getSetupFnAst,
  getTransformScript,
  transformToSingeLine,
} from "./utils";
import transformComponents from "../src/transform/components";
import transformDirectives from "../src/transform/directives";
import transformEmits from "../src/transform/emits";
import { transformSync } from "@swc/core";
import transformAttrsAndSlots from "../src/transform/attrsAndSlots";
import transformExpose from "../src/transform/expose";
import transformScript from "../src/transform/transformScript";

describe("test utils", () => {
  it("test getTheFileAbsolutePath", () => {
    expect(getTheFileAbsolutePath()).toBeUndefined();
    expect(getTheFileAbsolutePath("foo.js")).toBeUndefined();
    expect(getTheFileAbsolutePath("./example/src/Foo.vue")).toBeUndefined();
    expect(getTheFileAbsolutePath("./example/src/App.vue")).toBe(
      pathResolve(cwd, "./example/src/App.vue"),
    );
    expect(getTheFileAbsolutePath(cwd, "./example", "src", "App.vue")).toBe(
      pathResolve(cwd, "./example/src/App.vue"),
    );
  });

  it("test useConfigPath", async () => {
    expect(
      (
        await useConfigPath(
          "tosetup.config.a",
          pathResolve(__dirname, "fixtures"),
        )
      ).pathNames,
    ).toEqual([
      pathResolve(cwd, "./example/src/App.vue"),
      pathResolve(cwd, "./example/src/components/Tab.vue"),
      pathResolve(cwd, "example/src/views/404.vue"),
    ]);

    const { pathNames, option } = await useConfigPath(
      "tosetup.config.b",
      pathResolve(__dirname, "fixtures"),
    );
    expect(pathNames.sort()).toEqual(
      fg
        .sync(pathResolve(cwd, "./example/src/**"))
        .filter((path) => !path.endsWith("views/Home.vue"))
        .sort(),
    );

    expect(option).toEqual({
      propsNotOnlyTs: true,
    });
  });
});

describe("test transform", () => {
  const { expression: setupHasParams, script: setupScript } =
    getSetupFnAst("has");
  const { expression: setupNoParams } = getSetupFnAst("none");

  it("test transformProps props name", () => {
    const { code, ast, init } = getPropsAst("identifier");

    expect(
      transformProps(init, setupHasParams, {
        script: code,
        fileType: FileType.js,
        offset: ast.span.start,
        fileAbsolutePath: "",
      }).str,
    ).toBe("const props = defineProps(myProps)");

    expect(
      transformProps(init, setupNoParams, {
        script: code,
        fileType: FileType.js,
        offset: ast.span.start,
        fileAbsolutePath: "",
      }).str,
    ).toBe("defineProps(myProps)");
  });

  it("test transformProps array", () => {
    const { code, ast, init } = getPropsAst("array");

    expect(
      transformProps(init, setupHasParams, {
        script: code,
        fileType: FileType.js,
        offset: ast.span.start,
        fileAbsolutePath: "",
      }).str,
    ).toBe("const props = defineProps(['foo', 'bar'])");
  });

  it("test transformProps normal object props", () => {
    function validator() {
      const { code, ast, init } = getPropsAst("validator");

      expect(
        transformToSingeLine(
          transformProps(init, setupHasParams, {
            script: code,
            fileType: FileType.ts,
            offset: ast.span.start,
            fileAbsolutePath: "",
          }).str,
        ),
      ).toBe(
        transformToSingeLine(`
      const props = defineProps({
        height: Number,
        color: {
            type: String as PropType<Red | Blue>
        },
        age: {
            type: Number,
            validator: (value) => {
                return value >= 0
            }
        }
      })`),
      );
    }
    validator();

    function normal() {
      const { code, ast, init } = getPropsAst("normal");

      expect(
        transformToSingeLine(
          transformProps(init, setupNoParams, {
            script: code,
            fileType: FileType.js,
            offset: ast.span.start,
            fileAbsolutePath: "",
          }).str,
        ),
      ).toBe(
        transformToSingeLine(`
        defineProps({
          height: Number,
          width: Number as PropType<1 | 2 | 3>,
          age: {
              type: Number
          },
          hobby: [String, Array] as PropType<string[] | string>,
          color: {
              type: String as PropType<Red | Blue>
          },
          list: {
              type: Array as PropType<number[]>,
              required: true,
              default: ()=> []
          },
          fn: Function,
          date: Date,
          symbol: Symbol
      })`),
      );
    }
    normal();
  });

  it("test transformProps ts object", () => {
    const { code, ast, init } = getPropsAst("normal");

    expect(
      transformToSingeLine(
        transformProps(init, setupHasParams, {
          script: code,
          fileType: FileType.ts,
          offset: ast.span.start,
          fileAbsolutePath: "",
        }).str,
      ),
    ).toBe(
      transformToSingeLine(
        "const props = withDefaults(defineProps<{ height?: number; width?: 1 | 2 | 3; age?: number; hobby?: string[] | string; color?: Red | Blue; list: number[]; fn?: Function; date?: Date; symbol?: symbol; }>(), { list: ()=> [],})",
      ),
    );
  });

  it("test transformComponent", () => {
    function object() {
      const { code, ast, init } = getComponentsAst("object");
      expect(
        transformToSingeLine(
          transformComponents(init, setupHasParams, {
            script: code,
            fileType: FileType.ts,
            offset: ast.span.start,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(
        transformToSingeLine(
          `const Home = defineAsyncComponent(() => import('./Home.vue'));`,
        ),
      );
    }
    object();

    function array() {
      const { code, ast, init } = getComponentsAst("array");
      expect(
        transformToSingeLine(
          transformComponents(init, setupHasParams, {
            script: code,
            fileType: FileType.ts,
            offset: ast.span.start,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(transformToSingeLine(""));
    }
    array();
  });

  it("test transformDirectives", () => {
    const { code, ast, init } = getDirectivesAst();

    const directives = transformDirectives(init, setupHasParams, {
      script: code,
      fileType: FileType.ts,
      offset: ast.span.start,
      fileAbsolutePath: "",
    });

    if (directives) {
      const { str, visitCb } = directives;
      expect(transformToSingeLine(str)).toBe(
        transformToSingeLine("// custom directive \nconst vCustomDir = {};"),
      );

      const { code: transformCode } = transformSync(
        code,
        getSwcOptions(new MapVisitor([visitCb])),
      );

      expect(transformToSingeLine(transformCode)).toBe(
        transformToSingeLine(`
          import vFocus from "focus";
          import { tap as vCustomTap, vDrag } from "./directives";
          var options = {
              directives: {
                  vFocus,
                  vCustomTap,
                  vDrag,
                  customDir: {}
              }
          };
        `),
      );
    }
  });

  it("test transformEmits", () => {
    function noParams() {
      const { code, ast, init } = getEmitsAst("array");
      expect(
        transformToSingeLine(
          transformEmits(init, setupNoParams, {
            script: code,
            fileType: FileType.ts,
            offset: ast.span.start,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(transformToSingeLine(""));
    }
    noParams();

    function objectEmits() {
      const { code, ast, init } = getEmitsAst("object");
      expect(
        transformToSingeLine(
          transformEmits(init, setupHasParams, {
            script: code,
            fileType: FileType.ts,
            offset: ast.span.start,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(transformToSingeLine("const cEmit = defineEmits({});"));
    }
    objectEmits();

    function arrayEmits() {
      const { code, ast, init } = getEmitsAst("array");
      expect(
        transformToSingeLine(
          transformEmits(init, setupHasParams, {
            script: code,
            fileType: FileType.ts,
            offset: ast.span.start,
            setupScript,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(
        transformToSingeLine(
          `const cEmit = defineEmits(['a', 'b', 'c', 'change', "click"]);`,
        ),
      );
    }
    arrayEmits();
  });

  it("test transformAttrsAndSlots", () => {
    const { code, ast } = getAttrsAndSlotsAst();

    const attrsAndSlots = transformAttrsAndSlots(setupHasParams, {
      script: code,
      fileType: FileType.ts,
      offset: 0,
      fileAbsolutePath: "",
    });

    if (attrsAndSlots) {
      const { str, getMagicString } = attrsAndSlots;

      expect(transformToSingeLine(str)).toBe(
        transformToSingeLine(`
        const attrs = useAttrs();
        const cSlots = useSlots();
        `),
      );

      const msCode = getMagicString(ast, code);
      expect(transformToSingeLine(msCode)).toBe(
        transformToSingeLine(`
          import { ref, useAttrs, useSlots, } from "vue";
          useAttrs();
          useSlots();
        `),
      );
    }
  });

  it("test transformExpose", () => {
    const expose = transformExpose(setupHasParams, {
      script: "",
      fileType: FileType.ts,
      offset: 0,
      setupScript,
      fileAbsolutePath: "",
    });

    if (expose) {
      const { str, visitCb } = expose;
      expect(transformToSingeLine(str)).toBe(
        transformToSingeLine(`
          const expose = defineExpose({a, b: foo, count: publicCount, ...form });
        `),
      );

      const { code } = transformSync(
        `var option = { setup: ${setupScript} }`,
        getSwcOptions(new MapVisitor([visitCb])),
      );

      expect(transformToSingeLine(code)).toBe(
        transformToSingeLine(`
          var option = { setup: (props, { emit: cEmit, attrs, slots: cSlots, expose }) => {
            const foo = ref(0);
            cEmit('change');
            cEmit("click", foo); 
            every("hello");
          };
        }
        `),
      );
    }
  });

  it("test transformScript", () => {
    const { script, toBeCode } = getTransformScript();

    const code = transformScript({
      fileType: FileType.ts,
      script: script.trim(),
      offset: 0,
      fileAbsolutePath: "",
      setupScript: "",
    });

    expect(transformToSingeLine(code)).toBe(transformToSingeLine(toBeCode));
  });
});

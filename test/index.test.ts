import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  cwd,
  getSwcOptions,
  getTheFileAbsolutePath,
  MapVisitor,
  useConfigPath,
} from "../src/utils";
import fg from "fast-glob";
import filterOptions from "../src/parse/filter-options";
import transformProps from "../src/parse/props";
import { FileType } from "../src/constants";
import {
  getAttrsAndSlotsAst,
  getComponentsAst,
  getDirectivesAst,
  getEmitsAst,
  getPropsAst,
  getSetupFnAst,
  transformToSingeLine,
} from "./utils";
import transformComponents from "../src/parse/components";
import transformDirectives from "../src/parse/directives";
import transformEmits from "../src/parse/emits";
import { transformSync } from "@swc/core";
import transformAttrsAndSlots from "../src/parse/attrsAndSlots";
import transformExpose from "../src/parse/expose";

describe("test utils", () => {
  it("test getTheFileAbsolutePath", () => {
    expect(getTheFileAbsolutePath()).toBeUndefined();
    expect(getTheFileAbsolutePath("foo.js")).toBeUndefined();
    expect(getTheFileAbsolutePath("./example/src/Foo.vue")).toBeUndefined();
    expect(getTheFileAbsolutePath("./example/src/App.vue")).toBe(
      resolve(cwd, "./example/src/App.vue"),
    );
    expect(getTheFileAbsolutePath(cwd, "./example", "src", "App.vue")).toBe(
      resolve(cwd, "./example/src/App.vue"),
    );
  });

  it("test useConfigPath", async () => {
    expect(
      await useConfigPath("tosetup.config.a", resolve(__dirname, "fixtures")),
    ).toEqual([
      resolve(cwd, "./example/src/App.vue"),
      resolve(cwd, "./example/src/components/Tab.vue"),
      resolve(cwd, "example/src/views/404.vue"),
    ]);

    expect(
      (
        await useConfigPath("tosetup.config.b", resolve(__dirname, "fixtures"))
      ).sort(),
    ).toEqual(
      fg
        .sync(resolve(cwd, "./example/src/**"))
        .filter((path) => !path.endsWith("views/Home.vue"))
        .sort(),
    );
  });
});

describe("test parse", () => {
  const { expression: setupHasParams, script: setupScript } =
    getSetupFnAst("has");
  const { expression: setupNoParams } = getSetupFnAst("none");
  const defineComponentScript = `
  import { defineComponent } from 'vue'
  export default defineComponent({
    name: 'App',
      data:
        ()=>{},
      setup() {
        return { }
      }
  })
  `;
  const objectScript = `
  export default {
    props: {
      
    },
      setup() {
        const obj = { data: {} }
        return obj
      }
  }
  `;
  it("test filterOptions", () => {
    // const a = filterOptions({
    //   script: defineComponentScript,
    //   fileType: FileType.js,
    // });
    // const b = filterOptions({ script: objectScript, fileType: FileType.js });
  });

  it("test transformProps props name", () => {
    const { script, propsAst, init } = getPropsAst("identifier");

    expect(
      transformProps(init, setupHasParams, {
        script,
        fileType: FileType.js,
        offset: propsAst.span.start,
        fileAbsolutePath: "",
      }),
    ).toBe("const props = defineProps(myProps)");

    expect(
      transformProps(init, setupNoParams, {
        script,
        fileType: FileType.js,
        offset: propsAst.span.start,
        fileAbsolutePath: "",
      }),
    ).toBe("defineProps(myProps)");
  });

  it("test transformProps array", () => {
    const { script, propsAst, init } = getPropsAst("array");

    expect(
      transformProps(init, setupHasParams, {
        script,
        fileType: FileType.js,
        offset: propsAst.span.start,
        fileAbsolutePath: "",
      }),
    ).toBe("const props = defineProps(['foo', 'bar'])");
  });

  it("test transformProps normal object props", () => {
    function validator() {
      const { script, propsAst, init } = getPropsAst("validator");

      expect(
        transformToSingeLine(
          transformProps(init, setupHasParams, {
            script,
            fileType: FileType.ts,
            offset: propsAst.span.start,
            fileAbsolutePath: "",
          }),
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
      const { script, propsAst, init } = getPropsAst("normal");

      expect(
        transformToSingeLine(
          transformProps(init, setupNoParams, {
            script,
            fileType: FileType.js,
            offset: propsAst.span.start,
            fileAbsolutePath: "",
          }),
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
    const { script, propsAst, init } = getPropsAst("normal");

    expect(
      transformToSingeLine(
        transformProps(init, setupHasParams, {
          script,
          fileType: FileType.ts,
          offset: propsAst.span.start,
          fileAbsolutePath: "",
        }),
      ),
    ).toBe(
      transformToSingeLine(
        "const props = withDefaults(defineProps<{ height?: number; width?: 1 | 2 | 3; age?: number; hobby?: string[] | string; color?: Red | Blue; list: number[]; fn?: Function; date?: Date; symbol?: symbol; }>(), { list: ()=> [],})",
      ),
    );
  });

  it("test transformComponent", () => {
    function object() {
      const { script, componentsAst, init } = getComponentsAst("object");
      expect(
        transformToSingeLine(
          transformComponents(init, setupHasParams, {
            script,
            fileType: FileType.ts,
            offset: componentsAst.span.start,
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
      const { script, componentsAst, init } = getComponentsAst("array");
      expect(
        transformToSingeLine(
          transformComponents(init, setupHasParams, {
            script,
            fileType: FileType.ts,
            offset: componentsAst.span.start,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(transformToSingeLine(""));
    }
    array();
  });

  it("test transformDirectives", () => {
    const { script, directivesAst, init } = getDirectivesAst();

    const directives = transformDirectives(init, setupHasParams, {
      script,
      fileType: FileType.ts,
      offset: directivesAst.span.start,
      fileAbsolutePath: "",
    });

    if (directives) {
      const { str, visitCb } = directives;
      expect(transformToSingeLine(str)).toBe(
        transformToSingeLine("// custom directive \nconst vCustomDir = {};"),
      );

      const { code } = transformSync(
        script,
        getSwcOptions(new MapVisitor([visitCb])),
      );

      expect(transformToSingeLine(code)).toBe(
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
      const { script, emitsAst, init } = getEmitsAst("array");
      expect(
        transformToSingeLine(
          transformEmits(init, setupNoParams, {
            script,
            fileType: FileType.ts,
            offset: emitsAst.span.start,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(transformToSingeLine(""));
    }
    noParams();

    function objectEmits() {
      const { script, emitsAst, init } = getEmitsAst("object");
      expect(
        transformToSingeLine(
          transformEmits(init, setupHasParams, {
            script,
            fileType: FileType.ts,
            offset: emitsAst.span.start,
            fileAbsolutePath: "",
          }),
        ),
      ).toBe(transformToSingeLine("const cEmit = defineEmits({});"));
    }
    objectEmits();

    function arrayEmits() {
      const { script, emitsAst, init } = getEmitsAst("array");
      expect(
        transformToSingeLine(
          transformEmits(init, setupHasParams, {
            script,
            fileType: FileType.ts,
            offset: emitsAst.span.start,
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
    const { script } = getAttrsAndSlotsAst();

    const attrsAndSlots = transformAttrsAndSlots(null, setupHasParams, {
      script,
      fileType: FileType.ts,
      offset: 0,
      fileAbsolutePath: "",
    });

    if (attrsAndSlots) {
      const { str, visitCb } = attrsAndSlots;
      expect(transformToSingeLine(str)).toBe(
        transformToSingeLine(`
        const attrs = useAttrs();
        const cSlots = useSlots();
        `),
      );

      const { code } = transformSync(
        `${script}\n${str}`,
        getSwcOptions(new MapVisitor([visitCb])),
      );

      expect(transformToSingeLine(code)).toBe(
        transformToSingeLine(`
          import vFocus from "focus";
          import { tap as vCustomTap, drag as vDrag } from "./directives";
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

  it("test transformExpose", () => {
    const expose = transformExpose(null, setupHasParams, {
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
        setupScript,
        getSwcOptions(new MapVisitor([visitCb])),
      );

      expect(transformToSingeLine(code)).toBe(
        transformToSingeLine(`
        (props, { emit: cEmit, attrs, slots: cSlots, expose }) => {
          const foo = ref(0);
          cEmit('change');
          cEmit("click", foo); 
          every("hello");
        };
        `),
      );
    }
  });
});

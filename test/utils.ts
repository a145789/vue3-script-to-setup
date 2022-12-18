import { parseSync } from "@swc/core";
import { parseOption } from "../src/constants";

const setupHasParams = `
  export default defineComponent({
    setup: (props, { emit: cEmit, attrs, slots: cSlots, expose }) => {
      expose({ a, b: foo, })
      const foo = ref(0)
      cEmit('change');
      cEmit("click", foo);
      every("hello");
      expose({ count: publicCount });
      expose({ ...form })
    }
  })
`;
const setupNoParams = `
  export default defineComponent({
    setup: ()=>{}
  })
`;

export function getSetupFnAst(type: "has" | "none") {
  const script = (type === "has" ? setupHasParams : setupNoParams).trim();
  const setupHasParamsAst = parseSync(script, parseOption) as any;
  return {
    script,
    setupHasParamsAst,
    expression: setupHasParamsAst.body[0].expression,
  };
}

const arrayProps = "var props = ['foo', 'bar']";
const identifierProps = "var props = myProps";
const normalObjectProps = `
var props = {
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
}
`;
const validatorObjectProps = `
var props = {
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
}
`;

export function getPropsAst(
  type: "array" | "identifier" | "normal" | "validator",
) {
  let code = "";
  switch (type) {
    case "array": {
      code = arrayProps.trim();
      break;
    }
    case "identifier": {
      code = identifierProps.trim();
      break;
    }
    case "normal": {
      code = normalObjectProps.trim();
      break;
    }
    case "validator": {
      code = validatorObjectProps.trim();
      break;
    }

    default:
      break;
  }
  const ast = parseSync(code, parseOption) as any;
  return {
    code,
    ast,
    init: ast.body[0].declarations[0].init,
  };
}

const objectComponents = `
var components = {
    HelloWorld,
    Tab,
    Home: defineAsyncComponent(() => import('./Home.vue'))
}
`;
const arrayComponents = `
var components = [HelloWorld, Tab]
`;
export function getComponentsAst(type: "object" | "array") {
  const code = (type === "object" ? objectComponents : arrayComponents).trim();
  const ast = parseSync(code, parseOption) as any;

  return {
    code,
    ast,
    init: ast.body[0].declarations[0].init,
  };
}

const directives = `
import focus from "focus"
import { tap as customTap, drag } from "./directives"

var options = {
  directives: {
    focus,
    customTap,
    drag,
    customDir: {}
  }
}
`;

export function getDirectivesAst() {
  const code = directives.trim();
  const ast = parseSync(code, parseOption) as any;

  return {
    code,
    ast,
    init: ast.body[2].declarations[0].init.properties[0].value,
  };
}

export function transformToSingeLine(str: string | undefined | null) {
  if (!str) {
    return "";
  }
  return str.replace(/\s|,|;|"|'/g, "");
}

const objectEmits = `
var emits = {}
`;

const arrayEmits = `
var emits = ['a', 'b', 'c']
`;
export function getEmitsAst(type: "object" | "array") {
  const code = (type === "object" ? objectEmits : arrayEmits).trim();
  const ast = parseSync(code, parseOption) as any;

  return {
    code,
    ast,
    init: ast.body[0].declarations[0].init,
  };
}

const attrsAndSlots = `
import { ref } from "vue";
`;
export function getAttrsAndSlotsAst() {
  const code = attrsAndSlots.trim();
  const ast = parseSync(code, parseOption) as any;
  return {
    code,
    ast,
  };
}

export function getTransformScript() {
  return {
    script: `
      import { defineComponent, PropType, ref } from "vue"
      import Header from "../components/Header.vue"
      import Tab from "../components/Tab.vue"
      import touchdir from "vtouchdir"
      export default defineComponent({
        name: 'App',
        components: {
          Header,
          Tab,
        },
        directives: {
          force: {},
          touchdir,
        },
        props: {
          items: Array as PropType<number[]>
        },
        emit: ["click"],
        setup(props, { emit, attrs, slots: mySlots, expose }) {
          const bar = ref(0)
          expose({ bar })
          expose({ name: "App" })
          emit("change");
          return {
            bar
          }
        }
      })
      `.trim(),
    toBeCode: `
      import { ref, useAttrs, useSlots } from "vue"
      import Header from "../components/Header.vue"
      import Tab from "../components/Tab.vue"
      import vTouchdir from "vtouchdir"
      const props = defineProps<{items?: number[]; }>();
      const emit = defineEmits(["click", "change"]);
      // custom directive 
      const vForce = {};
      const attrs = useAttrs();
      const mySlots = useSlots();
      const bar = ref(0)
      emit("change");
      const expose = defineExpose({ bar, name: "App" });
      `,
  };
}

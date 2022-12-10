import { parseSync } from "@swc/core";
import { parseOption } from "../src/constants";

const setupHasParams = `
  (props, { emit: cEmit, attrs, slots: cSlots, expose }) => {
    const foo = ref(0)
    cEmit('change');
    cEmit("click", foo); 
    expose({ a, b: foo, })
    every("hello");
    expose({ count: publicCount });
    expose({ ...form })
  }
`;
const setupNoParams = "()=>{}";

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
  let script = "";
  switch (type) {
    case "array": {
      script = arrayProps.trim();
      break;
    }
    case "identifier": {
      script = identifierProps.trim();
      break;
    }
    case "normal": {
      script = normalObjectProps.trim();
      break;
    }
    case "validator": {
      script = validatorObjectProps.trim();
      break;
    }

    default:
      break;
  }
  const ast = parseSync(script, parseOption) as any;
  return {
    script,
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
  const script = (
    type === "object" ? objectComponents : arrayComponents
  ).trim();
  const ast = parseSync(script, parseOption) as any;

  return {
    script,
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
  const script = directives.trim();
  const ast = parseSync(script, parseOption) as any;

  return {
    script,
    ast,
    init: ast.body[2].declarations[0].init.properties[0].value,
  };
}

export function transformToSingeLine(str: string) {
  return str.replaceAll(/\s/g, "");
}

const objectEmits = `
var emits = {}
`;

const arrayEmits = `
var emits = ['a', 'b', 'c']
`;
export function getEmitsAst(type: "object" | "array") {
  const script = (type === "object" ? objectEmits : arrayEmits).trim();
  const ast = parseSync(script, parseOption) as any;

  return {
    script,
    ast,
    init: ast.body[0].declarations[0].init,
  };
}

const attrsAndSlots = `
import { ref } from "vue";
`;
export function getAttrsAndSlotsAst() {
  const script = attrsAndSlots.trim();
  const ast = parseSync(script, parseOption) as any;
  return {
    script,
    ast,
  };
}

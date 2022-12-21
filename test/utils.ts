export const testScript1 = {
  code: `
  import type { PropType } from 'vue';
  import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
  // @ts-ignore
  import BTween from 'b-tween';
  import { getPrefixCls } from '../_utils/global-config';
  import { on, off } from '../_utils/dom';
  import { throttleByRaf } from '../_utils/throttle-by-raf';
  import IconToTop from '../icon/icon-to-top';
  import { isString } from '../_utils/is';
  export default defineComponent({
    name: 'BackTop',
    components: {
      IconToTop,
    },
    props: {
      /**
       * @zh 显示回到顶部按钮的触发滚动高度
       * @en Display the trigger scroll height of the back to top button
       */
      visibleHeight: {
        type: Number as PropType<number>,
        default: 200,
      },
      /**
       * @zh 滚动事件的监听容器
       * @en Scroll event listener container
       */
      targetContainer: {
        type: [String, Object] as PropType<string | HTMLElement>,
      },
      /**
       * @zh 滚动动画的缓动方式，可选值参考 [BTween](https://github.com/PengJiyuan/b-tween)
       * @en Easing mode of scrolling animation, refer to [BTween](https://github.com/PengJiyuan/b-tween) for optional values
       */
      easing: {
        type: String,
        default: 'quartOut',
      },
      /**
       * @zh 滚动动画的持续时间
       * @en Duration of scroll animation
       */
      duration: {
        type: Number,
        default: 200,
      },
    },
    setup(props) {
      const prefixCls = getPrefixCls('back-top');
      const visible = ref(false);
      const target = ref<HTMLElement>();
      const isWindow = !props.targetContainer;
      const scrollHandler = throttleByRaf(() => {
        if (target.value) {
          const { visibleHeight } = props;
          const { scrollTop } = target.value;
          visible.value = scrollTop >= visibleHeight;
        }
      });
      const getContainer = (container: string | HTMLElement) => {
        if (isString(container)) {
          return document.querySelector(container) as HTMLElement;
        }
        return container;
      };
      onMounted(() => {
        target.value = isWindow
          ? document?.documentElement
          : getContainer(props.targetContainer);
        if (target.value) {
          on(isWindow ? window : target.value, 'scroll', scrollHandler);
          scrollHandler();
        }
      });
      onUnmounted(() => {
        scrollHandler.cancel();
        if (target.value) {
          off(isWindow ? window : target.value, 'scroll', scrollHandler);
        }
      });
      const scrollToTop = () => {
        if (target.value) {
          const { scrollTop } = target.value;
          const tween = new BTween({
            from: { scrollTop },
            to: { scrollTop: 0 },
            easing: props.easing,
            duration: props.duration,
            onUpdate: (keys: any) => {
              if (target.value) {
                target.value.scrollTop = keys.scrollTop;
              }
            },
          });
          tween.start();
          // props.onClick && props.onClick();
        }
      };
      return {
        prefixCls,
        visible,
        scrollToTop,
      };
    },
  });
  `,
  transform: `
  import { onMounted, onUnmounted, ref } from 'vue';
  // @ts-ignore
  import BTween from 'b-tween';
  import { getPrefixCls } from '../_utils/global-config';
  import { on, off } from '../_utils/dom';
  import { throttleByRaf } from '../_utils/throttle-by-raf';
  import IconToTop from '../icon/icon-to-top';
  import { isString } from '../_utils/is';

  const props = withDefaults(defineProps<{visibleHeight?:number;targetContainer?:string | HTMLElement;easing?:string;duration?:number}>(),{visibleHeight:200,easing:'quartOut',duration:200,});

  const prefixCls = getPrefixCls('back-top');
      const visible = ref(false);
      const target = ref<HTMLElement>();
      const isWindow = !props.targetContainer;
      const scrollHandler = throttleByRaf(() => {
        if (target.value) {
          const { visibleHeight } = props;
          const { scrollTop } = target.value;
          visible.value = scrollTop >= visibleHeight;
        }
      });
      const getContainer = (container: string | HTMLElement) => {
        if (isString(container)) {
          return document.querySelector(container) as HTMLElement;
        }
        return container;
      };
      onMounted(() => {
        target.value = isWindow
          ? document?.documentElement
          : getContainer(props.targetContainer);
        if (target.value) {
          on(isWindow ? window : target.value, 'scroll', scrollHandler);
          scrollHandler();
        }
      });
      onUnmounted(() => {
        scrollHandler.cancel();
        if (target.value) {
          off(isWindow ? window : target.value, 'scroll', scrollHandler);
        }
      });
      const scrollToTop = () => {
        if (target.value) {
          const { scrollTop } = target.value;
          const tween = new BTween({
            from: { scrollTop },
            to: { scrollTop: 0 },
            easing: props.easing,
            duration: props.duration,
            onUpdate: (keys: any) => {
              if (target.value) {
                target.value.scrollTop = keys.scrollTop;
              }
            },
          });
          tween.start();
          // props.onClick && props.onClick();
        }
      };
  `,
};

export const testScript2 = {
  code: `
  import Ripple from '../ripple'
import VarLoading from '../loading'
import { defineComponent, ref } from 'vue'
import { props } from './props'
import emits from './emits'
import { createNamespace } from '../utils/components'
import type { Ref } from 'vue'
const { n, classes } = createNamespace('button')
export default defineComponent({
  name: 'VarButton',
  components: {
    VarLoading,
  },
  directives: { Ripple },
  props,
  emits,
  setup(props,{ emit:emits }) {
    const pending: Ref<boolean> = ref(false)
    const attemptAutoLoading = (result: any) => {
      if (props.autoLoading) {
        pending.value = true
        Promise.resolve(result)
          .then(() => {
            pending.value = false
          })
          .catch(() => {
            pending.value = false
          })
      }
    }
    const handleClick = (e: Event) => {
      const { loading, disabled, onClick } = props
      if (!onClick || loading || disabled || pending.value) {
        return
      }
      attemptAutoLoading(onClick(e))
    }
    const handleTouchstart = (e: Event) => {
      const { loading, disabled, onTouchstart } = props
      if (!onTouchstart || loading || disabled || pending.value) {
        return
      }
      attemptAutoLoading(onTouchstart(e))
    }
    return {
      n,
      classes,
      pending,
      handleClick,
      handleTouchstart,
    }
  },
})
  `,
  transform: `
  import vRipple from '../ripple'
  import VarLoading from '../loading'
  import { ref } from 'vue'
  import { props as $props } from './props'
  import $emits from './emits'
  import { createNamespace } from '../utils/components'
  import type { Ref } from 'vue'
  const { n, classes } = createNamespace('button')

  const props = defineProps($props);
  const emits = defineEmits($emits);
  
  const pending: Ref<boolean> = ref(false)

    const attemptAutoLoading = (result: any) => {
      if (props.autoLoading) {
        pending.value = true
        Promise.resolve(result)
          .then(() => {
            pending.value = false
          })
          .catch(() => {
            pending.value = false
          })
      }
    }
    const handleClick = (e: Event) => {
      const { loading, disabled, onClick } = props
      if (!onClick || loading || disabled || pending.value) {
        return
      }
      attemptAutoLoading(onClick(e))
    }
    const handleTouchstart = (e: Event) => {
      const { loading, disabled, onTouchstart } = props
      if (!onTouchstart || loading || disabled || pending.value) {
        return
      }
      attemptAutoLoading(onTouchstart(e))
    }
  `,
};

export const testScript3 = {
  code: `
  import {
    defineComponent,
    type PropType,
    type CSSProperties,
    type ExtractPropTypes,
  } from 'vue';
  
  // Utils
  import {
    extend,
    numericProp,
    preventDefault,
    makeStringProp,
    createNamespace,
    BORDER_SURROUND,
  } from '../utils';
  import { useRoute, routeProps } from '../composables/use-route';
  
  // Components
  import { Icon } from '../icon';
  import { Loading, LoadingType } from '../loading';
  
  // Types
  import {
    ButtonSize,
    ButtonType,
    ButtonNativeType,
    ButtonIconPosition,
  } from './types';
  
  const [name, bem] = createNamespace('button');
  
   const buttonProps = extend({}, routeProps, {
    tag: makeStringProp<keyof HTMLElementTagNameMap>('button'),
    text: String,
    icon: String,
    type: makeStringProp<ButtonType>('default'),
    size: makeStringProp<ButtonSize>('normal'),
    color: String,
    block: Boolean,
    plain: Boolean,
    round: Boolean,
    square: Boolean,
    loading: Boolean,
    hairline: Boolean,
    disabled: Boolean,
    iconPrefix: String,
    nativeType: makeStringProp<ButtonNativeType>('button'),
    loadingSize: numericProp,
    loadingText: String,
    loadingType: String as PropType<LoadingType>,
    iconPosition: makeStringProp<ButtonIconPosition>('left'),
  });
  
  type ButtonProps = ExtractPropTypes<typeof buttonProps>;
  
  export default defineComponent({
    name,
  
    props: buttonProps,
  
    emits: ['click'],
  
    setup(props, { emit, slots }) {
      const route = useRoute();
  
      const renderLoadingIcon = () => {
        if (slots.loading) {
          return slots.loading();
        }
  
        return
      };
  
      const renderIcon = () => {
        if (props.loading) {
          return renderLoadingIcon();
        }
  
        if (slots.icon) {
          return 
        }
  
        if (props.icon) {
          return
        }
      };
  
      const renderText = () => {
        let text;
        if (props.loading) {
          text = props.loadingText;
        } else {
          text = slots.default ? slots.default() : props.text;
        }
  
        if (text) {
          return 
        }
      };
  
      const getStyle = () => {
        const { color, plain } = props;
        if (color) {
          const style: CSSProperties = {
            color: plain ? color : 'white',
          };
  
          if (!plain) {
            // Use background instead of backgroundColor to make linear-gradient work
            style.background = color;
          }
  
          // hide border when color is linear-gradient
          if (color.includes('gradient')) {
            style.border = 0;
          } else {
            style.borderColor = color;
          }
  
          return style;
        }
      };
  
      const onClick = (event: MouseEvent) => {
        if (props.loading) {
          preventDefault(event);
        } else if (!props.disabled) {
          emit('click', event);
          route();
        }
      };
  
      return {}
    },
  });`,
  transform: `
  import {
    useSlots,
    type PropType,
    type CSSProperties,
    type ExtractPropTypes,
  } from 'vue';
  
  // Utils
  import {
    extend,
    numericProp,
    preventDefault,
    makeStringProp,
    createNamespace,
    BORDER_SURROUND,
  } from '../utils';
  import { useRoute, routeProps } from '../composables/use-route';
  // Components
  import { Icon } from '../icon';
  import { Loading, LoadingType } from '../loading';
  
  // Types
  import {
    ButtonSize,
    ButtonType,
    ButtonNativeType,
    ButtonIconPosition,
  } from './types';
  
  const [name, bem] = createNamespace('button');

   const buttonProps = extend({}, routeProps, {
    tag: makeStringProp<keyof HTMLElementTagNameMap>('button'),
    text: String,
    icon: String,
    type: makeStringProp<ButtonType>('default'),
    size: makeStringProp<ButtonSize>('normal'),
    color: String,
    block: Boolean,
    plain: Boolean,
    round: Boolean,
    square: Boolean,
    loading: Boolean,
    hairline: Boolean,
    disabled: Boolean,
    iconPrefix: String,
    nativeType: makeStringProp<ButtonNativeType>('button'),
    loadingSize: numericProp,
    loadingText: String,
    loadingType: String as PropType<LoadingType>,
    iconPosition: makeStringProp<ButtonIconPosition>('left'),
  });

  type ButtonProps = ExtractPropTypes<typeof buttonProps>;

  const props = defineProps(buttonProps)

  const emit = defineEmits(['click']);

  const slots = useSlots()

  const route = useRoute();
  
  const renderLoadingIcon = () => {
    if (slots.loading) {
      return slots.loading();
    }

    return 
  };

  const renderIcon = () => {
    if (props.loading) {
      return renderLoadingIcon();
    }

    if (slots.icon) {
      return 
    }

    if (props.icon) {
      return 
    }
  };

  const renderText = () => {
    let text;
    if (props.loading) {
      text = props.loadingText;
    } else {
      text = slots.default ? slots.default() : props.text;
    }

    if (text) {
      return 
    }
  };

  const getStyle = () => {
    const { color, plain } = props;
    if (color) {
      const style: CSSProperties = {
        color: plain ? color : 'white',
      };

      if (!plain) {
        // Use background instead of backgroundColor to make linear-gradient work
        style.background = color;
      }

      // hide border when color is linear-gradient
      if (color.includes('gradient')) {
        style.border = 0;
      } else {
        style.borderColor = color;
      }

      return style;
    }
  };

  const onClick = (event: MouseEvent) => {
    if (props.loading) {
      preventDefault(event);
    } else if (!props.disabled) {
      emit('click', event);
      route();
    }
  };
  `,
};

export function transformToSingeLine(str: string | undefined | null) {
  if (!str) {
    return "";
  }
  return str.replace(/\s|,|;|"|'/g, "");
}

<template>
  <div ref="editorContainer" class="h-full w-full" />
</template>

<script lang="ts" setup>
import * as monaco from 'monaco-editor';

const props = defineProps<{ modelValue: string, language: 'typescript' | 'html', readOnly?: boolean }>()

const emit = defineEmits<{ (e: 'update:modelValue', code: string): void }>()

const editorContainer = ref<HTMLElement | null>(null);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);

onMounted(() => {
  editor.value = monaco.editor.create(editorContainer.value!, {
    value: props.modelValue,
    language: props.language,
    readOnly: props.readOnly,
  });

  editor.value.onDidChangeModelContent(() => {
    emit("update:modelValue", editor.value!.getValue());
  });
});

function setValue(value: string) {
  editor.value?.setValue(value)
}

onUnmounted(() => {
  editor.value?.dispose();
});

defineExpose({ setValue })
</script>

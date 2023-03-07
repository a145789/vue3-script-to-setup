import { createApp } from "vue";
import App from "./App.vue";

import * as monaco from "monaco-editor";
import darkTheme from "theme-vitesse/themes/vitesse-dark.json";
import lightTheme from "theme-vitesse/themes/vitesse-light.json";

import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";

window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === "typescript") return new TsWorker();
    if (label === "html") return new HtmlWorker();
    return new EditorWorker();
  },
};

// @ts-expect-error
monaco.editor.defineTheme("vitesse-dark", darkTheme);
// @ts-expect-error
monaco.editor.defineTheme("vitesse-light", lightTheme);

import "uno.css";
import "@unocss/reset/eric-meyer.css";

import "@varlet/touch-emulator";

createApp(App).mount("#app");

<template>
  <div class="base-code-editor" :class="{ 'base-code-editor--disabled': disabled }">
    <label v-if="label" class="base-code-editor__label">
      {{ label }} <span v-if="required" class="required">*</span>
    </label>

    <div ref="editorEl" class="base-code-editor__surface" :style="{ height }"></div>

    <p v-if="error" class="base-code-editor__error">{{ error }}</p>
    <p v-else-if="hint" class="base-code-editor__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    language?: string
    label?: string
    hint?: string
    error?: string
    height?: string
    disabled?: boolean
    required?: boolean
  }>(),
  {
    modelValue: '',
    language: 'javascript',
    height: '260px',
    disabled: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorEl = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let isApplyingExternalValue = false

const configureMonaco = () => {
  ;(self as any).MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'json') return new JsonWorker()
      if (label === 'typescript' || label === 'javascript') return new TsWorker()
      return new EditorWorker()
    },
  }

  monaco.editor.defineTheme('nod8-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7c8798', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7dd3fc' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'fde68a' },
      { token: 'type.identifier', foreground: 'c4b5fd' },
    ],
    colors: {
      'editor.background': '#0b0f17',
      'editor.foreground': '#e5e7eb',
      'editorLineNumber.foreground': '#526071',
      'editorLineNumber.activeForeground': '#d1d5db',
      'editorCursor.foreground': '#a7f3d0',
      'editor.selectionBackground': '#2563eb55',
      'editor.inactiveSelectionBackground': '#33415566',
      'editor.lineHighlightBackground': '#172033',
      'editorIndentGuide.background1': '#243244',
      'editorIndentGuide.activeBackground1': '#64748b',
      'editorWidget.background': '#111827',
      'editorSuggestWidget.background': '#111827',
      'editorSuggestWidget.border': '#334155',
    },
  })
}

onMounted(() => {
  if (!editorEl.value) return
  configureMonaco()

  editor = monaco.editor.create(editorEl.value, {
    value: props.modelValue,
    language: props.language,
    theme: 'nod8-dark',
    readOnly: props.disabled,
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: 'var(--nod8-font-mono)',
    fontSize: 13,
    lineHeight: 20,
    tabSize: 2,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    padding: { top: 12, bottom: 12 },
    renderLineHighlight: 'line',
    smoothScrolling: true,
  })

  editor.onDidChangeModelContent(() => {
    if (isApplyingExternalValue || !editor) return
    emit('update:modelValue', editor.getValue())
  })
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor || value === editor.getValue()) return
    isApplyingExternalValue = true
    editor.setValue(value ?? '')
    isApplyingExternalValue = false
  },
)

watch(
  () => props.language,
  (language) => {
    const model = editor?.getModel()
    if (model) monaco.editor.setModelLanguage(model, language)
  },
)

watch(
  () => props.disabled,
  (readOnly) => {
    editor?.updateOptions({ readOnly })
  },
)

onBeforeUnmount(() => {
  editor?.dispose()
  editor = null
})
</script>

<style scoped>
.base-code-editor {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
  width: 100%;
}

.base-code-editor__label {
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-secondary);
}

.required {
  color: var(--nod8-text-error);
}

.base-code-editor__surface {
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  background: #0b0f17;
}

.base-code-editor__surface:focus-within {
  border-color: var(--nod8-border-strong);
}

.base-code-editor--disabled {
  opacity: 0.65;
}

.base-code-editor__error {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-error);
  margin-top: 2px;
}

.base-code-editor__hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  margin-top: 2px;
}
</style>

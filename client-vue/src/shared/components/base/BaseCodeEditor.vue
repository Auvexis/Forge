<template>
  <div
    class="base-code-editor"
    :class="{
      'base-code-editor--disabled': disabled,
      'base-code-editor--light': resolvedTheme === 'light',
    }"
  >
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
import { useTheme } from '@/shared/composables/useTheme'

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
const { resolvedTheme } = useTheme()
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

  monaco.editor.defineTheme('sailor-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'E6E6E6' },
      { token: 'comment', foreground: '7B748A', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C4A7FF' },
      { token: 'keyword.control', foreground: 'B48EFA' },
      { token: 'string', foreground: '8FE1C2' },
      { token: 'number', foreground: 'F5C37A' },
      { token: 'constant', foreground: 'F5C37A' },
      { token: 'function', foreground: '82AAFF' },
      { token: 'method', foreground: '82AAFF' },
      { token: 'type', foreground: 'D4BFFF' },
      { token: 'type.identifier', foreground: 'D4BFFF' },
      { token: 'variable', foreground: 'E6E6E6' },
      { token: 'identifier', foreground: 'E6E6E6' },
      { token: 'operator', foreground: 'A1A1AA' },
      { token: 'delimiter', foreground: '6B7280' },
    ],
    colors: {
      'editor.background': '#111112',
      'editor.foreground': '#E6E6E6',
      'editorCursor.foreground': '#C4A7FF',
      'editor.selectionBackground': '#8B5CF622',
      'editor.inactiveSelectionBackground': '#FFFFFF08',
      'editor.lineHighlightBackground': '#FFFFFF06',
      'editorGutter.background': '#111112',
      'editorLineNumber.foreground': '#625B71',
      'editorLineNumber.activeForeground': '#E6E6E6',
      'editorIndentGuide.background1': '#232326',
      'editorIndentGuide.activeBackground1': '#4A4458',
      'editorBracketMatch.background': '#A855F718',
      'editorBracketMatch.border': '#222124',
      'editorSuggestWidget.background': '#18181B',
      'editorSuggestWidget.border': '#222124',
      'editorSuggestWidget.selectedBackground': '#FFFFFF0A',
      'editorHoverWidget.background': '#18181B',
      'editorHoverWidget.border': '#222124',
      'editorWidget.background': '#18181B',
      'editorWidget.border': '#222124',
      'scrollbarSlider.background': '#FFFFFF10',
      'scrollbarSlider.hoverBackground': '#FFFFFF18',
      'minimap.background': '#111112',
    },
  })

  monaco.editor.defineTheme('sailor-light', {
    base: 'vs',
    inherit: true,

    rules: [
      { token: '', foreground: '2A2A2E' },
      { token: 'comment', foreground: '9A94A6', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8B5CF6' },
      { token: 'keyword.control', foreground: '7C3AED' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'D97706' },
      { token: 'constant', foreground: 'D97706' },
      { token: 'function', foreground: '2563EB' },
      { token: 'method', foreground: '2563EB' },
      { token: 'type', foreground: '7C3AED' },
      { token: 'type.identifier', foreground: '7C3AED' },
      { token: 'variable', foreground: '2A2A2E' },
      { token: 'identifier', foreground: '2A2A2E' },
      { token: 'operator', foreground: '71717A' },
      { token: 'delimiter', foreground: 'A1A1AA' },
    ],

    colors: {
      // Backgrounds
      'editor.background': '#FAFAFB',
      'editor.foreground': '#2A2A2E',

      // Cursor
      'editorCursor.foreground': '#8B5CF6',

      // Selection
      'editor.selectionBackground': '#8B5CF622',
      'editor.inactiveSelectionBackground': '#00000008',

      // Current line
      'editor.lineHighlightBackground': '#00000004',

      // Gutter
      'editorGutter.background': '#FAFAFB',

      // Line numbers
      'editorLineNumber.foreground': '#A1A1AA',
      'editorLineNumber.activeForeground': '#2A2A2E',

      // Indent guides
      'editorIndentGuide.background1': '#E7E5EA',
      'editorIndentGuide.activeBackground1': '#C4C0CC',

      // Brackets
      'editorBracketMatch.background': '#8B5CF614',
      'editorBracketMatch.border': '#DDD6FE',

      // Suggest
      'editorSuggestWidget.background': '#FFFFFF',
      'editorSuggestWidget.border': '#E5E7EB',
      'editorSuggestWidget.foreground': '#2A2A2E',
      'editorSuggestWidget.selectedBackground': '#F1EDFF',
      'editorSuggestWidget.selectedForeground': '#2A2A2E',
      'editorSuggestWidget.highlightForeground': '#7C3AED',
      'editorSuggestWidget.focusHighlightForeground': '#7C3AED',
      'editorSuggestWidgetStatus.foreground': '#71717A',

      // Hover
      'editorHoverWidget.background': '#FFFFFF',
      'editorHoverWidget.border': '#E5E7EB',

      // Widgets
      'editorWidget.background': '#FFFFFF',
      'editorWidget.border': '#E5E7EB',

      // Scrollbar
      'scrollbarSlider.background': '#00000010',
      'scrollbarSlider.hoverBackground': '#00000018',

      // Minimap
      'minimap.background': '#FAFAFB',
    },
  })
}

const monacoTheme = () => `sailor-${resolvedTheme.value}`

onMounted(() => {
  if (!editorEl.value) return
  configureMonaco()

  editor = monaco.editor.create(editorEl.value, {
    value: props.modelValue,
    language: props.language,
    theme: monacoTheme(),
    readOnly: props.disabled,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    minimap: { enabled: false },
    fontFamily: 'var(--sailor-font-mono)',
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

watch(resolvedTheme, () => {
  monaco.editor.setTheme(monacoTheme())
})

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
  gap: var(--sailor-space-1);
  width: 100%;
}

.base-code-editor__label {
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-medium);
  color: var(--sailor-text-secondary);
}

.required {
  color: var(--sailor-text-error);
}

.base-code-editor__surface {
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: #111112;
}

.base-code-editor--light .base-code-editor__surface {
  background: #ffffff;
}

.base-code-editor__surface:focus-within {
  border-color: var(--sailor-border-strong);
}

.base-code-editor--disabled {
  opacity: 0.65;
}

.base-code-editor__error {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-error);
  margin-top: 2px;
}

.base-code-editor__hint {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-muted);
  margin-top: 2px;
}
</style>

<template>
  <form class="agent-chat-composer" :class="`agent-chat-composer--${props.mode}`" @submit.prevent="submit">
    <textarea
      ref="textareaRef"
      v-model="draft"
      class="agent-chat-composer__input"
      :rows="props.mode === 'hero' ? 1 : 2"
      placeholder="What are the best open opportunities by company size?"
      :disabled="props.sending"
      @input="resizeTextarea"
      @keydown.ctrl.enter.prevent="submit"
    ></textarea>

    <div class="agent-chat-composer__toolbar">
      <span class="agent-chat-composer__spacer" />
      <BaseButton type="button" class="agent-chat-composer__utility" variant="outline" size="sm" icon-left="paperclip">
        Attach
      </BaseButton>
      <BaseDropdownSelect
        v-model="speechLanguage"
        :options="speechLanguages"
        icon-left="languages"
        trigger-class="agent-chat-composer__language-trigger"
        :title="`Speech language: ${selectedSpeechLanguage.label}`"
        @update:model-value="stopSpeechRecognition"
      />
      <BaseDropdownSelect
        :model-value="props.executionMode"
        :options="EXECUTION_MODE_OPTIONS"
        icon-left="route"
        trigger-class="agent-chat-composer__mode-trigger"
        :title="`Execution mode: ${selectedExecutionMode.label}`"
        @update:model-value="emit('update:execution-mode', $event as 'loop' | 'plan')"
      />
      <BaseButton
        type="button"
        class="agent-chat-composer__utility"
        :class="{ 'agent-chat-composer__utility--listening': isListening }"
        variant="outline"
        size="sm"
        :icon-left="isListening ? 'mic-off' : 'mic'"
        :disabled="props.sending || !speechSupported"
        :title="speechSupported ? 'Dictate with Chrome speech recognition' : 'Speech recognition is not available'"
        @click="startSpeechToText"
      >
        Voice
      </BaseButton>
      <BaseButton
        :type="props.sending ? 'button' : 'submit'"
        class="agent-chat-composer__send"
        :variant="props.sending ? 'outline' : 'primary'"
        size="sm"
        :icon-left="props.sending ? 'square' : 'arrow-up'"
        :disabled="props.sending ? false : !draft.trim()"
        @click="props.sending ? emit('cancel') : undefined"
      >
        {{ props.sending ? 'Stop' : 'Send' }}
      </BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseDropdownSelect, { type BaseDropdownSelectOption } from '@/shared/components/base/BaseDropdownSelect.vue'
import { useLocalStorage } from '@/shared/composables/useLocalStorage'

const props = withDefaults(
  defineProps<{
    sending: boolean
    cancelable?: boolean
    mode?: 'dock' | 'hero'
    executionMode?: 'loop' | 'plan'
  }>(),
  {
    cancelable: true,
    mode: 'dock',
    executionMode: 'loop',
  },
)

const emit = defineEmits<{
  send: [message: string]
  cancel: []
  'update:execution-mode': [mode: 'loop' | 'plan']
}>()

const propsSending = computed(() => props.sending)

const draft = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isListening = ref(false)
const speechSupported = computed(() => getSpeechRecognitionCtor() !== null)
const speechLanguage = useLocalStorage('sailor:agent-chat:speech-language', 'en-US')
let activeRecognition: BrowserSpeechRecognition | null = null
let keepRecognitionAlive = false
let speechBaseDraft = ''
let speechFinalTranscript = ''

const defaultSpeechLanguage: BaseDropdownSelectOption = {
  value: 'en-US',
  shortLabel: 'EN-US',
  label: 'English US',
  description: 'en-US',
  meta: 'US',
}
const speechLanguages: BaseDropdownSelectOption[] = [
  defaultSpeechLanguage,
  { value: 'pt-BR', shortLabel: 'PT-BR', label: 'Portuguese Brazil', description: 'pt-BR', meta: 'BR' },
  { value: 'es-ES', shortLabel: 'ES', label: 'Spanish', description: 'es-ES', meta: 'ES' },
  { value: 'fr-FR', shortLabel: 'FR', label: 'French', description: 'fr-FR', meta: 'FR' },
  { value: 'de-DE', shortLabel: 'DE', label: 'German', description: 'de-DE', meta: 'DE' },
  { value: 'it-IT', shortLabel: 'IT', label: 'Italian', description: 'it-IT', meta: 'IT' },
  { value: 'ja-JP', shortLabel: 'JA', label: 'Japanese', description: 'ja-JP', meta: 'JP' },
  { value: 'zh-CN', shortLabel: 'ZH', label: 'Chinese Mandarin', description: 'zh-CN', meta: 'CN' },
]
const EXECUTION_MODE_OPTIONS: BaseDropdownSelectOption[] = [
  { value: 'loop', shortLabel: 'Loop', label: 'Loop', description: 'Run tools step by step' },
  { value: 'plan', shortLabel: 'Plan', label: 'Plan', description: 'Generate a plan first' },
]
const DEFAULT_EXECUTION_MODE_OPTION = EXECUTION_MODE_OPTIONS[0] as BaseDropdownSelectOption

const selectedSpeechLanguage = computed(() =>
  speechLanguages.find((language) => language.value === speechLanguage.value) ?? defaultSpeechLanguage,
)
const selectedExecutionMode = computed(() =>
  EXECUTION_MODE_OPTIONS.find((mode) => mode.value === props.executionMode) ?? DEFAULT_EXECUTION_MODE_OPTION,
)

type BrowserSpeechRecognitionEvent = {
  resultIndex?: number
  results: ArrayLike<{
    isFinal?: boolean
    0?: {
      transcript?: string
    }
  }>
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

function submit() {
  if (propsSending.value) return
  const message = draft.value.trim()
  if (!message) return
  emit('send', message)
  draft.value = ''
  void nextTick(resizeTextarea)
}

function startSpeechToText() {
  if (isListening.value && activeRecognition) {
    keepRecognitionAlive = false
    activeRecognition.stop()
    return
  }

  const Recognition = getSpeechRecognitionCtor()
  if (!Recognition) return

  const recognition = new Recognition()
  activeRecognition = recognition
  keepRecognitionAlive = true
  speechBaseDraft = draft.value.trim()
  speechFinalTranscript = ''
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = selectedSpeechLanguage.value.value
  isListening.value = true

  recognition.onresult = (event) => {
    const resultIndex = event.resultIndex ?? 0
    let interimTranscript = ''
    for (const result of Array.from(event.results).slice(resultIndex)) {
      const transcript = result[0]?.transcript?.trim() ?? ''
      if (!transcript) continue
      if (result.isFinal) speechFinalTranscript = [speechFinalTranscript, transcript].filter(Boolean).join(' ')
      else interimTranscript = [interimTranscript, transcript].filter(Boolean).join(' ')
    }

    setTranscriptPreview(interimTranscript)
  }

  recognition.onerror = (event) => {
    if (event.error && event.error !== 'no-speech') keepRecognitionAlive = false
  }

  recognition.onend = () => {
    if (keepRecognitionAlive && activeRecognition === recognition) {
      try {
        recognition.start()
        return
      } catch {
        keepRecognitionAlive = false
      }
    }

    isListening.value = false
    activeRecognition = null
    speechBaseDraft = ''
    speechFinalTranscript = ''
  }

  recognition.start()
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

function setTranscriptPreview(interimTranscript = '') {
  draft.value = [
    speechBaseDraft,
    speechFinalTranscript.trim(),
    interimTranscript.trim(),
  ].filter(Boolean).join(' ')
  void nextTick(resizeTextarea)
}

function stopSpeechRecognition() {
  if (!activeRecognition) return
  keepRecognitionAlive = false
  activeRecognition.stop()
}

function resizeTextarea() {
  const textarea = textareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`
}

watch(() => draft.value, () => {
  void nextTick(resizeTextarea)
})

onBeforeUnmount(() => {
  keepRecognitionAlive = false
  activeRecognition?.stop()
  activeRecognition = null
})
</script>

<style scoped>
.agent-chat-composer {
  --agent-chat-composer-surface: var(--sailor-bg-base);
  --agent-chat-composer-text: var(--sailor-text-primary);
  --agent-chat-composer-border: var(--sailor-border-strong);
  --agent-chat-composer-shadow: color-mix(in srgb, var(--sailor-bg-inverse) 8%, transparent);

  display: flex;
  width: min(100%, 724px);
  flex-direction: column;
  gap: var(--sailor-space-3);
  border: 1px solid var(--agent-chat-composer-border);
  border-radius: var(--sailor-radius-xl);
  background: var(--agent-chat-composer-surface);
  padding: var(--sailor-space-4);
  box-shadow: var(--sailor-shadow-sm);
}

.agent-chat-composer--dock {
  width: min(100% - var(--sailor-space-12), 760px);
  margin: 0 auto var(--sailor-space-5);
}

.agent-chat-composer--hero {
  width: min(100%, 724px);
}

.agent-chat-composer__input {
  min-height: 28px;
  max-height: 180px;
  resize: none;
  overflow-y: auto;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--agent-chat-composer-text);
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
}

.agent-chat-composer__input:focus {
  outline: none;
}

.agent-chat-composer__input::placeholder {
  color: color-mix(in srgb, var(--agent-chat-composer-text) 78%, transparent);
}

.agent-chat-composer__toolbar {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.agent-chat-composer__spacer {
  flex: 1;
}

.agent-chat-composer__utility {
  position: relative;
  height: 26px;
  border-radius: var(--sailor-radius-full);
  font-size: 12px;
}

.agent-chat-composer__language-trigger {
  height: 26px;
  font-size: 12px;
}

.agent-chat-composer__mode-trigger {
  height: 26px;
  font-size: 12px;
}

.agent-chat-composer__utility--listening {
  color: var(--sailor-text-warning);
}

.agent-chat-composer__utility--listening::after {
  position: absolute;
  inset: -5px;
  border: 1px solid color-mix(in srgb, var(--sailor-amber-400) 45%, transparent);
  border-radius: var(--sailor-radius-full);
  animation: agent-chat-listening-pulse 1.2s ease-out infinite;
  content: '';
}

.agent-chat-composer__send {
  height: 28px;
  align-self: end;
  border-radius: var(--sailor-radius-full);
  font-size: 12px;
}

@keyframes agent-chat-listening-pulse {
  from {
    opacity: 0.8;
    transform: scale(0.92);
  }

  to {
    opacity: 0;
    transform: scale(1.2);
  }
}

</style>

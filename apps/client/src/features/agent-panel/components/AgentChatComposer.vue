<template>
  <form
    class="agent-chat-composer"
    :class="[`agent-chat-composer--${props.mode}`, { 'agent-chat-composer--dragging': draggingFiles }]"
    @submit.prevent="submit"
    @dragenter.prevent="draggingFiles = true"
    @dragover.prevent="draggingFiles = true"
    @dragleave.prevent="draggingFiles = false"
    @drop.prevent="handleDrop"
  >
    <div v-if="pendingAttachments.length" class="agent-chat-composer__attachments" aria-label="Attached files">
      <div
        v-for="attachment in pendingAttachments"
        :key="attachment.id"
        class="agent-chat-composer__attachment"
      >
        <img
          v-if="isImageAttachment(attachment) && attachment.previewUrl"
          class="agent-chat-composer__attachment-preview"
          :src="attachment.previewUrl"
          :alt="attachment.name"
        />
        <span v-else class="agent-chat-composer__attachment-icon">
          <LucideIcon :name="attachmentIcon(attachment)" :size="18" />
        </span>
        <span class="agent-chat-composer__attachment-name">{{ attachment.name }}</span>
        <button
          type="button"
          class="agent-chat-composer__attachment-remove"
          aria-label="Remove attachment"
          @click="removeAttachment(attachment.id)"
        >
          <LucideIcon name="x" :size="12" />
        </button>
      </div>
    </div>

    <textarea
      ref="textareaRef"
      v-model="draft"
      class="agent-chat-composer__input"
      :rows="props.mode === 'hero' ? 1 : 2"
      placeholder="What are the best open opportunities by company size?"
      :disabled="props.sending"
      @input="resizeTextarea"
      @keydown.ctrl.enter.prevent="submit"
      @paste="handlePaste"
    ></textarea>

    <div class="agent-chat-composer__toolbar">
      <span class="agent-chat-composer__spacer" />
      <input
        ref="fileInputRef"
        class="agent-chat-composer__file-input"
        type="file"
        multiple
        @change="handleFileInput"
      />
      <BaseButton
        type="button"
        class="agent-chat-composer__utility"
        variant="outline"
        size="sm"
        icon-left="paperclip"
        :disabled="props.sending"
        @click="fileInputRef?.click()"
      >
        Attach
      </BaseButton>
      <BaseDropdownSelect
        v-model="speechLanguage"
        :options="speechLanguages"
        icon-left="languages"
        trigger-class="agent-chat-composer__language-trigger"
        :disabled="props.sending || !speechSupported"
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
        :disabled="props.sending ? false : !draft.trim() && !pendingAttachments.length"
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
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { AgentPanelPendingAttachment } from '@/features/agent-panel/types/agent-panel.types'

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
  send: [message: string, attachments: AgentPanelPendingAttachment[]]
  cancel: []
  'update:execution-mode': [mode: 'loop' | 'plan']
}>()

const propsSending = computed(() => props.sending)

const draft = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingAttachments = ref<AgentPanelPendingAttachment[]>([])
const draggingFiles = ref(false)
const isListening = ref(false)
const speechSupported = computed(() => getSpeechRecognitionCtor() !== null)
const speechLanguage = useLocalStorage('fabric:agent-chat:speech-language', 'en-US')
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
  if (!message && !pendingAttachments.value.length) return
  const attachments = [...pendingAttachments.value]
  emit('send', message, attachments)
  draft.value = ''
  pendingAttachments.value = []
  void nextTick(resizeTextarea)
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement | null
  addFiles(input?.files)
  if (input) input.value = ''
}

function handleDrop(event: DragEvent) {
  draggingFiles.value = false
  addFiles(event.dataTransfer?.files)
}

function handlePaste(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? [])
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  if (!imageFiles.length) return
  addFiles(imageFiles)
}

function addFiles(files: FileList | File[] | undefined | null) {
  const nextFiles = Array.from(files ?? [])
  if (!nextFiles.length) return
  pendingAttachments.value = [
    ...pendingAttachments.value,
    ...nextFiles.map((file) => ({
      id: `${Date.now()}-${cryptoRandomId()}`,
      file,
      name: file.name || 'pasted-image.png',
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      ...(file.type.startsWith('image/') ? { previewUrl: URL.createObjectURL(file) } : {}),
    })),
  ]
}

function removeAttachment(id: string) {
  const attachment = pendingAttachments.value.find((item) => item.id === id)
  if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.id !== id)
}

function isImageAttachment(attachment: AgentPanelPendingAttachment): boolean {
  return attachment.mimeType.startsWith('image/')
}

function attachmentIcon(attachment: AgentPanelPendingAttachment): string {
  if (attachment.mimeType.includes('pdf')) return 'file-text'
  if (attachment.mimeType.startsWith('video/')) return 'file-video'
  if (attachment.mimeType.startsWith('audio/')) return 'file-audio'
  return 'file'
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
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
  pendingAttachments.value.forEach((attachment) => {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
  })
})
</script>

<style scoped>
.agent-chat-composer {
  --agent-chat-composer-surface: var(--fabric-agent-chat-composer-bg-base);
  --agent-chat-composer-text: var(--fabric-agent-chat-composer-text-primary);
  --agent-chat-composer-border: var(--fabric-agent-chat-composer-border-strong);
  --agent-chat-composer-shadow: color-mix(in srgb, var(--fabric-agent-chat-composer-bg-inverse) 8%, transparent);

  display: flex;
  width: min(100%, 724px);
  flex-direction: column;
  gap: var(--fabric-space-3);
  border: 1px solid var(--agent-chat-composer-border);
  border-radius: var(--fabric-radius-xl);
  background: var(--agent-chat-composer-surface);
  padding: var(--fabric-space-4);
  box-shadow: var(--fabric-agent-chat-composer-shadow-sm);
}

.agent-chat-composer--dock {
  width: min(100% - var(--fabric-space-12), 760px);
  margin: 0 auto var(--fabric-space-5);
}

.agent-chat-composer--hero {
  width: min(100%, 724px);
}

.agent-chat-composer--dragging {
  border-color: var(--fabric-agent-chat-composer-border-focus);
}

.agent-chat-composer__attachments {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--fabric-space-2);
}

.agent-chat-composer__attachment {
  position: relative;
  display: grid;
  width: 72px;
  gap: var(--fabric-space-1);
  justify-items: center;
  color: var(--fabric-agent-chat-composer-text-secondary);
  font-size: 10px;
}

.agent-chat-composer__attachment-preview,
.agent-chat-composer__attachment-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--fabric-agent-chat-composer-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-agent-chat-composer-bg-surface);
  color: var(--fabric-agent-chat-composer-text-muted);
}

.agent-chat-composer__attachment-preview {
  object-fit: cover;
}

.agent-chat-composer__attachment-name {
  width: 100%;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-composer__attachment-remove {
  position: absolute;
  top: -5px;
  right: 8px;
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid var(--fabric-agent-chat-composer-border);
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-agent-chat-composer-bg-surface);
  color: var(--fabric-agent-chat-composer-text-muted);
  cursor: pointer;
  padding: 0;
}

.agent-chat-composer__attachment-remove:hover {
  background: var(--fabric-agent-chat-composer-button-ghost-hover);
  color: var(--fabric-agent-chat-composer-text-primary);
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
  gap: var(--fabric-space-2);
}

.agent-chat-composer__spacer {
  flex: 1;
}

.agent-chat-composer__file-input {
  display: none;
}

.agent-chat-composer__utility {
  position: relative;
  height: 26px;
  border-radius: var(--fabric-radius-full);
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
  color: var(--fabric-agent-chat-composer-text-warning);
}

.agent-chat-composer__utility--listening::after {
  position: absolute;
  inset: -5px;
  border: 1px solid color-mix(in srgb, var(--fabric-agent-chat-composer-amber400) 45%, transparent);
  border-radius: var(--fabric-radius-full);
  animation: agent-chat-listening-pulse 1.2s ease-out infinite;
  content: '';
}

.agent-chat-composer__send {
  height: 28px;
  align-self: end;
  border-radius: var(--fabric-radius-full);
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

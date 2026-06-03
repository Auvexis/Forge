<template>
  <section
    class="agent-chat-view"
    :class="{ 'agent-chat-view--empty-thread': store.hasOpenChat && !store.messages.length }"
    aria-label="Agent chat"
  >
    <header v-if="store.selectedAgent" class="agent-chat-view__header">
      <div class="agent-chat-view__identity">
        <span class="agent-chat-view__emoji">{{ store.selectedAgent.emoji }}</span>
        <span>
          <strong>{{ store.selectedAgent.name }}</strong>
          <small>{{ store.selectedAgent.workflowName }}</small>
        </span>
      </div>

      <div class="agent-chat-view__actions">
        <div class="agent-chat-view__floating-menu">
          <BaseButton
            size="sm"
            variant="outline"
            icon-left="messages-square"
            :disabled="!store.selectedAgentKey"
            title="Chat history"
            @click="historyMenuOpen = !historyMenuOpen"
          >
            History
          </BaseButton>
          <div v-if="historyMenuOpen" class="agent-chat-view__history-menu">
            <button
              v-for="session in store.sessions"
              :key="session.id"
              type="button"
              class="agent-chat-view__history-option"
              :class="{ 'agent-chat-view__history-option--active': session.id === store.selectedSessionId }"
              @click="selectSession(session.id)"
            >
              <span>{{ session.title || 'Untitled chat' }}</span>
              <small>{{ formatMessageTime(session as unknown as AgentChatMessage) }}</small>
            </button>
            <button
              v-if="store.selectedSessionId"
              type="button"
              class="agent-chat-view__history-delete"
              @click="deleteSession(store.selectedSessionId)"
            >
              Delete chat
            </button>
          </div>
        </div>
        <BaseButton
          size="sm"
          variant="primary"
          icon-right="sparkles"
          :disabled="!store.selectedAgentKey"
          title="New Chat"
          @click="startNewChat"
        >
          New Chat
        </BaseButton>
      </div>
    </header>

    <div v-if="!store.selectedAgent" class="agent-chat-view__empty">Select an agent.</div>
    <div v-else-if="!store.hasOpenChat" class="agent-chat-view__empty">Select a chat.</div>
    <template v-else>
      <div ref="messagesEl" class="agent-chat-view__messages">
        <TransitionGroup
          v-if="store.messages.length"
          name="agent-chat-message"
          tag="div"
          class="agent-chat-view__message-list"
        >
          <article
            v-for="(message, index) in store.messages"
            :key="message.id"
            class="agent-chat-view__message"
            :class="[
              `agent-chat-view__message--${message.role}`,
              entranceClass(message),
              { 'agent-chat-view__message--grouped': isGroupedWithPrevious(message, index) },
            ]"
          >
            <span v-if="!isGroupedWithPrevious(message, index)" class="agent-chat-view__avatar">
              {{ messageAvatar(message) }}
            </span>
            <span v-if="!isGroupedWithPrevious(message, index)" class="agent-chat-view__role">
              <strong>{{ messageDisplayName(message) }}</strong>
              <time>{{ formatMessageTime(message) }}</time>
            </span>
            <div v-if="isAgentSummaryContent(message.content)" class="agent-chat-view__summary">
              <strong>{{ message.content.message }}</strong>
              <ul class="agent-chat-view__summary-tools">
                <li v-for="tool in message.content.tools" :key="tool.toolCallId">
                  <span class="agent-chat-view__plugin-icon" :title="tool.pluginName ?? tool.name">
                    <LucideIcon :name="pluginIconName(tool.pluginId, 'box')" :size="14" />
                  </span>
                  <span>{{ tool.pluginName ? `${tool.name} (${tool.pluginName})` : tool.name }}</span>
                </li>
              </ul>
            </div>
            <div
              v-else-if="isAgentProgressContent(message.content)"
              class="agent-chat-view__progress"
              :class="`agent-chat-view__progress--${message.content.status}`"
            >
              <span
                class="agent-chat-view__plugin-icon"
                :title="message.content.tool?.pluginName ?? message.content.tool?.name"
              >
                <LucideIcon
                  :name="pluginIconName(message.content.tool?.pluginId, progressIcon(message.content.status))"
                  :size="14"
                />
              </span>
              <span>{{ progressMessage(message.content) }}</span>
            </div>
            <div
              v-else-if="isPendingAssistantMessage(message)"
              class="agent-chat-view__typing-dots"
              aria-label="Agent is responding"
            >
              <span />
              <span />
              <span />
            </div>
            <div v-else-if="isAgentApprovalContent(message.content)" class="agent-chat-view__approval">
              <p>{{ message.content.message }}</p>
              <div class="agent-chat-view__approval-actions">
                <BaseButton
                  v-if="!message.content.decision"
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="store.approvalPendingId === message.content.approvalId"
                  @click="rejectAgentApproval(message.content)"
                >
                  Decline
                </BaseButton>
                <BaseButton
                  v-if="!message.content.decision"
                  type="button"
                  variant="primary"
                  size="sm"
                  :disabled="store.approvalPendingId === message.content.approvalId"
                  @click="approveAgentApproval(message.content)"
                >
                  Confirm
                </BaseButton>
              </div>
            </div>
            <p v-else-if="isAgentErrorContent(message.content)" class="agent-chat-view__error">
              {{ message.content.message }}
            </p>
            <div v-else-if="isWaitingUserContent(message.content)" class="agent-chat-view__waiting">
              <p>{{ messageText(message.content) }}</p>
              <ul v-if="waitingUserOptions(message.content).length" class="agent-chat-view__waiting-options">
                <li v-for="option in waitingUserOptions(message.content)" :key="waitingOptionLabel(option)">
                  <BaseButton
                    type="button"
                    class="agent-chat-view__waiting-option"
                    variant="outline"
                    size="sm"
                    :disabled="store.sending"
                    @click="sendWaitingUserOption(option)"
                  >
                    {{ waitingOptionLabel(option) }}
                  </BaseButton>
                </li>
              </ul>
            </div>
            <p v-else-if="messageText(message.content)">{{ messageText(message.content) }}</p>
          </article>
        </TransitionGroup>

        <div v-else class="agent-chat-view__prompt-stage">
          <Transition name="agent-chat-composer-shift" appear>
            <AgentChatComposer
              mode="hero"
              :sending="store.sending"
              :cancelable="store.sending"
              @send="store.sendMessage"
              @cancel="store.cancelActiveExecution"
            />
          </Transition>
          <p>Centra may display inaccurate info, so please double check the response.</p>
        </div>
      </div>

      <Transition name="agent-chat-composer-shift" appear>
        <AgentChatComposer
          v-if="store.messages.length && !composerRetiring"
          mode="dock"
          :sending="store.sending"
          :cancelable="store.sending"
          @send="store.sendMessage"
          @cancel="store.cancelActiveExecution"
        />
      </Transition>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import AgentChatComposer from '@/features/agent-panel/components/AgentChatComposer.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import type { AgentChatMessage } from '@/features/agent-runtime/types/agent.types'
import type {
  AgentPanelApprovalContent,
  AgentPanelErrorContent,
  AgentPanelProgressContent,
  AgentPanelSummaryContent,
} from '@/features/agent-panel/types/agent-panel.types'
import type { PluginSummary } from '@/core/types/plugin.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useConfirm } from '@/shared/composables/useConfirm'

const store = useAgentPanelStore()
const profileStore = useProfileStore()
const plugins = ref<PluginSummary[]>([])
const messagesEl = ref<HTMLElement | null>(null)
const composerRetiring = ref(false)
const historyMenuOpen = ref(false)
const { confirm } = useConfirm()

const displayedMessagesScrollKey = computed(() => store.messages
  .map((message) => `${message.id}:${message.role}:${messageContentScrollVersion(message.content)}`)
  .join('|'))

onMounted(async () => {
  try {
    plugins.value = await pluginsApi.getAll()
  } catch {
    plugins.value = []
  }
})

watch(
  displayedMessagesScrollKey,
  () => {
    void scrollMessagesToBottom()
  },
  { flush: 'post' },
)

function messageText(content: unknown): string {
  if (isAgentSummaryContent(content)) return ''
  if (isAgentProgressContent(content)) return ''
  if (typeof content === 'string') return content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
  const record = content as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  if (typeof record.content === 'string') return record.content
  return JSON.stringify(content)
}

function messageContentScrollVersion(content: unknown): string {
  if (typeof content === 'string') return `text:${content.length}`
  if (!content || typeof content !== 'object' || Array.isArray(content)) return String(content)
  const record = content as Record<string, unknown>
  const text = typeof record.text === 'string' ? record.text.length : 0
  const kind = typeof record.kind === 'string' ? record.kind : ''
  const status = typeof record.status === 'string' ? record.status : ''
  const decision = typeof record.decision === 'string' ? record.decision : ''
  const pending = record.pending === true ? 'pending' : ''
  const options = Array.isArray(record.options) ? record.options.length : 0
  return `${kind}:${status}:${decision}:${pending}:${text}:${options}`
}

function isAgentProgressContent(content: unknown): content is AgentPanelProgressContent {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      (content as { kind?: unknown }).kind === 'agentProgress',
  )
}

function isAgentSummaryContent(content: unknown): content is AgentPanelSummaryContent {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      (content as { kind?: unknown }).kind === 'agentSummary',
  )
}

function isAgentApprovalContent(content: unknown): content is AgentPanelApprovalContent {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      (content as { kind?: unknown }).kind === 'agentApproval',
  )
}

function isAgentErrorContent(content: unknown): content is AgentPanelErrorContent {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      (content as { kind?: unknown }).kind === 'agentError' &&
      typeof (content as { message?: unknown }).message === 'string',
  )
}

function isWaitingUserContent(content: unknown): boolean {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      (content as { waitingUser?: unknown }).waitingUser === true,
  )
}

function waitingUserOptions(content: unknown): unknown[] {
  if (!isWaitingUserContent(content)) return []
  const options = (content as { options?: unknown }).options
  return Array.isArray(options) ? options : []
}

function waitingOptionLabel(option: unknown): string {
  if (typeof option === 'string') return option
  if (!option || typeof option !== 'object' || Array.isArray(option)) return String(option)
  const record = option as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name : ''
  const id = typeof record.id === 'string' ? record.id : ''
  if (name && id) return `${name} (${id})`
  return name || id || JSON.stringify(option)
}

function sendWaitingUserOption(option: unknown) {
  const label = waitingOptionLabel(option)
  if (!label) return
  void store.sendMessage(`Use ${label}`)
}

function approveAgentApproval(approval: AgentPanelApprovalContent) {
  void store.approveApproval(approval)
}

function rejectAgentApproval(approval: AgentPanelApprovalContent) {
  void store.rejectApproval(approval)
}

function progressMessage(content: AgentPanelProgressContent): string {
  return content.message
}

function progressIcon(status: AgentPanelProgressContent['status']): string {
  if (status === 'success') return 'check'
  if (status === 'failed') return 'triangle-alert'
  if (status === 'retrying') return 'rotate-cw'
  if (status === 'running') return 'loader-circle'
  return 'wrench'
}

function pluginIconName(pluginId: string | undefined, fallback: string): string {
  if (!pluginId) return fallback
  const plugin = plugins.value.find(
    (candidate) => candidate.id === pluginId || candidate.manifest.metadata.id === pluginId,
  )
  if (!plugin) return fallback
  return resolvePluginIcon(plugin.manifest.metadata, { fallback })
}

function isPendingAssistantMessage(message: AgentChatMessage): boolean {
  if (message.role !== 'assistant') return false
  const content = message.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false
  return (content as Record<string, unknown>).pending === true && !messageText(content)
}

function isGroupedWithPrevious(message: AgentChatMessage, index: number): boolean {
  if (index <= 0 || message.role !== 'assistant') return false
  const previous = store.messages[index - 1]
  return Boolean(previous && previous.role === 'assistant')
}

function messageDisplayName(message: AgentChatMessage): string {
  if (message.role === 'user') return profileStore.currentProfile?.name ?? 'User'
  if (message.role === 'assistant') return store.selectedAgent?.name ?? 'Assistant'
  return message.role.charAt(0).toUpperCase() + message.role.slice(1)
}

function messageAvatar(message: AgentChatMessage): string {
  if (message.role === 'user') return profileStore.currentProfile?.avatarEmoji ?? 'U'
  if (message.role === 'assistant') return store.selectedAgent?.emoji ?? 'AI'
  return '*'
}

function formatMessageTime(message: AgentChatMessage): string {
  const raw = (message as { createdAt?: string; timestamp?: string }).createdAt ?? (message as { timestamp?: string }).timestamp
  const date = raw ? new Date(raw) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
}

function entranceClass(message: AgentChatMessage): string {
  const entrance = (message as AgentChatMessage & { entrance?: string }).entrance
  if (entrance === 'user') return 'agent-chat-view__message--enter-user'
  if (entrance === 'assistant') return 'agent-chat-view__message--enter-assistant'
  return ''
}

async function scrollMessagesToBottom() {
  await nextTick()
  messagesEl.value?.scrollTo({
    top: messagesEl.value.scrollHeight,
    behavior: 'smooth',
  })
}

async function startNewChat() {
  if (!store.selectedAgentKey) return
  if (!store.messages.length) {
    store.openDraftSession()
    return
  }

  composerRetiring.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 240))
  store.openDraftSession()
  await nextTick()
  composerRetiring.value = false
}

async function selectSession(sessionId: string) {
  historyMenuOpen.value = false
  await store.selectSession(sessionId)
}

async function deleteSession(sessionId: string) {
  const dangerousMemoryMode = 'transcript-only'
  const memoryModeOptions = ['session', 'transcript-only', 'all-agent-memory']
  const accepted = await confirm({
    title: 'Delete chat?',
    message: `Delete this chat transcript. Available cleanup modes: ${memoryModeOptions.join(', ')}.`,
    confirmText: 'Delete transcript',
    cancelText: 'Cancel',
    variant: 'danger',
  })
  if (!accepted) return
  await store.deleteSession(sessionId, dangerousMemoryMode)
  historyMenuOpen.value = false
}
</script>

<style scoped>
.agent-chat-view {
  position: relative;
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}

.agent-chat-view__header {
  position: relative;
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-4);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-4) var(--sailor-space-8);
}

.agent-chat-view__identity {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--sailor-space-3);
}

.agent-chat-view__identity span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.agent-chat-view__identity strong,
.agent-chat-view__identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-view__identity strong {
  color: var(--sailor-text-primary);
  font-size: 12px;
  font-weight: var(--sailor-font-semibold);
}

.agent-chat-view__identity small {
  color: var(--sailor-text-secondary);
  font-size: 10px;
}

.agent-chat-view__emoji,
.agent-chat-view__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-bg-base);
}

.agent-chat-view__emoji {
  width: 32px;
  height: 32px;
  font-size: 17px;
}

.agent-chat-view__avatar {
  width: 28px;
  height: 28px;
  font-size: var(--sailor-text-sm);
}

.agent-chat-view__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-2);
  margin-left: auto;
}

.agent-chat-view__floating-menu {
  position: relative;
}

.agent-chat-view__history-menu {
  position: absolute;
  top: calc(100% + var(--sailor-space-2));
  right: 0;
  z-index: var(--sailor-z-raised);
  display: grid;
  width: min(320px, 72vw);
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--sailor-border);
  background: var(--sailor-bg-elevated);
  box-shadow: var(--sailor-shadow-lg);
}

.agent-chat-view__history-option,
.agent-chat-view__history-delete {
  display: grid;
  gap: 2px;
  border: 0;
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
  padding: 8px 10px;
  text-align: left;
}

.agent-chat-view__history-option:hover,
.agent-chat-view__history-option--active {
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}

.agent-chat-view__history-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-view__history-option small,
.agent-chat-view__history-delete {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.agent-chat-view__history-delete {
  border-top: 1px solid var(--sailor-border);
  color: var(--sailor-red-600);
  font-weight: var(--sailor-font-semibold);
}

.agent-chat-view__actions :deep(.base-button) {
  height: 28px;
  border-radius: var(--sailor-radius-full);
  font-size: 11px;
}

.agent-chat-view__actions :deep(.base-button--outline) {
  box-shadow: var(--sailor-shadow-sm);
}

.agent-chat-view__actions :deep(.base-button--primary) {
  border-color: var(--sailor-button-primary-border);
  background: var(--sailor-button-primary-bg);
  color: var(--sailor-button-primary-text);
}

.agent-chat-view__messages {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: auto;
  margin: 0 var(--sailor-space-8) var(--sailor-space-5);
  border-radius: var(--sailor-radius-sm);
  padding: var(--sailor-space-8);
}

.agent-chat-view--empty-thread .agent-chat-view__messages {
  justify-content: center;
  align-items: center;
  padding-bottom: 16vh;
}

.agent-chat-view__prompt-stage {
  display: grid;
  width: min(100%, 545px);
  gap: var(--sailor-space-4);
  justify-items: center;
}

.agent-chat-view__prompt-stage p {
  margin: 0;
  color: var(--sailor-text-secondary);
  font-size: 10px;
  text-align: center;
}

.agent-chat-view__message-list {
  display: flex;
  width: min(100%, 820px);
  flex-direction: column;
  gap: var(--sailor-space-5);
  margin: 0 auto;
}

.agent-chat-view__message {
  display: grid;
  max-width: min(700px, 92%);
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--sailor-space-1) var(--sailor-space-2);
}

.agent-chat-view__message--enter-user {
  animation: agent-message-in-user 180ms ease-out both;
}

.agent-chat-view__message--enter-assistant {
  animation: agent-message-in-assistant 180ms ease-out both;
}

.agent-chat-view__message--user {
  align-self: flex-end;
  grid-template-columns: minmax(0, 1fr) auto;
}

.agent-chat-view__message--user .agent-chat-view__avatar {
  grid-column: 2;
  grid-row: 1 / span 2;
}

.agent-chat-view__message--assistant,
.agent-chat-view__message--tool,
.agent-chat-view__message--system {
  align-self: flex-start;
}

.agent-chat-view__message--grouped {
  margin-top: var(--sailor-space-1);
}

.agent-chat-view__role {
  display: inline-flex;
  align-items: baseline;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-bold);
}

.agent-chat-view__message--user .agent-chat-view__role {
  justify-content: flex-end;
}

.agent-chat-view__role time {
  color: var(--sailor-text-muted);
  font-weight: var(--sailor-font-medium);
}

.agent-chat-view__message p,
.agent-chat-view__waiting,
.agent-chat-view__typing-dots {
  grid-column: 2;
  margin: 0;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
  line-height: 1.55;
  white-space: pre-wrap;
}

.agent-chat-view__message--user p {
  grid-column: 1;
  border-radius: var(--sailor-radius-lg);
  background: transparent;
  padding: 0;
  color: var(--sailor-text-primary);
  box-shadow: none;
  text-align: right;
}

.agent-chat-view__waiting {
  display: grid;
  gap: var(--sailor-space-2);
}

.agent-chat-view__waiting p {
  grid-column: auto;
}

.agent-chat-view__approval {
  display: grid;
  grid-column: 2;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
}

.agent-chat-view__approval p {
  grid-column: auto;
}

.agent-chat-view__approval-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--sailor-space-2);
}

.agent-chat-view__waiting-options {
  display: grid;
  gap: var(--sailor-space-1);
  margin: 0;
  padding: 0;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  list-style: none;
}

.agent-chat-view__waiting-option {
  width: fit-content;
  max-width: 100%;
  border-radius: var(--sailor-radius-full);
  text-align: left;
}

.agent-chat-view__waiting-option:hover:not(:disabled) {
  color: var(--sailor-text-primary);
}

.agent-chat-view__typing-dots {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 4px;
  min-height: 18px;
}

.agent-chat-view__typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-text-muted);
  animation: agent-chat-typing-bounce 0.9s ease-in-out infinite;
}

.agent-chat-view__typing-dots span:nth-child(2) {
  animation-delay: 0.12s;
}

.agent-chat-view__typing-dots span:nth-child(3) {
  animation-delay: 0.24s;
}

.agent-chat-view__progress,
.agent-chat-view__summary {
  grid-column: 2;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
  line-height: 1.5;
}

.agent-chat-view__progress {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: var(--sailor-space-2);
  border: 0;
  background: transparent;
  padding: 0;
}

.agent-chat-view__progress--running svg,
.agent-chat-view__progress--retrying svg {
  animation: agent-progress-spin 0.9s linear infinite;
}

.agent-chat-view__progress--success {
  color: var(--sailor-green-600);
}

.agent-chat-view__progress--failed {
  color: var(--sailor-red-600);
}

.agent-chat-view__plugin-icon {
  display: inline-grid;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
}

.agent-chat-view__summary {
  display: grid;
  width: min(100%, 520px);
  gap: var(--sailor-space-2);
  border: 0;
  background: transparent;
  padding: 0;
}

.agent-chat-view__summary-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sailor-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-chat-view__summary-tools li {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  border: 0;
  padding: 0;
}

.agent-chat-view__empty {
  display: grid;
  flex: 1;
  place-items: center;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
}

.agent-chat-composer-shift-enter-active,
.agent-chat-composer-shift-leave-active {
  transition:
    opacity var(--sailor-duration-slow) var(--sailor-ease-standard),
    transform var(--sailor-duration-slow) var(--sailor-ease-standard),
    width var(--sailor-duration-slow) var(--sailor-ease-standard);
}

.agent-chat-composer-shift-enter-from,
.agent-chat-composer-shift-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

.agent-chat-message-move,
.agent-chat-message-enter-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.agent-chat-message-leave-active {
  display: none;
}

.agent-chat-message-enter-from {
  opacity: 0;
  transform: translate3d(0, 12px, 0);
}

.agent-chat-message-leave-to {
  opacity: 0;
  transform: translate3d(0, -8px, 0);
}

@keyframes agent-message-in-user {
  from {
    opacity: 0;
    transform: translate3d(18px, 18px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes agent-message-in-assistant {
  from {
    opacity: 0;
    transform: translate3d(-18px, 18px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes agent-chat-typing-bounce {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@keyframes agent-progress-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 820px) {
  .agent-chat-view__header {
    padding: var(--sailor-space-3);
  }

  .agent-chat-view__actions :deep(.base-button__label) {
    display: none;
  }
}
</style>

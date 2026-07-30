<template>
  <div class="agent-timeline" :data-revision="snapshot.revision">
    <article
      v-for="entry in snapshot.messages"
      :key="entry.message.id"
      class="agent-timeline__message"
      :data-role="entry.message.role"
    >
      <header>
        <span>{{ roleLabel(entry.message.role) }}</span>
        <time>{{ formatTime(entry.message.createdAt) }}</time>
      </header>

      <div class="agent-timeline__parts">
        <template v-for="part in entry.parts" :key="part.id">
          <p v-if="part.type === 'text'" class="agent-timeline__text">
            {{ part.text }}
            <span v-if="part.state === 'streaming'" class="agent-timeline__cursor" />
          </p>

          <section v-else-if="part.type === 'tool'" class="agent-timeline__step" :data-state="part.state.status">
            <span class="agent-timeline__state-dot" />
            <div>
              <strong>{{ part.toolName }}</strong>
              <small>{{ toolStateLabel(part.state.status, part.state.attempt) }}</small>
              <pre v-if="part.state.status === 'error'">{{ formatValue(part.state.error) }}</pre>
            </div>
          </section>

          <section v-else-if="part.type === 'interaction'" class="agent-timeline__interaction" :data-state="part.state">
            <small>{{ part.kind }}</small>
            <strong>{{ part.question }}</strong>
            <span v-if="part.state !== 'pending'">{{ part.state }}</span>
          </section>

          <section v-else-if="part.type === 'commitment'" class="agent-timeline__commitments">
            <div v-for="item in part.items" :key="item.id" :data-state="item.status">
              <span class="agent-timeline__state-dot" />
              <span>{{ item.description }}</span>
            </div>
          </section>

          <a v-else-if="part.type === 'artifact'" class="agent-timeline__artifact" :href="part.artifactRef">
            {{ part.name }}
            <small>{{ formatBytes(part.size) }}</small>
          </a>

          <pre v-else-if="part.type === 'error'" class="agent-timeline__error">{{ formatValue(part.error) }}</pre>

          <details v-else-if="part.type === 'compaction'" class="agent-timeline__compaction">
            <summary>Earlier context compacted</summary>
            <p>{{ part.summary }}</p>
          </details>
        </template>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type {
  AgentChatMessageRole,
  AgentSessionSnapshot,
  AgentSessionPart,
} from '../types/agent.types'

defineProps<{ snapshot: AgentSessionSnapshot }>()

function roleLabel(role: Exclude<AgentChatMessageRole, 'tool'>) {
  if (role === 'assistant') return 'Agent'
  if (role === 'system') return 'System'
  return 'You'
}

function toolStateLabel(
  status: Extract<AgentSessionPart, { type: 'tool' }>['state']['status'],
  attempt?: number,
) {
  const suffix = attempt && attempt > 1 ? ` · attempt ${attempt}` : ''
  if (status === 'completed') return `Completed${suffix}`
  if (status === 'error') return `Failed${suffix}`
  if (status === 'running') return `Running${suffix}`
  return `Pending${suffix}`
}

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatValue(value: unknown) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return 'Unknown error'
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped>
.agent-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.agent-timeline__message {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
}

.agent-timeline__message > header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--fabric-chat-session-panel-text-muted);
  font-size: 10px;
  text-align: right;
}

.agent-timeline__message > header span {
  color: var(--fabric-chat-session-panel-text-primary);
  font-size: 11px;
  font-weight: 700;
}

.agent-timeline__parts {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.agent-timeline__text,
.agent-timeline__compaction p {
  margin: 0;
  color: var(--fabric-chat-session-panel-text-secondary);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-timeline__cursor {
  display: inline-block;
  width: 5px;
  height: 12px;
  margin-left: 2px;
  background: var(--fabric-chat-session-panel-green400);
  animation: cursor-blink 900ms steps(1) infinite;
  vertical-align: -2px;
}

.agent-timeline__step,
.agent-timeline__interaction,
.agent-timeline__commitments,
.agent-timeline__artifact,
.agent-timeline__compaction {
  border: 1px solid var(--fabric-chat-session-panel-border);
  border-radius: 3px;
  background: var(--fabric-chat-session-panel-bg-surface);
}

.agent-timeline__step {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  align-items: start;
  gap: 7px;
  padding: 7px 8px;
}

.agent-timeline__state-dot {
  width: 6px;
  height: 6px;
  margin-top: 4px;
  border-radius: 50%;
  background: var(--fabric-chat-session-panel-amber400);
}

[data-state='completed'] > .agent-timeline__state-dot,
.agent-timeline__commitments [data-state='completed'] .agent-timeline__state-dot {
  background: var(--fabric-chat-session-panel-green400);
}

[data-state='error'] > .agent-timeline__state-dot,
.agent-timeline__commitments [data-state='failed'] .agent-timeline__state-dot {
  background: var(--fabric-chat-session-panel-red400);
}

.agent-timeline__step div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.agent-timeline__step strong,
.agent-timeline__interaction strong {
  color: var(--fabric-chat-session-panel-text-primary);
  font: 600 11px var(--fabric-font-mono);
}

.agent-timeline__step small,
.agent-timeline__interaction small,
.agent-timeline__artifact small {
  color: var(--fabric-chat-session-panel-text-muted);
  font-size: 10px;
}

.agent-timeline__step pre,
.agent-timeline__error {
  overflow: auto;
  margin: 4px 0 0;
  color: var(--fabric-chat-session-panel-text-error);
  font: 10px/1.4 var(--fabric-font-mono);
  white-space: pre-wrap;
}

.agent-timeline__interaction {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-left: 2px solid var(--fabric-chat-session-panel-amber400);
}

.agent-timeline__commitments {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.agent-timeline__commitments > div {
  display: grid;
  min-height: 22px;
  grid-template-columns: 8px minmax(0, 1fr);
  align-items: start;
  gap: 7px;
  padding: 3px 8px;
  color: var(--fabric-chat-session-panel-text-secondary);
  font-size: 11px;
}

.agent-timeline__artifact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--fabric-chat-session-panel-text-primary);
  font: 11px var(--fabric-font-mono);
  padding: 6px 8px;
  text-decoration: none;
}

.agent-timeline__artifact:hover {
  border-color: var(--fabric-chat-session-panel-border-strong);
}

.agent-timeline__compaction {
  color: var(--fabric-chat-session-panel-text-muted);
  font-size: 10px;
  padding: 5px 8px;
}

.agent-timeline__compaction p {
  margin-top: 6px;
  font-size: 11px;
}

@keyframes cursor-blink {
  50% { opacity: 0; }
}
</style>

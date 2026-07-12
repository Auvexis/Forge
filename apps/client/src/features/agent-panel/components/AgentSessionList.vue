<template>
  <aside class="agent-session-list" aria-label="Agent chat sessions">
    <header class="agent-session-list__header">
      <h2>Chat</h2>
      <div class="agent-session-list__search-control">
        <input
          v-model="sessionSearch"
          type="search"
          placeholder="Search chats"
          aria-label="Search chats"
        />
        <LucideIcon name="search" :size="15" aria-hidden="true" />
      </div>
    </header>

    <BaseButton
      class="agent-session-list__new"
      :disabled="!store.selectedAgentKey"
      icon-left="plus"
      icon-right="sparkles"
      variant="primary"
      full-width
      @click="store.createSession()"
    >
      New Chat
    </BaseButton>

    <div v-if="!store.selectedAgentKey" class="agent-session-list__state">Select an agent.</div>
    <div v-else-if="!sessionGroups.length" class="agent-session-list__state">
      {{ sessionSearch.trim() ? 'No chats match this search.' : 'No chats yet.' }}
    </div>

    <div class="agent-session-list__rows">
      <section
        v-for="group in sessionGroups"
        :key="group.key"
        class="agent-session-list__group"
      >
        <BaseButton
          type="button"
          class="agent-session-list__group-toggle"
          variant="ghost"
          size="sm"
          :icon-left="collapsedGroups.has(group.key) ? 'chevron-right' : 'chevron-down'"
          @click="toggleGroup(group.key)"
        >
          {{ group.label }}
        </BaseButton>

        <Transition name="agent-session-group">
          <div
            v-if="!collapsedGroups.has(group.key)"
            class="agent-session-list__group-rows"
          >
            <div
              v-for="session in group.sessions"
              :key="session.id"
              class="agent-session-list__row"
              :class="{ 'agent-session-list__row--active': session.id === store.selectedSessionId }"
            >
              <BaseButton type="button" class="agent-session-list__select" variant="ghost" @click="store.selectSession(session.id)">
                <span class="agent-session-list__title">{{ session.title }}</span>
              </BaseButton>
              <BaseButton
                type="button"
                size="icon"
                variant="ghost"
                class="agent-session-list__more"
                title="Chat actions"
                icon-left="ellipsis"
                @click.stop="toggleSessionMenu(session.id, $event)"
              />
            </div>
          </div>
        </Transition>
      </section>
    </div>

    <Teleport to="body">
      <Transition name="agent-session-menu">
        <div
          v-if="openMenuSession"
          ref="menuRef"
          class="agent-session-list__menu"
          :style="menuStyle"
          role="menu"
        >
          <BaseButton
            type="button"
            size="sm"
            variant="danger"
            icon-left="trash-2"
            full-width
            @click="deleteSession(openMenuSession.id)"
          >
            Delete chat
          </BaseButton>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AgentChatSession } from '@/features/agent-runtime/types/agent.types'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const store = useAgentPanelStore()
const sessionSearch = ref('')
const openMenuSessionId = ref('')
const menuAnchorRect = ref<DOMRect | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuTriggerRef = ref<HTMLElement | null>(null)
const collapsedGroups = ref(new Set<string>())
const filteredSessions = computed(() => {
  const query = sessionSearch.value.trim().toLowerCase()
  if (!query) return store.sessions
  return store.sessions.filter((session) => session.title.toLowerCase().includes(query))
})
const sessionGroups = computed(() => {
  const groups = new Map<string, { key: string; label: string; sessions: AgentChatSession[] }>()
  for (const session of filteredSessions.value) {
    const date = new Date(session.createdAt)
    const key = Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString().slice(0, 10)
    const label = Number.isNaN(date.getTime())
      ? 'Other'
      : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(date)
    const group = groups.get(key) ?? { key, label, sessions: [] }
    group.sessions.push(session)
    groups.set(key, group)
  }
  return Array.from(groups.values())
})
const openMenuSession = computed(() =>
  store.sessions.find((session) => session.id === openMenuSessionId.value) ?? null,
)
const menuStyle = computed(() => {
  const rect = menuAnchorRect.value
  if (!rect) return {}
  const menuWidth = 136
  const viewportWidth = globalThis.window?.innerWidth ?? 0
  const centeredLeft = rect.left + rect.width / 2 - menuWidth / 2
  const left = viewportWidth
    ? Math.min(viewportWidth - menuWidth - 8, Math.max(8, centeredLeft))
    : Math.max(8, centeredLeft)
  return {
    left: `${left}px`,
    top: `${Math.max(8, rect.top - 44)}px`,
  }
})

function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedGroups.value = next
}

function toggleSessionMenu(sessionId: string, event: MouseEvent) {
  if (openMenuSessionId.value === sessionId) {
    closeSessionMenu()
    return
  }

  const target = event.currentTarget as HTMLElement | null
  menuAnchorRect.value = target?.getBoundingClientRect() ?? null
  menuTriggerRef.value = target
  openMenuSessionId.value = sessionId
}

function closeSessionMenu() {
  openMenuSessionId.value = ''
  menuAnchorRect.value = null
  menuTriggerRef.value = null
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!openMenuSessionId.value) return
  const target = event.target as Node | null
  if (!target) return
  if (menuRef.value?.contains(target)) return
  if (menuTriggerRef.value?.contains(target)) return
  closeSessionMenu()
}

async function deleteSession(sessionId: string) {
  await store.deleteSession(sessionId, 'session')
  closeSessionMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<style scoped>
.agent-session-list {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  gap: var(--fabric-space-3);
  border-right: 1px solid var(--fabric-border);
  background: var(--fabric-bg-surface);
  padding: var(--fabric-space-5) var(--fabric-space-4);
}

.agent-session-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-2);
  min-width: 0;
  overflow: visible;
}

.agent-session-list__header h2 {
  margin: 0;
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
}

.agent-session-list__search-control {
  position: relative;
  display: flex;
  align-items: center;
  width: min(154px, 70%);
  height: 30px;
}

.agent-session-list__search-control input {
  width: 100%;
  height: 100%;
  min-width: 0;
  border: 1px solid var(--fabric-input-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-input-bg);
  padding: 0 30px 0 var(--fabric-space-3);
  color: var(--fabric-input-text);
  font: inherit;
  font-size: var(--fabric-text-xs);
  transition:
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    width var(--fabric-duration-base) var(--fabric-ease-standard);
}

.agent-session-list__search-control input:focus {
  border-color: var(--fabric-input-border-focus);
  outline: none;
}

.agent-session-list__search-control svg {
  position: absolute;
  right: var(--fabric-space-2);
  color: var(--fabric-text-muted);
  pointer-events: none;
}

.agent-session-list__new {
  display: inline-flex;
  width: 100%;
  min-width: 0;
  height: 36px;
  justify-content: center;
  border-color: var(--fabric-button-primary-border);
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-button-primary-bg);
  color: var(--fabric-button-primary-text);
  font-size: var(--fabric-text-xs);
  white-space: nowrap;
  box-shadow: var(--fabric-shadow-sm);
}

.agent-session-list__state {
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  line-height: 1.4;
}

.agent-session-list__rows {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--fabric-space-3);
  overflow: auto;
}

.agent-session-list__group {
  display: grid;
  gap: var(--fabric-space-1);
}

.agent-session-list__group-toggle {
  width: 100%;
  justify-content: flex-start;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.agent-session-list__group-rows {
  display: grid;
  gap: var(--fabric-space-1);
}

.agent-session-list__row {
  position: relative;
  z-index: 1;
  border-radius: var(--fabric-radius-md);
  background: transparent;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.agent-session-list__row:hover,
.agent-session-list__row--active {
  background: var(--fabric-button-ghost-hover);
}

.agent-session-list__row--active {
  background: var(--fabric-button-ghost-active);
}

.agent-session-list__select {
  display: grid;
  width: 100%;
  height: auto;
  justify-content: stretch;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  padding: 9px 34px 9px 10px;
  text-align: left;
}

.agent-session-list__select :deep(.base-button__label) {
  display: grid;
  width: 100%;
  min-width: 0;
  justify-items: start;
}

.agent-session-list__title {
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: 12px;
  font-weight: var(--fabric-font-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.agent-session-list__more {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: var(--fabric-radius-full);
  color: var(--fabric-text-muted);
  transform: translateY(-50%);
}

.agent-session-list__more:hover {
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-text-primary);
}

.agent-session-list__menu {
  position: fixed;
  z-index: 2147483400;
  width: 136px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-surface);
  padding: var(--fabric-space-1);
  box-shadow: var(--fabric-shadow-lg);
}

.agent-session-group-enter-active,
.agent-session-group-leave-active,
.agent-session-menu-enter-active,
.agent-session-menu-leave-active,
.agent-session-row-enter-active,
.agent-session-row-leave-active {
  transition:
    opacity var(--fabric-duration-base) var(--fabric-ease-standard),
    transform var(--fabric-duration-base) var(--fabric-ease-standard);
}

.agent-session-group-enter-from,
.agent-session-group-leave-to,
.agent-session-menu-enter-from,
.agent-session-menu-leave-to,
.agent-session-row-enter-from,
.agent-session-row-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.agent-session-row-move {
  transition: transform var(--fabric-duration-base) var(--fabric-ease-standard);
}
</style>

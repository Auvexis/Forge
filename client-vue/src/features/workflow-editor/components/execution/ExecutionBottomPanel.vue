<template>
  <div class="ebp">
    <div class="ebp-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="ebp-tab"
        :class="{ 'ebp-tab--active': tab.id === activeTabId }"
        @click="activeTabId = tab.id"
      >
        <LucideIcon :name="tab.icon" :size="13" />
        <span>{{ tab.label }}</span>
        <small>{{ tab.events.length }}</small>
      </button>
    </div>

    <div class="ebp-body">
      <div v-if="activeEvents.length === 0" class="ebp-empty">
        <LucideIcon name="activity" :size="18" />
        <span>No live events yet.</span>
      </div>
      <div v-else class="ebp-timeline">
        <div
          v-for="item in activeEvents"
          :key="item.id"
          class="ebp-event"
          :class="`ebp-event--${item.status}`"
        >
          <span class="ebp-dot" />
          <div class="ebp-copy">
            <span>{{ item.label }}</span>
            <small>{{ formatTime(item.timestamp) }}</small>
          </div>
          <code v-if="item.nodeId">{{ item.nodeId }}</code>
          <span v-if="item.error" class="ebp-error">{{ item.error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useExecutionStore } from '../../stores/execution.store'
import type { ExecutionTimelineEvent } from '@/core/types/execution.types'

const executionStore = useExecutionStore()
const activeTabId = ref('all')

const tabs = computed(() => {
  const grouped = new Map<string, ExecutionTimelineEvent[]>()
  grouped.set('all', executionStore.timeline)

  for (const item of executionStore.timeline) {
    const id = item.triggerNodeId ?? item.source ?? 'workflow'
    const events = grouped.get(id) ?? []
    events.push(item)
    grouped.set(id, events)
  }

  return Array.from(grouped.entries()).map(([id, events]) => ({
    id,
    label: id === 'all' ? 'All' : id,
    icon: id === 'all' ? 'list-tree' : 'radio',
    events,
  }))
})

const activeEvents = computed(() => {
  return tabs.value.find((tab) => tab.id === activeTabId.value)?.events ?? []
})

watch(tabs, (next) => {
  if (!next.some((tab) => tab.id === activeTabId.value)) activeTabId.value = 'all'
})

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<style scoped>
.ebp {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--nod8-bg-surface);
}

.ebp-tabs {
  display: flex;
  gap: 1px;
  min-height: 36px;
  border-bottom: 1px solid var(--nod8-border);
  background: var(--nod8-bg-base);
  overflow-x: auto;
}

.ebp-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--nod8-space-2);
  min-width: 120px;
  padding: 0 var(--nod8-space-3);
  border: 0;
  border-right: 1px solid var(--nod8-border);
  color: var(--nod8-text-muted);
  background: transparent;
  cursor: pointer;
}

.ebp-tab--active {
  color: var(--nod8-text-primary);
  background: var(--nod8-bg-surface);
}

.ebp-tab span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: var(--nod8-text-xs);
}

.ebp-tab small {
  font-family: var(--nod8-font-mono);
  font-size: 10px;
}

.ebp-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ebp-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--nod8-space-2);
  height: 100%;
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-sm);
}

.ebp-timeline {
  display: flex;
  flex-direction: column;
}

.ebp-event {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) minmax(120px, auto) minmax(0, auto);
  align-items: center;
  gap: var(--nod8-space-2);
  min-height: 30px;
  padding: 0 var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border-muted);
}

.ebp-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--nod8-text-muted);
}

.ebp-event--running .ebp-dot {
  background: var(--nod8-amber-400);
}

.ebp-event--success .ebp-dot {
  background: var(--nod8-green-400);
}

.ebp-event--failed .ebp-dot {
  background: var(--nod8-red-400);
}

.ebp-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ebp-copy span,
.ebp-error {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ebp-copy span {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-secondary);
}

.ebp-copy small,
.ebp-event code {
  font-family: var(--nod8-font-mono);
  font-size: 10px;
  color: var(--nod8-text-muted);
}

.ebp-error {
  max-width: 320px;
  color: var(--nod8-red-400);
  font-size: 10px;
}
</style>

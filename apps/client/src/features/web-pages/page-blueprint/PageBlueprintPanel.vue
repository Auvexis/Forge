<template>
  <section class="web-page-blueprint">
    <div class="web-page-blueprint__graph">
      <header class="web-page-blueprint__header">
        <div>
          <strong>Page Blueprint</strong>
          <span>{{ graphSummary }}</span>
        </div>
        <BaseButton
          variant="ghost"
          size="sm"
          icon-left="refresh-cw"
          :loading="actionsStore.isLoading"
          @click="actionsStore.loadAvailableActions()"
        >
          Refresh
        </BaseButton>
      </header>

      <div v-if="graph.nodes.length === 0" class="web-page-blueprint__empty">
        <LucideIcon name="workflow" :size="20" />
        <strong>Select an action</strong>
        <span>Choose a workflow trigger in the Logic panel to build a page dataflow.</span>
      </div>
      <div v-else class="web-page-blueprint__surface">
        <svg class="web-page-blueprint__edges" :viewBox="viewBox" aria-hidden="true">
          <path
            v-for="edge in graph.edges"
            :key="edge.id"
            class="web-page-blueprint__edge"
            :d="edgePath(edge.from, edge.to)"
          />
        </svg>
        <article
          v-for="node in graph.nodes"
          :key="node.id"
          class="web-page-blueprint__node"
          :class="`web-page-blueprint__node--${node.kind}`"
          :style="{ transform: `translate(${node.x}px, ${node.y}px)` }"
        >
          <LucideIcon :name="node.icon" :size="15" />
          <span>
            {{ node.label }}
            <small>{{ node.detail }}</small>
          </span>
        </article>
      </div>
    </div>

    <aside class="web-page-blueprint__config">
      <PageDataActionsPanel />
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { usePagesStore } from '../stores/pages.store.ts'
import PageDataActionsPanel from '../data-actions/components/PageDataActionsPanel.vue'
import { usePageActionsStore } from '../data-actions/stores/page-actions.store.ts'
import { buildPageBlueprintGraph } from './pageBlueprintAdapter.ts'

const pagesStore = usePagesStore()
const actionsStore = usePageActionsStore()

const graph = computed(() =>
  buildPageBlueprintGraph({
    selectedAction: actionsStore.selectedAction,
    pageActions: pagesStore.activePage?.pageActions ?? null,
  }),
)
const graphSummary = computed(() =>
  graph.value.nodes.length === 0 ? 'No active graph' : `${graph.value.nodes.length} nodes / ${graph.value.edges.length} links`,
)
const viewBox = '0 0 980 360'

function edgePath(fromId: string, toId: string) {
  const from = graph.value.nodes.find((node) => node.id === fromId)
  const to = graph.value.nodes.find((node) => node.id === toId)
  if (!from || !to) return ''
  const startX = from.x + 168
  const startY = from.y + 25
  const endX = to.x
  const endY = to.y + 25
  const control = Math.max(48, (endX - startX) / 2)
  return `M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX} ${endY}`
}
</script>

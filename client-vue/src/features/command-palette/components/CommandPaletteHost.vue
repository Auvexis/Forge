<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CommandPaletteFooterHints from './CommandPaletteFooterHints.vue'
import CommandPaletteResultList from './CommandPaletteResultList.vue'
import CommandPaletteSearchInput from './CommandPaletteSearchInput.vue'
import { useCommandPaletteStore } from '../stores/commandPalette.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useAppUiStore } from '@/shared/stores/app-ui.store'
import type { CommandDescriptor, CommandExecutionContext } from '../types/command-palette.types'

const route = useRoute()
const palette = useCommandPaletteStore()
const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const appUiStore = useAppUiStore()
const searchInput = ref<{ focus: () => void } | null>(null)

const commandContext = computed<CommandExecutionContext>(() => ({
  routePath: route.path,
  activeWorkflowId: workflowStore.activeWorkflow?.metadata.id,
  activeExecutionId: executionStore.activeExecutionId ?? undefined,
  isUniverseMode: appUiStore.isUniverseMode,
}))

let queryTimer: number | undefined

watch(
  () => palette.query,
  () => {
    if (!palette.isOpen) return
    window.clearTimeout(queryTimer)
    queryTimer = window.setTimeout(() => {
      void palette.refresh()
    }, 120)
  },
)

watch(
  () => palette.isOpen,
  async (open) => {
    if (!open) return
    await nextTick()
    searchInput.value?.focus()
  },
)

function isTextInput(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) return false
  return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'))
}

async function openPalette() {
  await palette.open(commandContext.value)
}

function onGlobalKeydown(event: KeyboardEvent) {
  const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
  if (!isCommandK) return
  if (!palette.isOpen && isTextInput(event.target)) return
  event.preventDefault()
  palette.toggle(commandContext.value)
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    palette.close()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    palette.moveHighlight(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    palette.moveHighlight(-1)
    return
  }
  if (event.key === 'Home') {
    event.preventDefault()
    palette.setHighlight(0)
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    palette.setHighlight(palette.visibleCommands.length - 1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    selectCommand(palette.highlightedCommand)
  }
}

function selectCommand(command: CommandDescriptor | null) {
  if (!command || !command.availability.enabled) return
  palette.remember(command.id)
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="cp-fade">
      <div v-if="palette.isOpen" class="cp-backdrop" @mousedown.self="palette.close">
        <section
          class="cp-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          @keydown="onDialogKeydown"
        >
          <CommandPaletteSearchInput
            ref="searchInput"
            :model-value="palette.query"
            :loading="palette.isLoading"
            @update:model-value="palette.setQuery"
          />
          <CommandPaletteResultList
            :commands="palette.visibleCommands"
            :highlighted-index="palette.highlightedIndex"
            :loading="palette.isLoading"
            :error="palette.error"
            @highlight="palette.setHighlight"
            @select="selectCommand"
          />
          <CommandPaletteFooterHints />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

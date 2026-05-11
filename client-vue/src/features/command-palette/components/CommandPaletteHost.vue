<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommandPaletteFooterHints from './CommandPaletteFooterHints.vue'
import CommandPaletteResultList from './CommandPaletteResultList.vue'
import CommandPaletteSearchInput from './CommandPaletteSearchInput.vue'
import { useCommandPaletteStore } from '../stores/commandPalette.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useAppUiStore } from '@/shared/stores/app-ui.store'
import { useSidebarPanelStore } from '@/shared/stores/sidebar-panel.store'
import { useSettingsStore } from '@/shared/stores/settings.store'
import { useConfirm } from '@/shared/composables/useConfirm'
import { useToast } from '@/shared/composables/useToast'
import ProductionMonitorPanel from '@/features/workflow-editor/components/ui/ProductionMonitorPanel.vue'
import type { CommandDescriptor, CommandExecutionContext } from '../types/command-palette.types'

const route = useRoute()
const router = useRouter()
const palette = useCommandPaletteStore()
const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const appUiStore = useAppUiStore()
const sidebarStore = useSidebarPanelStore()
const settingsStore = useSettingsStore()
const { confirm } = useConfirm()
const toast = useToast()
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

async function selectCommand(command: CommandDescriptor | null) {
  if (!command || !command.availability.enabled) return
  if (palette.isExecuting) return

  if (command.destructive) {
    const ok = await confirm({
      title: command.label,
      message: command.description ?? 'This action needs confirmation.',
      confirmText: 'Run',
      variant: 'danger',
    })
    if (ok !== true) return
  }

  const result = await palette.execute(command)
  if (!result) {
    if (palette.error) toast.error(palette.error, 'Command failed')
    return
  }

  if (result.navigation) {
    if (result.navigation.path === '/settings') {
      settingsStore.open()
    } else if (result.navigation.replace) {
      await router.replace(result.navigation.path)
    } else {
      await router.push(result.navigation.path)
    }
  }

  if (result.uiIntent) applyUiIntent(result.uiIntent)

  if (result.clipboardText) {
    try {
      await navigator.clipboard.writeText(result.clipboardText)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Clipboard write failed')
      return
    }
  } else if (result.message) {
    toast.success(result.message)
  }

  if (result.refreshHints?.length) await palette.refresh()
  palette.close()
}

function applyUiIntent(intent: { type: string; target?: string; payload?: Record<string, unknown> }) {
  const { type } = intent
  if (type === 'settings.open') settingsStore.open()
  if (type === 'production-panel.open') {
    sidebarStore.openPanel({
      title: 'Production Monitor',
      component: ProductionMonitorPanel,
      width: 'md',
    })
  }
  if (type === 'production-panel.close') sidebarStore.closePanel()
  if (type === 'universe.enter') appUiStore.enterUniverseMode()
  if (type === 'universe.exit') appUiStore.quitUniverseMode()
  if (type === 'plugin.open' || type === 'plugin.oauth.open' || type === 'plugin.credentials.open') {
    window.dispatchEvent(new CustomEvent('nod8:command-palette:intent', { detail: intent }))
  }
  if (type === 'workflow-settings.open' || type === 'workflow-logs.open') {
    window.dispatchEvent(new CustomEvent('nod8:command-palette:intent', { detail: intent }))
  }
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

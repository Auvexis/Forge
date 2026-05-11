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
import { useTheme } from '@/shared/composables/useTheme'
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
const { toggle: toggleTheme } = useTheme()
const toast = useToast()
const searchInput = ref<{ focus: () => void } | null>(null)
const drilldownInput = ref<HTMLInputElement | null>(null)
const dialogRef = ref<HTMLElement | null>(null)
const confirmRef = ref<HTMLElement | null>(null)
const drilldownInputValue = ref('')
const confirmingAction = ref<{ command: CommandDescriptor; payload: Record<string, unknown> } | null>(null)

watch(confirmingAction, async (val) => {
  if (val) {
    await nextTick()
    confirmRef.value?.focus()
  } else if (palette.isOpen && !palette.drilldownInput) {
    await nextTick()
    searchInput.value?.focus()
  }
})

const activeDescendant = computed(() => {
  if (palette.isInDrilldown && palette.drilldownInput) return undefined
  if (palette.visibleCommands.length === 0) return undefined
  return `cp-row-${palette.highlightedIndex}`
})

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
    if (!palette.isOpen || palette.isInDrilldown) return
    window.clearTimeout(queryTimer)
    queryTimer = window.setTimeout(() => {
      void palette.refresh()
    }, 120)
  },
)

watch(
  () => palette.isOpen,
  async (open) => {
    if (!open) {
      confirmingAction.value = null
      return
    }
    await nextTick()
    searchInput.value?.focus()
  },
)

// When entering a drilldown input, focus the text field
watch(
  () => palette.drilldownInput,
  async (input) => {
    if (!input) return
    drilldownInputValue.value = ''
    await nextTick()
    drilldownInput.value?.focus()
  },
)

// Scroll active row into view on highlight change
watch(
  () => palette.highlightedIndex,
  async (index) => {
    await nextTick()
    const el = document.getElementById(`cp-row-${index}`)
    el?.scrollIntoView({ block: 'nearest' })
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
    if (confirmingAction.value) {
      confirmingAction.value = null
    } else if (palette.isInDrilldown) {
      palette.exitDrilldown()
    } else {
      palette.close()
    }
    return
  }
  if (event.key === 'Tab') {
    // Focus trap: keep focus inside the dialog
    event.preventDefault()
    return
  }

  if (confirmingAction.value) {
    if (event.key === 'Enter') {
      event.preventDefault()
      const action = confirmingAction.value
      confirmingAction.value = null
      void handleExecuteResult(action.command, action.payload, true)
    }
    return // Prevent arrow navigation while confirming
  }

  // Arrow navigation only in list mode (not in drilldown input)
  if (!palette.drilldownInput) {
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
}

async function commitDrilldownInput() {
  const input = palette.drilldownInput
  if (!input || !drilldownInputValue.value.trim()) return

  const payload = { [input.payloadKey]: drilldownInputValue.value.trim() }
  const fakeCommand: CommandDescriptor = {
    id: input.targetCommandId,
    group: 'workflow',
    label: input.title,
    availability: { enabled: true },
  }
  await handleExecuteResult(fakeCommand, payload)
}

async function selectCommand(command: CommandDescriptor | null) {
  if (!command || !command.availability.enabled) return
  if (palette.isExecuting) return
  await handleExecuteResult(command, {})
}

async function handleExecuteResult(
  command: CommandDescriptor,
  extraPayload: Record<string, unknown>,
  skipConfirm = false,
) {
  if (command.destructive && !skipConfirm) {
    confirmingAction.value = { command, payload: extraPayload }
    return
  }

  confirmingAction.value = null

  // When in drilldown list mode, map the picked command id to its parent's ".picked" variant
  const isPickCommand = palette.isInDrilldown && palette.drilldownList && command.id.startsWith('_pick.')
  let targetCommand = command
  let targetPayload = extraPayload

  if (isPickCommand) {
    const workflowId = command.id.slice('_pick.'.length)
    // Find the parent command's ".picked" equivalent
    const parentTitle = palette.drilldownTitle ?? ''
    const pickedCommandId = resolvePrimaryPickedCommandId(parentTitle)
    if (!pickedCommandId) {
      toast.error('Unknown drilldown action')
      return
    }
    targetCommand = {
      id: pickedCommandId,
      group: 'workflow',
      label: command.label,
      availability: { enabled: true },
    }
    targetPayload = { workflowId }
  }

  const result = await palette.execute(targetCommand, targetPayload)

  if (!result) {
    if (palette.error) toast.error(palette.error, 'Command failed')
    return
  }

  // Drilldown result — palette stays open, store already updated
  if (result.drilldown) return

  // Normal result handling
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

  if (result.refreshHints?.some((h) => !h.startsWith('_drilldown_ctx:'))) {
    await palette.refresh()
  }
  palette.close()
}

/** Maps a drilldown title to the ".picked" command id */
function resolvePrimaryPickedCommandId(title: string): string | null {
  const map: Record<string, string> = {
    'Open Workflow': 'workflow.open.picked',
    'Delete Workflow': 'workflow.delete.picked',
    'Rename Workflow': 'workflow.rename.picked',
    'Publish Workflow': 'workflow.publish.picked',
    'Unpublish Workflow': 'workflow.unpublish.picked',
    'Export Workflow': 'workflow.export.picked',
    'Open Workflow Logs': 'workflow.logs.open.picked',
    'Run Workflow': 'workflow.run.picked',
  }
  return map[title] ?? null
}

function applyUiIntent(intent: { type: string; target?: string; payload?: Record<string, unknown> }) {
  const { type } = intent
  if (type === 'theme.toggle') {
    toggleTheme()
    return
  }
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
  if (type === 'plugin.open') {
    // Navigate to Universe and dispatch event for the Universe to focus the plugin
    window.dispatchEvent(new CustomEvent('nod8:command-palette:intent', { detail: intent }))
  }
  if (type === 'plugin.oauth.open' || type === 'plugin.credentials.open') {
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
          ref="dialogRef"
          class="cp-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cp-dialog-title"
          @keydown="onDialogKeydown"
        >
          <span id="cp-dialog-title" class="sr-only">Command palette</span>

          <!-- Drilldown breadcrumb header -->
          <div v-if="palette.isInDrilldown" class="cp-breadcrumb">
            <button class="cp-breadcrumb__back" type="button" @click="palette.exitDrilldown">
              ← Back
            </button>
            <span class="cp-breadcrumb__title">{{ palette.drilldownTitle }}</span>
          </div>

          <!-- Confirm step -->
          <div v-if="confirmingAction" ref="confirmRef" class="cp-confirm" tabindex="-1" style="outline: none;">
            <div class="cp-confirm__title">Confirm Action</div>
            <div class="cp-confirm__message">
              You are about to execute <strong>{{ confirmingAction.command.label }}</strong>.<br />
              <span class="cp-confirm__description">{{ confirmingAction.command.description ?? 'This action cannot be undone.' }}</span>
            </div>
          </div>

          <!-- Drilldown input step -->
          <div v-else-if="palette.drilldownInput" class="cp-drilldown-input">
            <input
              ref="drilldownInput"
              class="cp-search__input cp-drilldown-input__field"
              v-model="drilldownInputValue"
              type="text"
              :placeholder="palette.drilldownInput.placeholder"
              aria-label="Input for command"
              @keydown.enter.prevent="commitDrilldownInput"
            />
          </div>

          <!-- Normal search and Result list -->
          <template v-else>
            <CommandPaletteSearchInput
              ref="searchInput"
              :model-value="palette.query"
              :loading="palette.isLoading"
              :active-descendant="activeDescendant"
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
          </template>

          <CommandPaletteFooterHints :in-drilldown-input="!!palette.drilldownInput" :in-confirm="!!confirmingAction" />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

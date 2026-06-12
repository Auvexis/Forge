import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { commandPaletteApi } from '@/core/api/command-palette.api'
import type {
  CommandDescriptor,
  CommandDrilldown,
  CommandDrilldownInput,
  CommandDrilldownList,
  CommandExecutionContext,
  CommandExecutionResult,
} from '../types/command-palette.types'

const RECENT_LIMIT = 8

export const useCommandPaletteStore = defineStore('command-palette', () => {
  // ── Root state ──────────────────────────────────────────────────────────────
  const isOpen = ref(false)
  const query = ref('')
  const highlightedIndex = ref(0)
  const isLoading = ref(false)
  const isExecuting = ref(false)
  const error = ref<string | null>(null)
  const commands = ref<CommandDescriptor[]>([])
  const recentCommandIds = ref<string[]>([])
  const lastResult = ref<CommandExecutionResult | null>(null)
  const context = ref<CommandExecutionContext>({})

  // ── Drilldown state ─────────────────────────────────────────────────────────
  /** Active drilldown when a command returns one. null = root level. */
  const drilldown = ref<CommandDrilldown | null>(null)
  /** Extra payload to merge into the next execute call (used for multi-step rename, etc.) */
  const drilldownContext = ref<Record<string, unknown>>({})

  // ── Computed ────────────────────────────────────────────────────────────────

  const isInDrilldown = computed(() => drilldown.value !== null)

  const drilldownList = computed(() =>
    drilldown.value?.type === 'list' ? (drilldown.value as CommandDrilldownList) : null,
  )

  const drilldownInput = computed(() =>
    drilldown.value?.type === 'input' ? (drilldown.value as CommandDrilldownInput) : null,
  )

  const visibleCommands = computed(() => {
    if (drilldownList.value) return drilldownList.value.commands
    return commands.value.filter((c) => c.availability.hidden !== true)
  })

  const highlightedCommand = computed(() => visibleCommands.value[highlightedIndex.value] ?? null)

  const drilldownTitle = computed(() => drilldown.value?.title ?? null)

  // ── Basic state mutations ───────────────────────────────────────────────────

  function setContext(next: CommandExecutionContext) {
    context.value = next
  }

  function setCommands(next: CommandDescriptor[]) {
    commands.value = next
    clampHighlight()
  }

  function setQuery(next: string) {
    query.value = next
    highlightedIndex.value = 0
  }

  function clampHighlight() {
    const last = Math.max(visibleCommands.value.length - 1, 0)
    highlightedIndex.value = Math.min(Math.max(highlightedIndex.value, 0), last)
  }

  function moveHighlight(delta: number) {
    const count = visibleCommands.value.length
    if (count === 0) return
    highlightedIndex.value = (highlightedIndex.value + delta + count) % count
  }

  function setHighlight(index: number) {
    highlightedIndex.value = index
    clampHighlight()
  }

  function remember(commandId: string) {
    recentCommandIds.value = [
      commandId,
      ...recentCommandIds.value.filter((id) => id !== commandId),
    ].slice(0, RECENT_LIMIT)
  }

  // ── Drilldown management ────────────────────────────────────────────────────

  function enterDrilldown(next: CommandDrilldown, extraCtx: Record<string, unknown> = {}) {
    drilldown.value = next
    drilldownContext.value = extraCtx
    query.value = ''
    highlightedIndex.value = 0
    error.value = null
  }

  function exitDrilldown() {
    drilldown.value = null
    drilldownContext.value = {}
    query.value = ''
    highlightedIndex.value = 0
    error.value = null
  }

  // ── API calls ───────────────────────────────────────────────────────────────

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      setCommands(
        query.value.trim()
          ? await commandPaletteApi.search(query.value, context.value)
          : await commandPaletteApi.list(context.value),
      )
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load commands'
      commands.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function execute(command: CommandDescriptor, payload: Record<string, unknown> = {}) {
    if (isExecuting.value || !command.availability.enabled) return null

    isExecuting.value = true
    error.value = null
    try {
      const mergedPayload = { ...drilldownContext.value, ...payload }
      const result = await commandPaletteApi.execute(command.id, mergedPayload, context.value)
      lastResult.value = result
      remember(command.id)

      // Handle drilldown result — palette stays open
      if (result.drilldown) {
        // Extract any _drilldown_ctx hints from refreshHints
        const extraCtx: Record<string, unknown> = {}
        for (const hint of result.refreshHints ?? []) {
          if (hint.startsWith('_drilldown_ctx:')) {
            const [k, v] = hint.slice('_drilldown_ctx:'.length).split('=')
            if (k) extraCtx[k] = v
          }
        }
        enterDrilldown(result.drilldown, extraCtx)
        return result
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to execute command'
      return null
    } finally {
      isExecuting.value = false
    }
  }

  async function open(nextContext: CommandExecutionContext = context.value) {
    isOpen.value = true
    setContext(nextContext)
    await refresh()
  }

  function close() {
    isOpen.value = false
    query.value = ''
    highlightedIndex.value = 0
    error.value = null
    drilldown.value = null
    drilldownContext.value = {}
  }

  function toggle(nextContext: CommandExecutionContext = context.value) {
    if (isOpen.value) close()
    else void open(nextContext)
  }

  return {
    // state
    isOpen,
    query,
    highlightedIndex,
    isLoading,
    isExecuting,
    error,
    commands,
    visibleCommands,
    highlightedCommand,
    recentCommandIds,
    lastResult,
    context,
    drilldown,
    drilldownContext,
    drilldownTitle,
    isInDrilldown,
    drilldownList,
    drilldownInput,
    // actions
    setContext,
    setCommands,
    setQuery,
    moveHighlight,
    setHighlight,
    remember,
    execute,
    refresh,
    open,
    close,
    toggle,
    enterDrilldown,
    exitDrilldown,
  }
})

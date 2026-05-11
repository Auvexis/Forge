import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { commandPaletteApi } from '@/core/api/command-palette.api'
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandExecutionResult,
} from '../types/command-palette.types'

const RECENT_LIMIT = 8

export const useCommandPaletteStore = defineStore('command-palette', () => {
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

  const visibleCommands = computed(() =>
    commands.value.filter((command) => command.availability.hidden !== true),
  )

  const highlightedCommand = computed(() => visibleCommands.value[highlightedIndex.value] ?? null)

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

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      setCommands(query.value.trim()
        ? await commandPaletteApi.search(query.value, context.value)
        : await commandPaletteApi.list(context.value))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load commands'
      commands.value = []
    } finally {
      isLoading.value = false
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
  }

  function toggle(nextContext: CommandExecutionContext = context.value) {
    if (isOpen.value) close()
    else void open(nextContext)
  }

  return {
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
    setContext,
    setCommands,
    setQuery,
    moveHighlight,
    setHighlight,
    remember,
    refresh,
    open,
    close,
    toggle,
  }
})

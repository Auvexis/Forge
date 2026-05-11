import type {
  CommandDescriptor,
  CommandExecutionResult,
} from './types/command-palette.types'
import { commandPaletteApi } from '@/core/api/command-palette.api'
import { useCommandPaletteStore } from './stores/commandPalette.store'

async function contract(command: CommandDescriptor) {
  const commands = await commandPaletteApi.list({
    routePath: '/workflows',
    activeWorkflowId: 'wf_1',
    isUniverseMode: false,
  })
  const result: CommandExecutionResult = await commandPaletteApi.execute(command.id, {}, {})
  const store = useCommandPaletteStore()

  store.open()
  store.setQuery(command.label)
  store.setCommands(commands)

  return result.ok
}

void contract({
  id: 'nav.workflows',
  group: 'navigation',
  label: 'Workflows',
  availability: { enabled: true },
})

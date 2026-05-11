<script setup lang="ts">
import CommandPaletteGroupLabel from './CommandPaletteGroupLabel.vue'
import CommandPaletteResultRow from './CommandPaletteResultRow.vue'
import type { CommandDescriptor } from '../types/command-palette.types'

defineProps<{
  commands: CommandDescriptor[]
  highlightedIndex: number
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  select: [command: CommandDescriptor]
  highlight: [index: number]
}>()
</script>

<template>
  <div id="cp-result-listbox" class="cp-results" role="listbox" aria-label="Command results">
    <div v-if="error" class="cp-empty cp-empty--error" role="alert">{{ error }}</div>
    <div v-else-if="loading" class="cp-empty" aria-live="polite">Loading commands</div>
    <div v-else-if="commands.length === 0" class="cp-empty" aria-live="polite">No commands found</div>
    <template v-else>
      <template v-for="(command, index) in commands" :key="command.id">
        <CommandPaletteGroupLabel
          v-if="index === 0 || commands[index - 1]?.group !== command.group"
          :group="command.group"
        />
        <CommandPaletteResultRow
          :command="command"
          :active="index === highlightedIndex"
          :index="index"
          :total="commands.length"
          @mouseenter="emit('highlight', index)"
          @select="emit('select', command)"
        />
      </template>
    </template>
  </div>
</template>

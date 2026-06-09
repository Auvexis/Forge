<script setup lang="ts">
import { computed } from 'vue'
import CommandPaletteGroupLabel from './CommandPaletteGroupLabel.vue'
import CommandPaletteResultRow from './CommandPaletteResultRow.vue'
import type { CommandDescriptor, CommandGroup } from '../types/command-palette.types'

const props = defineProps<{
  commands: CommandDescriptor[]
  highlightedIndex: number
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  select: [command: CommandDescriptor]
  highlight: [index: number]
}>()

const commandGroups = computed(() => {
  const groups: Array<{ group: CommandGroup; commands: CommandDescriptor[]; startIndex: number }> = []

  props.commands.forEach((command, index) => {
    const current = groups[groups.length - 1]
    if (current?.group === command.group) {
      current.commands.push(command)
      return
    }

    groups.push({
      group: command.group,
      commands: [command],
      startIndex: index,
    })
  })

  return groups
})
</script>

<template>
  <div
    id="cp-result-listbox"
    class="cp-results"
    role="listbox"
    aria-label="Command results"
  >
    <div v-if="error" class="cp-empty cp-empty--error" role="alert">{{ error }}</div>
    <div v-else-if="loading" class="cp-empty" aria-live="polite">Loading commands</div>
    <div v-else-if="commands.length === 0" class="cp-empty" aria-live="polite">No commands found</div>
    <template v-else>
      <section v-for="group in commandGroups" :key="group.group" class="cp-result-group">
        <CommandPaletteGroupLabel :group="group.group" />
        <div
          class="cp-result-group__rows"
        >
          <CommandPaletteResultRow
            v-for="(command, offset) in group.commands"
            :key="command.id"
            :command="command"
            :active="group.startIndex + offset === highlightedIndex"
            :index="group.startIndex + offset"
            :total="commands.length"
            @mouseenter="emit('highlight', group.startIndex + offset)"
            @select="emit('select', command)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

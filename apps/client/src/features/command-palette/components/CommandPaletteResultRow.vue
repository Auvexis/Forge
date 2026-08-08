<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/shared/composables/useTheme'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import type { CommandDescriptor } from '../types/command-palette.types'

const props = defineProps<{
  command: CommandDescriptor
  active: boolean
  index: number
  total: number
}>()

const emit = defineEmits<{
  select: []
}>()

const { iconVariant } = useTheme()
const commandIcon = computed(() =>
  resolvePluginIcon(props.command, { iconVariant: iconVariant.value, fallback: 'command' }),
)
</script>

<template>
  <button
    :id="`cp-row-${index}`"
    class="cp-row"
    :class="{ 'cp-row--active': active, 'cp-row--disabled': !command.availability.enabled }"
    type="button"
    role="option"
    :aria-selected="active"
    :aria-posinset="index + 1"
    :aria-setsize="total"
    :disabled="!command.availability.enabled"
    @click="emit('select')"
  >
    <span class="cp-row__icon">
      <LucideIcon :name="commandIcon" :size="16" />
    </span>
    <span class="cp-row__main">
      <span class="cp-row__title">
        {{ command.label }}
        <span v-if="command.destructive" class="cp-row__badge">Destructive</span>
      </span>
      <span class="cp-row__description">
        {{ command.availability.enabled ? command.description : command.availability.reason }}
      </span>
    </span>
  </button>
</template>

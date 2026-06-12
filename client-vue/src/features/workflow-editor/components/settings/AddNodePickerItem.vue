<template>
  <button
    class="add-node-picker-item"
    :class="{ 'add-node-picker-item--active': active }"
    type="button"
  >
    <span
      class="add-node-picker-item__icon"
      :style="styleMeta ? {
        '--node-icon-bg': styleMeta.bgColor,
        '--node-icon-border': styleMeta.borderColor,
        '--node-icon-color': styleMeta.iconColor,
      } : undefined"
    >
      <LucideIcon
        :name="icon"
        :size="16"
        :color="styleMeta?.iconColor"
      />
    </span>
    <span class="add-node-picker-item__body">
      <span class="add-node-picker-item__label">{{ label }}</span>
      <span class="add-node-picker-item__description">{{ description }}</span>
    </span>
    <code v-if="count !== undefined" class="add-node-picker-item__count">{{ count }}</code>
    <LucideIcon v-if="chevron" name="chevron-right" :size="14" class="add-node-picker-item__chevron" />
  </button>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { WorkflowNodeStyle } from '@/core/types/workflow-node-catalog.types'

defineProps<{
  label: string
  description: string
  icon: string
  styleMeta?: WorkflowNodeStyle
  active?: boolean
  chevron?: boolean
  count?: number
}>()
</script>

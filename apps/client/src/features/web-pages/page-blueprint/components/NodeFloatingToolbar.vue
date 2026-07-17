<template>
  <div
    class="web-page-blueprint-node-toolbar"
    :class="{ 'web-page-blueprint-node-toolbar--selected': selected }"
    data-base-canvas-no-drag
  >
    <button type="button" title="Duplicate node" @click.stop="$emit('duplicate')">
      <LucideIcon name="copy" :size="13" />
    </button>
    <button type="button" title="Delete node" @click.stop="$emit('remove')">
      <LucideIcon name="trash-2" :size="13" />
    </button>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  selected?: boolean
}>(), {
  selected: false,
})

defineEmits<{
  duplicate: []
  remove: []
}>()
</script>

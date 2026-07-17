<template>
  <button
    data-base-canvas-no-drag
    :data-blueprint-port-node-id="nodeId"
    :data-blueprint-port-field-id="fieldId"
    :data-blueprint-port-side="side"
    class="web-page-blueprint-pick-whip"
    :class="{
      'web-page-blueprint-pick-whip--connected': connected,
      'web-page-blueprint-pick-whip--disconnectable': connected && disconnectable,
    }"
    type="button"
    :title="title"
    @pointerdown.stop.prevent="emitPick"
    @pointerup.stop.prevent="emitRelease"
  >
    <LucideIcon :name="resolvedIcon" :size="11" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  nodeId?: string
  fieldId?: string
  side?: 'input' | 'output'
  connected?: boolean
  disconnectable?: boolean
}>(), {
  title: 'Pick whip',
  icon: '',
  nodeId: '',
  fieldId: '',
  side: 'input',
  connected: false,
  disconnectable: false,
})

const emit = defineEmits<{
  pick: [event: PointerEvent]
  release: [event: PointerEvent]
}>()

const resolvedIcon = computed(() => {
  if (props.connected && props.disconnectable) return 'unlink'
  if (props.connected) return 'link-2'
  return props.icon || 'unlink-2'
})

function emitPick(event: PointerEvent) {
  emit('pick', event)
}

function emitRelease(event: PointerEvent) {
  emit('release', event)
}
</script>

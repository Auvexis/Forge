<template>
  <div class="web-page-event-returns">
    <div class="web-page-events-subheader">
      <LucideIcon name="log-out" :size="12" />
      <strong>Returns</strong>
    </div>
    <p v-if="returns.length === 0" class="web-page-event-empty">This workflow has no declared Return fields.</p>
    <PageReturnBindingRow
      v-for="field in returns"
      :key="field.key"
      :field="field"
      :output-bindings="outputBindings.filter((binding) => binding.resultPath === field.key)"
      :collection-bindings="collectionBindings.filter((binding) => binding.collectionPath === field.key)"
      @bind-output="bindOutput"
      @bind-collection="bindCollection"
      @clear-output="$emit('clearOutput', $event)"
      @clear-collection="$emit('clearCollection', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  PageActionCollectionBinding,
  PageActionOutputBinding,
  PageActionReturnField,
} from '@/core/page-actions'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import PageReturnBindingRow from './PageReturnBindingRow.vue'

defineProps<{
  returns: PageActionReturnField[]
  outputBindings: PageActionOutputBinding[]
  collectionBindings: PageActionCollectionBinding[]
}>()

const emit = defineEmits<{
  bindOutput: [resultPath: string, origin: { x: number; y: number }, event: PointerEvent]
  bindCollection: [collectionPath: string, origin: { x: number; y: number }, event: PointerEvent]
  clearOutput: [bindingId: string]
  clearCollection: [bindingId: string]
}>()

function bindOutput(resultPath: string, origin: { x: number; y: number }, event: PointerEvent) {
  emit('bindOutput', resultPath, origin, event)
}

function bindCollection(collectionPath: string, origin: { x: number; y: number }, event: PointerEvent) {
  emit('bindCollection', collectionPath, origin, event)
}
</script>

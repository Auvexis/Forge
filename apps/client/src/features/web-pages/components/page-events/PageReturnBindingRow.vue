<template>
  <div class="web-page-return-binding-row">
    <div class="web-page-return-binding-row__field">
      <strong>{{ field.label }}</strong>
      <span>{{ field.key }} - {{ field.type }}</span>
    </div>

    <PageBindingModeToggle :model-value="mode" @update:model-value="mode = $event" />

    <PagePickWhipButton
      :title="mode === 'multiple' ? 'Bind list to repeated element' : 'Bind return to element field'"
      @start="startBinding"
    />

    <div class="web-page-return-binding-row__targets">
      <PageElementTargetChip
        v-for="binding in outputBindings"
        :key="binding.id"
        :label="`${binding.target.label} - ${binding.target.property}`"
        icon="arrow-right"
        @clear="$emit('clearOutput', binding.id)"
      />
      <PageElementTargetChip
        v-for="binding in collectionBindings"
        :key="binding.id"
        :label="`${binding.targetElementId} - list`"
        icon="list"
        @clear="$emit('clearCollection', binding.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type {
  PageActionCollectionBinding,
  PageActionOutputBinding,
  PageActionReturnField,
} from '@/core/page-actions'
import PageBindingModeToggle from './PageBindingModeToggle.vue'
import PageElementTargetChip from './PageElementTargetChip.vue'
import PagePickWhipButton from './PagePickWhipButton.vue'

const props = defineProps<{
  field: PageActionReturnField
  outputBindings: PageActionOutputBinding[]
  collectionBindings: PageActionCollectionBinding[]
}>()

const emit = defineEmits<{
  bindOutput: [resultPath: string, origin: { x: number; y: number }, event: PointerEvent]
  bindCollection: [collectionPath: string, origin: { x: number; y: number }, event: PointerEvent]
  clearOutput: [bindingId: string]
  clearCollection: [bindingId: string]
}>()

const mode = ref<'single' | 'multiple'>('single')

function startBinding(origin: { x: number; y: number }, event: PointerEvent) {
  if (mode.value === 'multiple') emit('bindCollection', props.field.key, origin, event)
  else emit('bindOutput', props.field.key, origin, event)
}
</script>

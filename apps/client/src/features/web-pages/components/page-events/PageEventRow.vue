<template>
  <article class="web-page-event-row">
    <header class="web-page-event-row__header">
      <div>
        <LucideIcon name="zap" :size="13" />
        <strong>{{ title }}</strong>
      </div>
      <BaseButton size="icon" variant="ghost" title="Remove event" @click="$emit('remove')">
        <LucideIcon name="trash-2" :size="13" />
      </BaseButton>
    </header>

    <div class="web-page-event-grid">
      <label>
        <span>Event</span>
        <PageEventTriggerSelect
          :model-value="event.event"
          :options="eventOptions"
          @update:model-value="$emit('updateEventName', $event)"
        />
      </label>
      <label>
        <span>Workflow</span>
        <PageWorkflowSelect
          :model-value="event.workflowId"
          :workflows="workflows"
          @update:model-value="$emit('updateWorkflow', $event)"
        />
      </label>
      <label>
        <span>Trigger</span>
        <PageWorkflowTriggerSelect
          :model-value="event.triggerId"
          :triggers="triggers"
          @update:model-value="$emit('updateTrigger', $event)"
        />
      </label>
    </div>

    <PageActionInputBindings
      v-if="action"
      :inputs="action.inputs"
      :bindings="inputBindings"
      @clear-input="$emit('clearInput', $event)"
    />

    <PageActionReturnBindings
      v-if="action"
      :returns="action.returns"
      :output-bindings="outputBindings"
      :collection-bindings="collectionBindings"
      @bind-output="bindOutput"
      @bind-collection="bindCollection"
      @clear-output="$emit('clearOutput', $event)"
      @clear-collection="$emit('clearCollection', $event)"
    />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  PageActionCollectionBinding,
  PageActionDefinition,
  PageActionInputBinding,
  PageActionOutputBinding,
  PageActionTriggerSummary,
  PageActionWorkflowSummary,
} from '@/core/page-actions'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageElementEvent } from '../../types/page.types.ts'
import type { PageElementEventOption } from '../../page-events/pageElementEvents.types.ts'
import { eventLabel } from '../../page-events/pageElementEvents.ts'
import PageActionInputBindings from './PageActionInputBindings.vue'
import PageActionReturnBindings from './PageActionReturnBindings.vue'
import PageEventTriggerSelect from './PageEventTriggerSelect.vue'
import PageWorkflowSelect from './PageWorkflowSelect.vue'
import PageWorkflowTriggerSelect from './PageWorkflowTriggerSelect.vue'

const props = defineProps<{
  event: PageElementEvent
  eventOptions: PageElementEventOption[]
  workflows: PageActionWorkflowSummary[]
  triggers: PageActionTriggerSummary[]
  action: PageActionDefinition | null
  inputBindings: Record<string, PageActionInputBinding>
  outputBindings: PageActionOutputBinding[]
  collectionBindings: PageActionCollectionBinding[]
}>()

const emit = defineEmits<{
  updateEventName: [eventName: PageElementEvent['event']]
  updateWorkflow: [workflowId: string]
  updateTrigger: [triggerId: string]
  bindOutput: [resultPath: string, origin: { x: number; y: number }, event: PointerEvent]
  bindCollection: [collectionPath: string, origin: { x: number; y: number }, event: PointerEvent]
  clearInput: [inputKey: string]
  clearOutput: [bindingId: string]
  clearCollection: [bindingId: string]
  remove: []
}>()

const title = computed(() => `${eventLabel(props.event.event)} -> ${props.action?.workflowName ?? 'Workflow'}`)

function bindOutput(resultPath: string, origin: { x: number; y: number }, event: PointerEvent) {
  emit('bindOutput', resultPath, origin, event)
}

function bindCollection(collectionPath: string, origin: { x: number; y: number }, event: PointerEvent) {
  emit('bindCollection', collectionPath, origin, event)
}
</script>

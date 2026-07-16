<template>
  <PageEventSection title="Events" icon="zap">
    <template #actions>
      <BaseButton size="sm" variant="ghost" icon-left="plus" :disabled="!firstTrigger" @click="addEvent">
        Add
      </BaseButton>
    </template>

    <p v-if="!actionsStore.hasActions && !actionsStore.isLoading" class="web-page-event-empty">
      Publish a workflow with a callable trigger to connect events.
    </p>

    <div v-else class="web-page-events-list">
      <PageEventRow
        v-for="(event, index) in events"
        :key="event.id"
        :event="event"
        :event-options="eventOptions"
        :workflows="actionsStore.workflows"
        :triggers="triggersForWorkflow(event.workflowId)"
        :action="actionForEvent(event)"
        :input-bindings="bindingStore.bindingsForAction(event.actionId)"
        :output-bindings="bindingStore.outputBindingsForAction(event.actionId)"
        :collection-bindings="bindingStore.collectionBindingsForAction(event.actionId)"
        @update-event-name="updateEventName(index, $event)"
        @update-workflow="updateWorkflow(index, $event)"
        @update-trigger="updateTrigger(index, $event)"
        @bind-output="(resultPath, origin, pointerEvent) => startOutputPickWhip(event, resultPath, origin, pointerEvent)"
        @bind-collection="(collectionPath, origin, pointerEvent) => startCollectionPickWhip(event, collectionPath, origin, pointerEvent)"
        @clear-input="bindingStore.clearInputBinding(event.actionId, $event)"
        @clear-output="bindingStore.clearOutputBinding(event.actionId, $event)"
        @clear-collection="bindingStore.clearCollectionBinding(event.actionId, $event)"
        @remove="removeEvent(index)"
      />
      <p v-if="events.length === 0" class="web-page-event-empty">No events configured for this element.</p>
    </div>
  </PageEventSection>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  createPageActionDefinition,
  type PageActionDefinition,
  type PageActionTriggerSummary,
} from '@/core/page-actions'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { PageBlock, PageElementEvent, PageElementEventName } from '../../types/page.types.ts'
import { usePageActionsStore } from '../../data-actions/stores/page-actions.store.ts'
import { usePageActionBindingsStore } from '../../data-actions/stores/page-action-bindings.store.ts'
import {
  readPageActionBindingTargetAtPoint,
  readPageActionElementTargetAtPoint,
} from '../../data-actions/utils/bindingTargetDom.ts'
import {
  createElementEvent,
  eventOptionsForBlock,
} from '../../page-events/pageElementEvents.ts'
import PageEventRow from './PageEventRow.vue'
import PageEventSection from './PageEventSection.vue'

const props = defineProps<{
  block: PageBlock
}>()

const emit = defineEmits<{
  patch: [patch: Partial<PageBlock>]
}>()

const actionsStore = usePageActionsStore()
const bindingStore = usePageActionBindingsStore()

const events = computed(() => props.block.events ?? [])
const eventOptions = computed(() => eventOptionsForBlock(props.block))
const firstTrigger = computed(() => actionsStore.workflows.flatMap((workflow) => workflow.actions)[0] ?? null)

onMounted(() => {
  void actionsStore.loadAvailableActions()
})

function addEvent() {
  const trigger = firstTrigger.value
  const eventName = eventOptions.value[0]?.value
  if (!trigger || !eventName) return
  patchEvents([...events.value, createElementEvent(eventName, trigger)])
}

function removeEvent(index: number) {
  patchEvents(events.value.filter((_, currentIndex) => currentIndex !== index))
}

function updateEventName(index: number, eventName: PageElementEventName) {
  const event = events.value[index]
  const trigger = triggerForEvent(event)
  if (!event || !trigger) return
  replaceEvent(index, createElementEvent(eventName, trigger))
}

function updateWorkflow(index: number, workflowId: string) {
  const trigger = triggersForWorkflow(workflowId)[0]
  const event = events.value[index]
  if (!event || !trigger) return
  replaceEvent(index, createElementEvent(event.event, trigger))
}

function updateTrigger(index: number, triggerId: string) {
  const event = events.value[index]
  if (!event) return
  const trigger = triggersForWorkflow(event.workflowId).find((candidate) => candidate.id === triggerId)
  if (!trigger) return
  replaceEvent(index, createElementEvent(event.event, trigger))
}

function replaceEvent(index: number, event: PageElementEvent) {
  patchEvents(events.value.map((candidate, currentIndex) => (currentIndex === index ? event : candidate)))
}

function patchEvents(nextEvents: PageElementEvent[]) {
  emit('patch', { events: nextEvents })
}

function triggersForWorkflow(workflowId: string) {
  return actionsStore.workflows.find((workflow) => workflow.id === workflowId)?.actions ?? []
}

function triggerForEvent(event: PageElementEvent | undefined): PageActionTriggerSummary | null {
  if (!event) return null
  return triggersForWorkflow(event.workflowId).find((trigger) => trigger.id === event.triggerId) ?? null
}

function actionForEvent(event: PageElementEvent): PageActionDefinition | null {
  const trigger = triggerForEvent(event)
  return trigger ? createPageActionDefinition(trigger) : null
}

function startOutputPickWhip(
  event: PageElementEvent,
  resultPath: string,
  origin: { x: number; y: number },
  pointerEvent: PointerEvent,
) {
  const action = actionForEvent(event)
  if (!action) return
  bindingStore.startOutputPickWhip(action, resultPath, origin)
  trackPickWhip(pointerEvent, readPageActionBindingTargetAtPoint)
}

function startCollectionPickWhip(
  event: PageElementEvent,
  collectionPath: string,
  origin: { x: number; y: number },
  pointerEvent: PointerEvent,
) {
  const action = actionForEvent(event)
  if (!action) return
  bindingStore.startCollectionPickWhip(action, collectionPath, origin)
  trackPickWhip(pointerEvent, readPageActionElementTargetAtPoint)
}

function trackPickWhip(
  event: PointerEvent,
  readTarget: typeof readPageActionBindingTargetAtPoint,
) {
  const pointerId = event.pointerId
  const handleMove = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== pointerId) return
    bindingStore.movePickWhip(
      { x: moveEvent.clientX, y: moveEvent.clientY },
      readTarget(moveEvent.clientX, moveEvent.clientY),
    )
  }
  const handleUp = (upEvent: PointerEvent) => {
    if (upEvent.pointerId !== pointerId) return
    cleanup()
    bindingStore.completePickWhip(readTarget(upEvent.clientX, upEvent.clientY))
  }
  const cleanup = () => {
    window.removeEventListener('pointermove', handleMove)
    window.removeEventListener('pointerup', handleUp)
    window.removeEventListener('pointercancel', cancel)
  }
  const cancel = () => {
    cleanup()
    bindingStore.cancelPickWhip()
  }
  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerup', handleUp)
  window.addEventListener('pointercancel', cancel)
}
</script>

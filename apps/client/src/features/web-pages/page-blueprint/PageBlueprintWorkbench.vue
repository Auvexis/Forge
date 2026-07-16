<template>
  <PageBlueprintShell
    title="Blueprint"
    :subtitle="`${model.elements.length} event elements, ${model.workflows.length} workflows`"
  >
    <PageBlueprintPanel title="Elements" icon="mouse-pointer-click" :count="model.elements.length">
      <PageBlueprintEmptyState
        v-if="model.elements.length === 0"
        title="No events yet"
        detail="Add events from Inspector > Advanced."
      />
      <PageBlueprintNodeCard
        v-for="element in model.elements"
        :key="element.id"
        :title="element.label"
        :detail="`${element.events.length} event(s) on ${element.tag}`"
        :meta="element.id"
        icon="box"
      />
    </PageBlueprintPanel>

    <PageBlueprintPanel title="Workflows" icon="workflow" :count="model.workflows.length">
      <PageBlueprintEmptyState
        v-if="model.workflows.length === 0"
        title="No workflow triggers"
        detail="Connect an element event to a published workflow."
      />
      <PageBlueprintNodeCard
        v-for="workflow in model.workflows"
        :key="workflow.id"
        :title="workflow.workflowName"
        :detail="`${workflow.triggerName} - ${workflow.returnCount} return field(s)`"
        :meta="`${workflow.eventCount} event(s)`"
        icon="workflow"
      />
    </PageBlueprintPanel>

    <PageBlueprintPanel title="Return Bindings" icon="git-branch" :count="model.bindings.length">
      <PageBlueprintEmptyState
        v-if="model.bindings.length === 0"
        title="No return bindings"
        detail="Use Pick Whip from event returns to bind data into the page."
      />
      <PageBlueprintConnectionRow
        v-for="binding in model.bindings"
        :key="binding.id"
        :source="binding.source"
        :target="binding.target"
        :mode="binding.mode"
      />
    </PageBlueprintPanel>
  </PageBlueprintShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  PageActionCollectionBinding,
  PageActionOutputBinding,
  PageActionWorkflowSummary,
} from '@/core/page-actions'
import type { PageBlock } from '../types/page.types.ts'
import { createPageBlueprintViewModel } from './pageBlueprintViewModel.ts'
import PageBlueprintConnectionRow from './components/PageBlueprintConnectionRow.vue'
import PageBlueprintEmptyState from './components/PageBlueprintEmptyState.vue'
import PageBlueprintNodeCard from './components/PageBlueprintNodeCard.vue'
import PageBlueprintPanel from './components/PageBlueprintPanel.vue'
import PageBlueprintShell from './components/PageBlueprintShell.vue'

const props = defineProps<{
  blocks: PageBlock[]
  workflows: PageActionWorkflowSummary[]
  outputBindings: Record<string, PageActionOutputBinding[]>
  collectionBindings: Record<string, PageActionCollectionBinding[]>
}>()

const model = computed(() => createPageBlueprintViewModel({
  blocks: props.blocks,
  workflows: props.workflows,
  outputBindings: props.outputBindings,
  collectionBindings: props.collectionBindings,
}))
</script>

<template>
  <div class="editor-stack">
    <NodeEditorSection
      title="Error Mapping"
      eyebrow="Errors"
      description="Turn response status or body values into plugin errors."
    >
      <div v-for="(mapping, index) in mappings" :key="mapping.id" class="node-editor-card">
        <ErrorConditionEditor
          :mapping="mapping"
          @update="updateMapping(index, $event)"
          @duplicate="duplicateMapping(index)"
          @remove="removeMapping(index)"
        />
      </div>
      <button class="editor-add-btn" type="button" @click="addMapping">
        <span>+</span>
        Add error mapping
      </button>
    </NodeEditorSection>

    <NodeEditorSection title="Latest Response" description="Status/body from the last test run.">
      <BaseCodeEditor :model-value="latestResponse" language="json" height="180px" readonly />
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import ErrorConditionEditor from './ErrorConditionEditor.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { stringifyEditorValue } from './editorValueUtils'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginBlueprintErrorMapping } from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { method, updateMethodPatch } = usePluginCreatorNodeEditorContext(props, emit)

const mappings = computed(() => method.value?.errorMapping ?? [])
const latestResponse = computed(() =>
  stringifyEditorValue({
    status: props.lastTestResult?.status ?? null,
    body: props.lastTestResult?.body ?? null,
  }),
)

function addMapping() {
  updateMethodPatch({
    errorMapping: [
      ...mappings.value,
      {
        id: `error_${Date.now()}`,
        code: 'REQUEST_FAILED',
        condition: { source: 'status', operator: 'greaterThanOrEquals', value: 400 },
        message: { type: 'static', value: 'Request failed' },
      },
    ],
  })
}

function updateMapping(index: number, payload: Partial<PluginBlueprintErrorMapping>) {
  updateMethodPatch({
    errorMapping: mappings.value.map((mapping, currentIndex) =>
      currentIndex === index ? { ...mapping, ...payload } : mapping,
    ),
  })
}

function duplicateMapping(index: number) {
  const mapping = mappings.value[index]
  if (!mapping) return
  updateMethodPatch({
    errorMapping: [
      ...mappings.value.slice(0, index + 1),
      { ...mapping, id: `error_${Date.now()}` },
      ...mappings.value.slice(index + 1),
    ],
  })
}

function removeMapping(index: number) {
  updateMethodPatch({
    errorMapping: mappings.value.filter((_, currentIndex) => currentIndex !== index),
  })
}
</script>

<style scoped>
.node-editor-card {
  display: grid;
  gap: 12px;
}
</style>

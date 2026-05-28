<template>
  <div class="editor-stack">
    <NodeEditorSection
      title="Response Mapping"
      eyebrow="Mapper"
      description="Map response fields into typed method outputs."
    >
      <MappingRowsEditor :mappings="mappings" @update="updateMappings" />
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MappingRowsEditor from './MappingRowsEditor.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginBlueprintResponseMapping } from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { method, updateMethodPatch } = usePluginCreatorNodeEditorContext(props, emit)

const mappings = computed(() => method.value?.responseMapping ?? [])

function updateMappings(responseMapping: PluginBlueprintResponseMapping[]) {
  updateMethodPatch({ responseMapping })
}
</script>

<style scoped></style>

<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this step"
      />
    </EditorField>

    <EditorField label="Form Title" icon="clipboard-list">
      <BaseInput
        :model-value="(node.data.title as string) || ''"
        @update:model-value="updateNodeData({ title: $event as string })"
        placeholder="Candidate application"
      />
    </EditorField>

    <EditorField label="Description" icon="align-left">
      <BaseTextarea
        :model-value="(node.data.description as string) || ''"
        @update:model-value="updateNodeData({ description: $event as string })"
        placeholder="Tell the user what to fill out"
        :rows="3"
      />
    </EditorField>

    <EditorField label="Expiration (seconds)" icon="timer">
      <BaseInput
        type="number"
        :model-value="String(node.data.expiresInSeconds ?? 900)"
        @update:model-value="updateNodeData({ expiresInSeconds: Number($event) })"
        placeholder="900"
      />
      <div class="editor-hint">If the form is not submitted before this, the workflow stops.</div>
    </EditorField>

    <EditorField label="Fields JSON" icon="list">
      <div class="editor-hint editor-hint--violet">
        Temporary version: edit fields as JSON. The submitted data becomes
        <span class="editor-code-snippet">steps.{{ node.id }}.output.fields</span>.
      </div>
      <BaseTextarea
        :model-value="fieldsJson"
        @update:model-value="updateFields($event as string)"
        spellcheck="false"
        :rows="8"
      />
      <div v-if="jsonError" class="wait-form-error">{{ jsonError }}</div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormTriggerField } from '@/core/types/workflow.types'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'

const props = defineProps<NodeEditorProps>()
const jsonError = ref('')

const fieldsJson = computed(() =>
  JSON.stringify((props.node.data.fields as FormTriggerField[]) ?? [], null, 2),
)

function updateFields(value: string) {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      jsonError.value = 'Fields must be a JSON array.'
      return
    }
    jsonError.value = ''
    props.updateNodeData({ fields: parsed })
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : 'Invalid JSON'
  }
}
</script>

<style scoped>
.wait-form-error {
  color: var(--nod8-danger, #ef4444);
  font-size: var(--nod8-text-xs);
  margin-top: var(--nod8-space-2);
}
</style>

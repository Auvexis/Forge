<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Tool"
      />
    </EditorField>

    <EditorField label="Selected Tool">
      <div class="editor-grid">
        <BaseInput
          :model-value="(node.data.pluginId as string) || ''"
          disabled
          placeholder="Plugin"
        />
        <BaseInput
          :model-value="(node.data.methodId as string) || ''"
          disabled
          placeholder="Method"
        />
      </div>
    </EditorField>

    <EditorField label="Tool Instructions">
      <BaseTextarea
        :model-value="(node.data.descriptionOverride as string) || ''"
        :rows="5"
        placeholder="Tell the agent when to use this tool, what it should accomplish, and any constraints it must follow."
        @update:model-value="updateDescriptionOverride"
      />
    </EditorField>

    <EditorField label="Parameter Defaults">
      <BaseTextarea
        :model-value="inputDefaultsJson"
        :rows="6"
        :error="inputDefaultsError"
        placeholder="{\n  &quot;limit&quot;: 10\n}"
        @update:model-value="updateInputDefaults"
      />
    </EditorField>

    <EditorField label="Side Effect">
      <BaseSelect
        :model-value="(node.data.sideEffect as string) || 'read'"
        :options="SIDE_EFFECTS"
        @update:model-value="updateNodeData({ sideEffect: $event as string })"
      />
    </EditorField>

    <EditorField label="Approval">
      <BaseSwitch
        :model-value="Boolean(node.data.requiresApproval)"
        label="Require approval"
        @update:model-value="updateNodeData({ requiresApproval: $event })"
      />
    </EditorField>

    <EditorField label="Timeout">
      <BaseInput
        type="number"
        :model-value="Number(node.data.timeoutMs ?? 30000)"
        @update:model-value="updateNodeData({ timeoutMs: Number($event) })"
        placeholder="30000"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'

const props = defineProps<NodeEditorProps>()

const SIDE_EFFECTS = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'delete', label: 'Delete' },
  { value: 'external-message', label: 'External Message' },
  { value: 'external-payment', label: 'External Payment' },
  { value: 'filesystem', label: 'Filesystem' },
]

const inputDefaultsDraft = ref('')
const inputDefaultsError = ref('')

const inputDefaultsJson = computed(() => {
  if (inputDefaultsError.value) return inputDefaultsDraft.value
  return JSON.stringify(props.node.data.inputDefaults ?? {}, null, 2)
})

function updateDescriptionOverride(value: string) {
  const next = value.trim()
  props.updateNodeData({ descriptionOverride: next || undefined })
}

function updateInputDefaults(value: string) {
  inputDefaultsDraft.value = value

  try {
    const parsed = JSON.parse(value || '{}')
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      inputDefaultsError.value = 'Parameter defaults must be a JSON object.'
      return
    }

    inputDefaultsError.value = ''
    props.updateNodeData({ inputDefaults: parsed as Record<string, unknown> })
  } catch {
    inputDefaultsError.value = 'Enter valid JSON.'
  }
}
</script>

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

    <EditorField label="URL Prefix" icon="link">
      <BaseInput
        :model-value="(node.data.slugPrefix as string) || ''"
        @update:model-value="updateNodeData({ slugPrefix: $event as string || undefined })"
        placeholder="vaga-dev"
      />
      <div class="editor-hint">
        The final public URL receives a random suffix, for example
        <span class="editor-code-snippet">vaga-dev-&lt;uuid&gt;</span>.
      </div>
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

    <FormThemeMenu
      :model-value="formTheme"
      :title="(node.data.title as string) || ''"
      :description="(node.data.description as string) || ''"
      @update:model-value="updateNodeData({ theme: $event })"
    />

    <FormFieldsEditor
      :model-value="formFields"
      hint="Submitted fields are available as <code class='editor-code-snippet'>{{ steps.thisNode.output.fields.&lt;name&gt; }}</code>."
      @update:model-value="updateNodeData({ fields: $event })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormTheme, FormTriggerField } from '@/core/types/workflow.types'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import FormThemeMenu from '../../form/FormThemeMenu.vue'
import FormFieldsEditor from '../../form/FormFieldsEditor.vue'

const props = defineProps<NodeEditorProps>()

const formFields = computed<FormTriggerField[]>(
  () => (props.node.data.fields as FormTriggerField[]) ?? [],
)

const formTheme = computed<FormTheme>(
  () => (props.node.data.theme as FormTheme) ?? {},
)
</script>

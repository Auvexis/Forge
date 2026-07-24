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

    <EditorField label="Public URL Slug" icon="link">
      <ExpressionInput
        :model-value="(node.data.publicSlug as string) || ''"
        @update:model-value="updateNodeData({ publicSlug: $event as string || undefined })"
        placeholder="vaga-{{ steps.uuid.output }}"
      />
      <div class="editor-hint">
        Generate a UUID in an earlier step, send the link in parallel, then use the same slug here.
        Supports <span class="editor-code-snippet" v-pre>{{ template }}</span> expressions.
      </div>
    </EditorField>

    <EditorField label="Expiration (seconds)" icon="timer">
      <ExpressionInput
        :model-value="String(node.data.expiresInSeconds ?? 900)"
        @update:model-value="updateExpiration"
        placeholder="900"
      />
      <div class="editor-hint">If the form is not submitted before this, the workflow stops.</div>
    </EditorField>

    <EditorField label="Form URLs" icon="radio">
      <div class="te-url-group">
        <div class="te-url-row">
          <span class="te-url-badge te-url-badge--test">TEST</span>
          <div class="te-url-box">{{ formTestUrlPreview }}</div>
          <button
            class="te-icon-btn"
            title="Copy URL"
            :disabled="!formTestUrlPreview"
            @click="copyUrl(formTestUrlPreview, 'test')"
          >
            <CheckIcon v-if="copied === 'test'" :size="14" style="color: var(--fabric-wait-form-editor-green400)" />
            <CopyIcon v-else :size="14" />
          </button>
          <a
            v-if="formTestUrl"
            :href="formTestUrl"
            target="_blank"
            rel="noopener"
            class="te-icon-btn"
            title="Open in new tab"
          >
            <RadioIcon :size="14" />
          </a>
        </div>
        <div class="te-url-row">
          <span class="te-url-badge te-url-badge--prod">RUNTIME</span>
          <div class="te-url-box">{{ runtimeUrlPreview }}</div>
          <button
            class="te-icon-btn"
            title="Copy URL"
            :disabled="!runtimeUrlPreview"
            @click="copyUrl(runtimeUrlPreview, 'prod')"
          >
            <CheckIcon v-if="copied === 'prod'" :size="14" style="color: var(--fabric-wait-form-editor-green400)" />
            <CopyIcon v-else :size="14" />
          </button>
          <a
            v-if="runtimeFormUrl"
            :href="runtimeFormUrl"
            target="_blank"
            rel="noopener"
            class="te-icon-btn"
            title="Open in new tab"
          >
            <RadioIcon :size="14" />
          </a>
        </div>
      </div>
      <p class="te-hint">
        Template slugs are resolved when the workflow reaches this step. The runtime URL appears
        after the temporary form session is created.
      </p>
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
import { computed, ref } from 'vue'
import { CheckIcon, CopyIcon, RadioIcon } from 'lucide-vue-next'
import type { FormTheme, FormTriggerField } from '@/core/types/workflow.types'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'
import FormThemeMenu from '../../form/FormThemeMenu.vue'
import FormFieldsEditor from '../../form/FormFieldsEditor.vue'
import { useExecutionStore } from '../../../stores/execution.store'
import { useWorkflowStore } from '../../../stores/workflow.store'
import {
  buildTemporaryFormUrl,
  buildTemporaryFormUrlPreview,
  resolveWaitFormRuntimeSlug,
  type WaitFormTemplateContext,
} from './waitFormRuntimeUrls'

const props = defineProps<NodeEditorProps>()
const copied = ref<'test' | 'prod' | null>(null)
const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()

const formFields = computed<FormTriggerField[]>(
  () => (props.node.data.fields as FormTriggerField[]) ?? [],
)

const formTheme = computed<FormTheme>(
  () => (props.node.data.theme as FormTheme) ?? {},
)

const templateContext = computed<WaitFormTemplateContext>(() => {
  const steps: WaitFormTemplateContext['steps'] = {}
  for (const [nodeId, state] of Object.entries(executionStore.nodeStatuses)) {
    if (state.output !== undefined) steps[nodeId] = { output: state.output }
  }

  return {
    trigger: workflowStore.activeWorkflow?.trigger.lastTriggerPayload ?? {},
    steps,
    variables: Object.fromEntries(
      (workflowStore.activeWorkflow?.variables ?? []).map((variable) => [
        variable.name,
        variable.defaultValue,
      ]),
    ),
  }
})

const formPublicSlug = computed(() =>
  resolveWaitFormRuntimeSlug(String(props.node.data.publicSlug ?? ''), templateContext.value),
)
const runtimeFormUrl = computed(() => {
  const output = executionStore.nodeStatuses[props.node.id]?.output as
    | { formUrl?: string }
    | undefined
  return output?.formUrl ?? ''
})
const formTestUrl = computed(() =>
  runtimeFormUrl.value || buildTemporaryFormUrl(window.location.origin, formPublicSlug.value.slug),
)
const formTestUrlPreview = computed(() =>
  formTestUrl.value || buildTemporaryFormUrlPreview(window.location.origin, '<generated-on-execution>'),
)
const runtimeUrlPreview = computed(() => {
  if (runtimeFormUrl.value) return runtimeFormUrl.value
  if (formPublicSlug.value.hasTemplate && !formPublicSlug.value.isResolved) {
    return buildTemporaryFormUrlPreview(window.location.origin, '<generated after upstream values exist>')
  }
  return formTestUrlPreview.value
})

async function copyUrl(url: string, which: 'test' | 'prod') {
  if (!url) return
  await navigator.clipboard.writeText(url)
  copied.value = which
  setTimeout(() => {
    copied.value = null
  }, 2000)
}

function updateExpiration(value: string | boolean) {
  if (typeof value !== 'string') return
  const trimmed = value.trim()
  if (!trimmed) {
    props.updateNodeData({ expiresInSeconds: undefined })
    return
  }
  const numericValue = Number(trimmed)
  props.updateNodeData({
    expiresInSeconds:
      Number.isFinite(numericValue) && !trimmed.includes('{{') ? numericValue : trimmed,
  })
}
</script>

<style scoped>
.te-url-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.te-url-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.te-url-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: var(--fabric-radius-sm);
  flex-shrink: 0;
}

.te-url-badge--test {
  background: var(--fabric-wait-form-editor-bg-muted);
  color: var(--fabric-wait-form-editor-text-secondary);
}

.te-url-badge--prod {
  background: color-mix(in srgb, var(--fabric-wait-form-editor-green400) 15%, transparent);
  color: var(--fabric-wait-form-editor-green400);
}
</style>

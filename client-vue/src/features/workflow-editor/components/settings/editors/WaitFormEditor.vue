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
      <div class="wait-form-url-group">
        <div class="wait-form-url-row">
          <span class="wait-form-url-badge wait-form-url-badge--test">TEST</span>
          <div class="wait-form-url-box">{{ formTestUrl || '<generated-on-execution>' }}</div>
          <button
            class="wait-form-icon-btn"
            title="Copy URL"
            :disabled="!formTestUrl"
            @click="copyUrl(formTestUrl, 'test')"
          >
            <CheckIcon v-if="copied === 'test'" :size="14" style="color: var(--nod8-green-400)" />
            <CopyIcon v-else :size="14" />
          </button>
          <a
            v-if="formTestUrl"
            :href="formTestUrl"
            target="_blank"
            rel="noopener"
            class="wait-form-icon-btn"
            title="Open in new tab"
          >
            <RadioIcon :size="14" />
          </a>
        </div>
        <div class="wait-form-url-row">
          <span class="wait-form-url-badge wait-form-url-badge--prod">PROD</span>
          <div class="wait-form-url-box">{{ formProdUrl || '<generated-on-execution>' }}</div>
          <button
            class="wait-form-icon-btn"
            title="Copy URL"
            :disabled="!formProdUrl"
            @click="copyUrl(formProdUrl, 'prod')"
          >
            <CheckIcon v-if="copied === 'prod'" :size="14" style="color: var(--nod8-green-400)" />
            <CopyIcon v-else :size="14" />
          </button>
          <a
            v-if="formProdUrl"
            :href="formProdUrl"
            target="_blank"
            rel="noopener"
            class="wait-form-icon-btn"
            title="Open in new tab"
          >
            <RadioIcon :size="14" />
          </a>
        </div>
      </div>
      <div class="editor-hint">
        Static URLs need a Public URL Slug. Without one, the temporary form URL is generated when
        this step runs.
      </div>
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
import { API_BASE_URL } from '@/core/constants/app'
import { appApi } from '@/core/api/app.api'

const props = defineProps<NodeEditorProps>()
const copied = ref<'test' | 'prod' | null>(null)
const backendPublicUrl = ref(API_BASE_URL)

async function loadAppInfo() {
  try {
    const info = await appApi.getInfo()
    if (info.publicUrl) {
      backendPublicUrl.value = info.publicUrl
    }
  } catch {
    // Keep API_BASE_URL fallback.
  }
}
loadAppInfo()

const formFields = computed<FormTriggerField[]>(
  () => (props.node.data.fields as FormTriggerField[]) ?? [],
)

const formTheme = computed<FormTheme>(
  () => (props.node.data.theme as FormTheme) ?? {},
)

const formPublicSlug = computed(() => String(props.node.data.publicSlug ?? '').trim())
const formTestUrl = computed(() =>
  formPublicSlug.value ? `${API_BASE_URL}/temporary-forms/${formPublicSlug.value}` : '',
)
const formProdUrl = computed(() =>
  formPublicSlug.value ? `${backendPublicUrl.value}/temporary-forms/${formPublicSlug.value}` : '',
)

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
.wait-form-url-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wait-form-url-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.wait-form-url-badge {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: var(--nod8-radius-sm);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.wait-form-url-badge--test {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-secondary);
}

.wait-form-url-badge--prod {
  background: color-mix(in srgb, var(--nod8-green-400) 15%, transparent);
  color: var(--nod8-green-400);
}

.wait-form-url-box {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--nod8-border-subtle);
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-surface);
  color: var(--nod8-text-secondary);
  font-family: var(--nod8-font-mono);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wait-form-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--nod8-border-subtle);
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-surface);
  color: var(--nod8-text-secondary);
  cursor: pointer;
}

.wait-form-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>

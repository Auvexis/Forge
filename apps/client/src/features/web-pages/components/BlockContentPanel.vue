<template>
  <div class="web-page-inspector web-page-content-panel">
    <h4>Content</h4>

    <section v-if="hasText" class="web-page-style-section">
      <BaseInput
        :model-value="String(block.props?.text ?? '')"
        label="Text"
        @update:model-value="setProp('text', $event)"
      />
    </section>

    <section v-if="block.tag === 'button'" class="web-page-style-section">
      <h5>Button</h5>
      <label class="web-page-style-row">
        <span>Action</span>
        <BaseSegmentedSelect
          :model-value="block.action?.type ?? ''"
          :options="buttonActionOptions"
          aria-label="Button action"
          :icon-size="15"
          @update:model-value="setActionType(String($event))"
        />
      </label>
      <BaseInput
        v-if="block.action?.type === 'submitForm'"
        :model-value="block.action.formId"
        label="Form ID"
        @update:model-value="patchAction({ formId: String($event) })"
      />
      <BaseInput
        v-if="block.action?.type === 'triggerWorkflow' && publishedWorkflowOptions.length === 0"
        :model-value="block.action.workflowId"
        label="Workflow ID"
        hint="No compatible published workflows found."
        @update:model-value="patchAction({ workflowId: String($event) })"
      />
      <BaseSegmentedSelect
        v-if="block.action?.type === 'triggerWorkflow' && publishedWorkflowOptions.length > 0"
        :model-value="block.action.workflowId"
        :options="publishedWorkflowOptions"
        aria-label="Workflow"
        :icon-size="15"
        @update:model-value="patchAction({ workflowId: String($event) })"
      />
      <BaseInput
        v-if="block.action?.type === 'openUrl'"
        :model-value="block.action.url"
        label="URL"
        :error="urlError"
        @update:model-value="setOpenUrl(String($event))"
      />
      <label class="web-page-style-row">
        <span>Type</span>
        <BaseSegmentedSelect
          :model-value="String(block.props?.type ?? 'button')"
          :options="buttonTypeOptions"
          aria-label="Button type"
          :icon-size="15"
          @update:model-value="setProp('type', $event)"
        />
      </label>
      <label class="web-page-style-row">
        <span>Disabled</span>
        <BaseSegmentedSelect
          :model-value="String(Boolean(block.props?.disabled))"
          :options="mediaBooleanOptions"
          aria-label="Button disabled"
          :icon-size="15"
          @update:model-value="setBooleanProp('disabled', $event)"
        />
      </label>
    </section>

    <section v-if="block.tag === 'input'" class="web-page-style-section">
      <h5>Input</h5>
      <label class="web-page-style-row">
        <span>Type</span>
        <BaseSegmentedSelect
          :model-value="String(block.props?.type ?? 'text')"
          :options="inputTypeOptions"
          aria-label="Input type"
          :icon-size="15"
          @update:model-value="setProp('type', $event)"
        />
      </label>
      <BaseInput :model-value="String(block.props?.label ?? '')" label="Label" @update:model-value="setProp('label', $event)" />
      <BaseInput :model-value="String(block.props?.name ?? '')" label="Name" @update:model-value="setProp('name', $event)" />
      <BaseInput :model-value="String(block.props?.placeholder ?? '')" label="Placeholder" @update:model-value="setProp('placeholder', $event)" />
      <BaseInput :model-value="String(block.props?.value ?? '')" label="Value" @update:model-value="setProp('value', $event)" />
      <label class="web-page-style-row">
        <span>Required</span>
        <BaseSegmentedSelect
          :model-value="String(Boolean(block.props?.required))"
          :options="mediaBooleanOptions"
          aria-label="Input required"
          :icon-size="15"
          @update:model-value="setBooleanProp('required', $event)"
        />
      </label>
      <label class="web-page-style-row">
        <span>Disabled</span>
        <BaseSegmentedSelect
          :model-value="String(Boolean(block.props?.disabled))"
          :options="mediaBooleanOptions"
          aria-label="Input disabled"
          :icon-size="15"
          @update:model-value="setBooleanProp('disabled', $event)"
        />
      </label>
    </section>

    <section v-if="block.tag === 'image'" class="web-page-style-section">
      <h5>Image</h5>
      <BaseInput
        :model-value="String(block.props?.src ?? '')"
        label="Image URL"
        :error="urlError"
        @update:model-value="setUrlProp('src', String($event), 'media')"
        @drop.prevent="setDroppedAssetProp($event, 'src', 'media')"
      />
      <div class="web-page-image-upload">
        <BaseButton variant="outline" size="sm" icon-left="image-plus" @click="assetInput?.click()">
          Upload image
        </BaseButton>
        <input ref="assetInput" type="file" accept="image/*" @change="uploadAsset" />
      </div>
      <BaseInput :model-value="String(block.props?.alt ?? '')" label="Alt" @update:model-value="setProp('alt', $event)" />
      <BaseInput :model-value="String(block.props?.title ?? '')" label="Title" @update:model-value="setProp('title', $event)" />
    </section>

    <section v-if="block.tag === 'audio'" class="web-page-style-section">
      <h5>Audio</h5>
      <BaseInput
        :model-value="String(block.props?.src ?? '')"
        label="Audio URL"
        :error="urlError"
        @update:model-value="setUrlProp('src', String($event), 'media')"
        @drop.prevent="setDroppedAssetProp($event, 'src', 'media')"
      />
      <MediaToggles :block="block" @set="setBooleanProp" />
    </section>

    <section v-if="block.tag === 'video'" class="web-page-style-section">
      <h5>Video</h5>
      <BaseInput
        :model-value="String(block.props?.src ?? '')"
        label="Video URL"
        :error="urlError"
        @update:model-value="setUrlProp('src', String($event), 'media')"
        @drop.prevent="setDroppedAssetProp($event, 'src', 'media')"
      />
      <BaseInput
        :model-value="String(block.props?.poster ?? '')"
        label="Poster URL"
        :error="urlError"
        @update:model-value="setUrlProp('poster', String($event), 'media')"
        @drop.prevent="setDroppedAssetProp($event, 'poster', 'media')"
      />
      <MediaToggles :block="block" @set="setBooleanProp" />
    </section>

    <section v-if="block.tag === 'youtube'" class="web-page-style-section">
      <h5>Youtube</h5>
      <BaseInput :model-value="String(block.props?.url ?? '')" label="Youtube URL" @update:model-value="setProp('url', $event)" />
      <BaseInput :model-value="String(block.props?.videoId ?? '')" label="Video ID" @update:model-value="setProp('videoId', $event)" />
      <BaseInput :model-value="String(block.props?.title ?? '')" label="Title" @update:model-value="setProp('title', $event)" />
      <label class="web-page-style-row">
        <span>Autoplay</span>
        <BaseSegmentedSelect
          :model-value="String(Boolean(block.props?.autoplay))"
          :options="mediaBooleanOptions"
          aria-label="Youtube autoplay"
          :icon-size="15"
          @update:model-value="setBooleanProp('autoplay', $event)"
        />
      </label>
    </section>

    <section v-if="block.tag === 'link'" class="web-page-style-section">
      <h5>Link</h5>
      <BaseInput
        :model-value="String(block.props?.href ?? '')"
        label="Link URL"
        :error="urlError"
        @update:model-value="setUrlProp('href', String($event), 'link')"
        @drop.prevent="setDroppedAssetProp($event, 'href', 'link')"
      />
      <label class="web-page-style-row">
        <span>Target</span>
        <BaseSegmentedSelect
          :model-value="String(block.props?.target ?? '_self')"
          :options="targetOptions"
          aria-label="Link target"
          :icon-size="15"
          @update:model-value="setProp('target', $event)"
        />
      </label>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { workflowsApi } from '@/core/api/workflows.api'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSegmentedSelect, { type BaseSegmentedSelectOption } from '@/shared/components/base/BaseSegmentedSelect.vue'
import type { WorkflowItem } from '@/core/types/workflow.types'
import type { PageBlock, PageBlockAction } from '../types/page.types.ts'

const props = defineProps<{ block: PageBlock }>()
const emit = defineEmits<{
  patch: [patch: Partial<PageBlock>]
  'upload-image': [file: File]
}>()
const urlError = ref('')
const assetInput = ref<HTMLInputElement | null>(null)
const publishedWorkflows = ref<WorkflowItem[]>([])
const hasText = computed(() => props.block.tag === 'text' || props.block.tag === 'button' || props.block.tag === 'link')
const publishedWorkflowOptions = computed<BaseSegmentedSelectOption[]>(() => publishedWorkflows.value
  .filter((workflow) => workflow.metadata.isActive && !workflow.metadata.isDraft)
  .filter((workflow) => ['manual', 'webhook', 'form'].includes(workflow.trigger?.type ?? 'manual'))
  .map((workflow) => ({
    value: workflow.metadata.id,
    label: workflow.metadata.name,
    title: workflow.metadata.name,
    icon: workflow.trigger?.type === 'form' ? 'clipboard-list' : 'workflow',
  })))

const buttonTypeOptions: BaseSegmentedSelectOption[] = [
  { value: 'button', label: '', title: 'Button', icon: 'square-mouse-pointer' },
  { value: 'submit', label: '', title: 'Submit', icon: 'send' },
  { value: 'reset', label: '', title: 'Reset', icon: 'rotate-ccw' },
]
const buttonActionOptions: BaseSegmentedSelectOption[] = [
  { value: '', label: '', title: 'None', icon: 'circle-slash' },
  { value: 'submitForm', label: '', title: 'Submit form', icon: 'send' },
  { value: 'triggerWorkflow', label: '', title: 'Trigger workflow', icon: 'workflow' },
  { value: 'openUrl', label: '', title: 'Open URL', icon: 'external-link' },
]
const inputTypeOptions: BaseSegmentedSelectOption[] = [
  { value: 'text', label: '', title: 'Text', icon: 'type' },
  { value: 'email', label: '', title: 'Email', icon: 'mail' },
  { value: 'password', label: '', title: 'Password', icon: 'key-round' },
  { value: 'number', label: '', title: 'Number', icon: 'hash' },
  { value: 'tel', label: '', title: 'Phone', icon: 'phone' },
  { value: 'url', label: '', title: 'URL', icon: 'link' },
]
const targetOptions: BaseSegmentedSelectOption[] = [
  { value: '_self', label: '', title: 'Same tab', icon: 'panel-top' },
  { value: '_blank', label: '', title: 'New tab', icon: 'external-link' },
]
const mediaBooleanOptions: BaseSegmentedSelectOption[] = [
  { value: 'false', label: '', title: 'Off', icon: 'x' },
  { value: 'true', label: '', title: 'On', icon: 'check' },
]

const MediaToggles = defineComponent({
  props: {
    block: { type: Object as () => PageBlock, required: true },
  },
  emits: ['set'],
  setup(componentProps, { emit: componentEmit }) {
    const keys = [
      { key: 'controls', label: 'Controls', icon: 'sliders-horizontal' },
      { key: 'autoplay', label: 'Autoplay', icon: 'play' },
      { key: 'loop', label: 'Loop', icon: 'repeat' },
      { key: 'muted', label: 'Muted', icon: 'volume-x' },
    ]
    return () => keys.map((item) => h('label', { class: 'web-page-style-row' }, [
      h('span', item.label),
      h(BaseSegmentedSelect, {
        modelValue: String(Boolean(componentProps.block.props?.[item.key])),
        options: mediaBooleanOptions,
        ariaLabel: item.label,
        iconSize: 15,
        'onUpdate:modelValue': (value: string) => componentEmit('set', item.key, value),
      }),
    ]))
  },
})

onMounted(async () => {
  try {
    publishedWorkflows.value = await workflowsApi.getAll()
  } catch {
    publishedWorkflows.value = []
  }
})

function setProp(key: string, value: string | boolean) {
  emit('patch', { props: { ...(props.block.props ?? {}), [key]: value } })
}

function setBooleanProp(key: string, value: string) {
  setProp(key, value === 'true')
}

function setActionType(type: string) {
  if (type === 'submitForm') emit('patch', { action: { id: createActionId(), type, formId: '' } })
  else if (type === 'triggerWorkflow') emit('patch', { action: { id: createActionId(), type, workflowId: '' } })
  else if (type === 'openUrl') emit('patch', { action: { id: createActionId(), type, url: '', target: '_blank' } })
  else emit('patch', { action: undefined })
}

function patchAction(payload: Record<string, string>) {
  if (!props.block.action) return
  emit('patch', { action: { ...props.block.action, ...payload } as PageBlockAction })
}

function setOpenUrl(value: string) {
  if (value && !isSafeUrl(value, 'link')) {
    urlError.value = 'Invalid URL'
    return
  }
  urlError.value = ''
  patchAction({ url: value })
}

function setUrlProp(key: string, value: string, kind: 'link' | 'media') {
  if (value && !isSafeUrl(value, kind)) {
    urlError.value = 'Invalid URL'
    return
  }
  urlError.value = ''
  setProp(key, value)
}

function setDroppedAssetProp(event: DragEvent, key: string, kind: 'link' | 'media') {
  const path = readDroppedAssetPath(event)
  if (!path) return
  setUrlProp(key, path, kind)
}

function readDroppedAssetPath(event: DragEvent): string {
  return event.dataTransfer?.getData('application/x-sailor-page-asset')
    || event.dataTransfer?.getData('text/plain')
    || ''
}

function isSafeUrl(value: string, kind: 'link' | 'media'): boolean {
  if (kind === 'media') return value.startsWith('/') || /^(https?:)/.test(value)
  return value.startsWith('/') || value.startsWith('#') || /^(https?:|mailto:|tel:)/.test(value)
}

function uploadAsset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('upload-image', file)
  if (assetInput.value) assetInput.value.value = ''
}

function createActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
</script>

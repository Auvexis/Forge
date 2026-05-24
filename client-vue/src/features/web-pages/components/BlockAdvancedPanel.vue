<template>
  <div class="web-page-inspector web-page-advanced-panel">
    <h4>Element</h4>
    <label class="web-page-style-row">
      <span>ID</span>
      <BaseInput
        :model-value="block.elementId ?? ''"
        placeholder="hero"
        @update:model-value="patchField('elementId', String($event))"
      />
    </label>
    <label class="web-page-style-row">
      <span>Class</span>
      <BaseInput
        :model-value="block.className ?? ''"
        placeholder="hero-section primary"
        @update:model-value="patchField('className', String($event))"
      />
    </label>
    <details class="web-page-advanced-panel__section">
      <summary>Attributes</summary>
      <BaseCodeEditor
        :model-value="attributesJson"
        language="json"
        hint='{"data-track": "hero", "aria-label": "Hero"}'
        height="120px"
        @update:model-value="patchAttributes"
      />
      <p v-if="attributeError" class="web-page-import-error">{{ attributeError }}</p>
    </details>
    <details class="web-page-advanced-panel__section">
      <summary>Custom CSS</summary>
      <BaseCodeEditor
        :model-value="block.customCss ?? ''"
        language="css"
        hint="Use #id, .class, or raw declarations for this element."
        height="160px"
        @update:model-value="patchField('customCss', $event)"
      />
    </details>
    <details class="web-page-advanced-panel__section">
      <summary>Custom JS</summary>
      <BaseCodeEditor
        :model-value="block.customJs ?? ''"
        language="javascript"
        hint="element points to this block when the page is published."
        height="180px"
        @update:model-value="patchField('customJs', $event)"
      />
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import type { PageBlock, PageBlockAttributes } from '../types/page.types.ts'

const props = defineProps<{ block: PageBlock }>()
const emit = defineEmits<{ patch: [patch: Partial<PageBlock>] }>()
const attributeError = ref('')

const attributesJson = computed(() => JSON.stringify(props.block.attributes ?? {}, null, 2))

function patchField<K extends 'elementId' | 'className' | 'customCss' | 'customJs'>(key: K, value: string) {
  emit('patch', { [key]: value } as Partial<PageBlock>)
}

function patchAttributes(value: string) {
  try {
    const parsed = JSON.parse(value || '{}') as PageBlockAttributes
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid attributes')
    attributeError.value = ''
    emit('patch', { attributes: parsed })
  } catch {
    attributeError.value = 'Invalid JSON.'
  }
}
</script>

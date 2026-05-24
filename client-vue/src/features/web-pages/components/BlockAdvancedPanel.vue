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
    <div class="web-page-code-field">
      <BaseCodeEditor
        :model-value="attributesJson"
        language="json"
        label="Attributes"
        hint='{"data-track": "hero", "aria-label": "Hero"}'
        height="120px"
        @update:model-value="patchAttributes"
      />
      <p v-if="attributeError" class="web-page-import-error">{{ attributeError }}</p>
    </div>
    <div class="web-page-code-field">
      <BaseCodeEditor
        :model-value="block.customCss ?? ''"
        language="css"
        label="Custom CSS"
        hint="Use #id, .class, or raw declarations for this element."
        height="160px"
        @update:model-value="patchField('customCss', $event)"
      />
    </div>
    <div class="web-page-code-field">
      <BaseCodeEditor
        :model-value="block.customJs ?? ''"
        language="javascript"
        label="Custom JS"
        hint="element points to this block when the page is published."
        height="180px"
        @update:model-value="patchField('customJs', $event)"
      />
    </div>
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

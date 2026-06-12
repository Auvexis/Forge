<template>
  <section class="web-page-code-canvas" @pointerdown.stop>
    <header class="web-page-code-canvas__header">
      <strong>{{ file.path }}</strong>
      <BaseButton
        variant="ghost"
        size="icon"
        icon-left="x"
        title="Close code editor"
        @pointerdown.stop
        @click.stop="$emit('close')"
      />
    </header>

    <div v-if="isImage" class="web-page-code-canvas__preview">
      <img v-if="file.url" :src="assetUrl" alt="image preview" />
      <span v-else>image preview</span>
      <code>{{ file.url ?? file.path }}</code>
    </div>

    <BaseCodeEditor
      v-else
      :model-value="modelValue"
      :language="language"
      :readonly="readonly"
      height="calc(100vh - 180px)"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { API_BASE_URL } from '@/core/constants/app.ts'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import type { SiteFile } from '../types/page.types.ts'

const props = defineProps<{
  file: SiteFile
  modelValue: string
  readonly?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  close: []
}>()

const isImage = computed(() => props.file.kind === 'asset' || /\.(png|jpe?g|webp|gif|svg)$/i.test(props.file.path))
const language = computed(() => {
  if (props.file.path.endsWith('.css')) return 'css'
  if (props.file.path.endsWith('.html')) return 'html'
  if (props.file.path.endsWith('.json')) return 'json'
  return 'javascript'
})
const assetUrl = computed(() => props.file.url ? `${API_BASE_URL}${props.file.url}` : '')
</script>

<template>
  <div class="web-page-inspector">
    <BaseInput
      :model-value="String(block.styles?.padding ?? '')"
      label="padding"
      @update:model-value="setStyle('padding', $event)"
    />
    <BaseInput
      :model-value="String(block.styles?.backgroundColor ?? '')"
      label="backgroundColor"
      @update:model-value="setStyle('backgroundColor', $event)"
    />
    <BaseInput
      :model-value="String(block.styles?.color ?? '')"
      label="color"
      @update:model-value="setStyle('color', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import BaseInput from '@/shared/components/base/BaseInput.vue'
import type { PageBlock } from '../types/page.types.ts'
import { sanitizeStyles } from '../utils/styleAllowlist.ts'

const props = defineProps<{ block: PageBlock }>()
const emit = defineEmits<{ patch: [patch: Partial<PageBlock>] }>()

function setStyle(key: string, value: string | boolean) {
  emit('patch', {
    styles: sanitizeStyles({ ...(props.block.styles ?? {}), [key]: String(value) }),
  })
}
</script>

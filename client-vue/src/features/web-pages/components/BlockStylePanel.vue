<template>
  <div class="web-page-inspector web-page-style-panel">
    <h4>{{ title }}</h4>
    <label class="web-page-style-row">
      <span>Layout</span>
      <BaseSelect
        :model-value="String(block.styles?.display ?? 'block')"
        :options="layoutOptions"
        @update:model-value="setStyle('display', String($event))"
      />
    </label>
    <label class="web-page-style-row">
      <span>Background</span>
      <BaseColorPicker
        :model-value="String(block.styles?.backgroundColor ?? '#ffffff')"
        :show-value="true"
        @update:model-value="setStyle('backgroundColor', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Text Color</span>
      <BaseColorPicker
        :model-value="String(block.styles?.color ?? '#111111')"
        :show-value="true"
        @update:model-value="setStyle('color', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Padding</span>
      <BaseInput
        :model-value="String(block.styles?.padding ?? '')"
        @update:model-value="setStyle('padding', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Radius</span>
      <BaseInput
        :model-value="String(block.styles?.borderRadius ?? '')"
        @update:model-value="setStyle('borderRadius', $event)"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import BaseColorPicker from '@/shared/components/base/BaseColorPicker.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import type { PageBlock } from '../types/page.types.ts'
import { sanitizeStyles } from '../utils/styleAllowlist.ts'

const props = withDefaults(defineProps<{ block: PageBlock; title?: string }>(), {
  title: 'Style',
})
const emit = defineEmits<{ patch: [patch: Partial<PageBlock>] }>()
const layoutOptions = [
  { label: 'Block', value: 'block' },
  { label: 'Flex', value: 'flex' },
  { label: 'Grid', value: 'grid' },
]

function setStyle(key: string, value: string | boolean) {
  emit('patch', {
    styles: sanitizeStyles({ ...(props.block.styles ?? {}), [key]: String(value) }),
  })
}
</script>

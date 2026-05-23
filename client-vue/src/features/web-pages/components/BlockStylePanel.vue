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
      <span>Direction</span>
      <BaseSelect
        :model-value="String(block.styles?.flexDirection ?? 'row')"
        :options="directionOptions"
        @update:model-value="setStyle('flexDirection', String($event))"
      />
    </label>
    <label class="web-page-style-row">
      <span>Align</span>
      <BaseSelect
        :model-value="String(block.styles?.alignItems ?? 'stretch')"
        :options="alignOptions"
        @update:model-value="setStyle('alignItems', String($event))"
      />
    </label>
    <label class="web-page-style-row">
      <span>Justify</span>
      <BaseSelect
        :model-value="String(block.styles?.justifyContent ?? 'flex-start')"
        :options="justifyOptions"
        @update:model-value="setStyle('justifyContent', String($event))"
      />
    </label>
    <label class="web-page-style-row">
      <span>Width</span>
      <BaseInput
        :model-value="String(block.styles?.width ?? '')"
        placeholder="auto, 100%, 320px"
        @update:model-value="setStyle('width', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Height</span>
      <BaseInput
        :model-value="String(block.styles?.height ?? '')"
        placeholder="auto, 240px"
        @update:model-value="setStyle('height', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Min Width</span>
      <BaseInput
        :model-value="String(block.styles?.minWidth ?? '')"
        placeholder="120px"
        @update:model-value="setStyle('minWidth', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Max Width</span>
      <BaseInput
        :model-value="String(block.styles?.maxWidth ?? '')"
        placeholder="960px"
        @update:model-value="setStyle('maxWidth', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Min Height</span>
      <BaseInput
        :model-value="String(block.styles?.minHeight ?? '')"
        placeholder="80px"
        @update:model-value="setStyle('minHeight', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Max Height</span>
      <BaseInput
        :model-value="String(block.styles?.maxHeight ?? '')"
        placeholder="640px"
        @update:model-value="setStyle('maxHeight', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Margin</span>
      <BaseInput
        :model-value="String(block.styles?.margin ?? '')"
        placeholder="0 auto, 16px"
        @update:model-value="setStyle('margin', $event)"
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
      <span>Font Size</span>
      <BaseInput
        :model-value="String(block.styles?.fontSize ?? '')"
        placeholder="16px"
        @update:model-value="setStyle('fontSize', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Font Weight</span>
      <BaseSelect
        :model-value="String(block.styles?.fontWeight ?? '')"
        :options="fontWeightOptions"
        @update:model-value="setStyle('fontWeight', String($event))"
      />
    </label>
    <label class="web-page-style-row">
      <span>Line Height</span>
      <BaseInput
        :model-value="String(block.styles?.lineHeight ?? '')"
        placeholder="1.5, 24px"
        @update:model-value="setStyle('lineHeight', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Text Align</span>
      <BaseSelect
        :model-value="String(block.styles?.textAlign ?? '')"
        :options="textAlignOptions"
        @update:model-value="setStyle('textAlign', String($event))"
      />
    </label>
    <label class="web-page-style-row">
      <span>Padding</span>
      <BaseInput
        :model-value="String(block.styles?.padding ?? '')"
        placeholder="16px, 12px 24px"
        @update:model-value="setStyle('padding', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Gap</span>
      <BaseInput
        :model-value="String(block.styles?.gap ?? '')"
        placeholder="12px"
        @update:model-value="setStyle('gap', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Border</span>
      <BaseInput
        :model-value="String(block.styles?.border ?? '')"
        placeholder="1px solid #ddd"
        @update:model-value="setStyle('border', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Radius</span>
      <BaseInput
        :model-value="String(block.styles?.borderRadius ?? '')"
        placeholder="8px"
        @update:model-value="setStyle('borderRadius', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Shadow</span>
      <BaseInput
        :model-value="String(block.styles?.boxShadow ?? '')"
        placeholder="0 8px 24px rgba(0,0,0,.12)"
        @update:model-value="setStyle('boxShadow', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Opacity</span>
      <BaseInput
        :model-value="String(block.styles?.opacity ?? '')"
        placeholder="0.8"
        @update:model-value="setStyle('opacity', $event)"
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
  { label: 'Inline Block', value: 'inline-block' },
  { label: 'Inline Flex', value: 'inline-flex' },
]
const directionOptions = [
  { label: 'Row', value: 'row' },
  { label: 'Column', value: 'column' },
  { label: 'Row Reverse', value: 'row-reverse' },
  { label: 'Column Reverse', value: 'column-reverse' },
]
const alignOptions = [
  { label: 'Stretch', value: 'stretch' },
  { label: 'Start', value: 'flex-start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'flex-end' },
]
const justifyOptions = [
  { label: 'Start', value: 'flex-start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'flex-end' },
  { label: 'Between', value: 'space-between' },
  { label: 'Around', value: 'space-around' },
]
const fontWeightOptions = [
  { label: 'Default', value: '' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
]
const textAlignOptions = [
  { label: 'Default', value: '' },
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'Justify', value: 'justify' },
]

function setStyle(key: string, value: string | boolean) {
  emit('patch', {
    styles: sanitizeStyles({ ...(props.block.styles ?? {}), [key]: String(value) }),
  })
}
</script>

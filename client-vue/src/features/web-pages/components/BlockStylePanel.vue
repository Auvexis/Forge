<template>
  <div class="web-page-inspector web-page-style-panel">
    <h4>{{ title }}</h4>
    <section class="web-page-style-section">
      <h5>Layout</h5>
      <label class="web-page-style-row">
        <span>Display</span>
        <BaseSelect :model-value="String(block.styles?.display ?? 'block')" :options="layoutOptions" @update:model-value="setStyle('display', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Direction</span>
        <BaseSelect :model-value="String(block.styles?.flexDirection ?? 'row')" :options="directionOptions" @update:model-value="setStyle('flexDirection', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Align</span>
        <BaseSelect :model-value="String(block.styles?.alignItems ?? 'stretch')" :options="alignOptions" @update:model-value="setStyle('alignItems', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Justify</span>
        <BaseSelect :model-value="String(block.styles?.justifyContent ?? 'flex-start')" :options="justifyOptions" @update:model-value="setStyle('justifyContent', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Overflow</span>
        <BaseSelect :model-value="String(block.styles?.overflow ?? '')" :options="overflowOptions" @update:model-value="setStyle('overflow', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Gap</span>
        <BaseInput :model-value="String(block.styles?.gap ?? '')" placeholder="12px" @update:model-value="setStyle('gap', $event)" />
      </label>
    </section>

    <section class="web-page-style-section">
      <h5>Spacing</h5>
      <label class="web-page-style-row">
        <span>Width</span>
        <BaseInput :model-value="String(block.styles?.width ?? '')" placeholder="auto, 100%, 320px" @update:model-value="setStyle('width', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Height</span>
        <BaseInput :model-value="String(block.styles?.height ?? '')" placeholder="auto, 240px" @update:model-value="setStyle('height', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Min Width</span>
        <BaseInput :model-value="String(block.styles?.minWidth ?? '')" placeholder="120px" @update:model-value="setStyle('minWidth', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Max Width</span>
        <BaseInput :model-value="String(block.styles?.maxWidth ?? '')" placeholder="960px" @update:model-value="setStyle('maxWidth', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Min Height</span>
        <BaseInput :model-value="String(block.styles?.minHeight ?? '')" placeholder="80px" @update:model-value="setStyle('minHeight', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Max Height</span>
        <BaseInput :model-value="String(block.styles?.maxHeight ?? '')" placeholder="640px" @update:model-value="setStyle('maxHeight', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Margin</span>
        <BaseInput :model-value="String(block.styles?.margin ?? '')" placeholder="0 auto, 16px" @update:model-value="setStyle('margin', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Padding</span>
        <BaseInput :model-value="String(block.styles?.padding ?? '')" placeholder="16px, 12px 24px" @update:model-value="setStyle('padding', $event)" />
      </label>
    </section>

    <section class="web-page-style-section">
      <h5>Typography</h5>
      <label class="web-page-style-row">
        <span>Text Color</span>
        <BaseColorPicker :model-value="String(block.styles?.color ?? '#111111')" :show-value="true" @update:model-value="setStyle('color', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Font Size</span>
        <BaseInput :model-value="String(block.styles?.fontSize ?? '')" placeholder="16px" @update:model-value="setStyle('fontSize', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Font Family</span>
        <BaseInput :model-value="String(block.styles?.fontFamily ?? '')" placeholder="Inter, Arial, sans-serif" @update:model-value="setStyle('fontFamily', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Font Weight</span>
        <BaseSelect :model-value="String(block.styles?.fontWeight ?? '')" :options="fontWeightOptions" @update:model-value="setStyle('fontWeight', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Line Height</span>
        <BaseInput :model-value="String(block.styles?.lineHeight ?? '')" placeholder="1.5, 24px" @update:model-value="setStyle('lineHeight', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Text Align</span>
        <BaseSelect :model-value="String(block.styles?.textAlign ?? '')" :options="textAlignOptions" @update:model-value="setStyle('textAlign', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Transform</span>
        <BaseSelect :model-value="String(block.styles?.textTransform ?? '')" :options="textTransformOptions" @update:model-value="setStyle('textTransform', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Letter Spacing</span>
        <BaseInput :model-value="String(block.styles?.letterSpacing ?? '')" placeholder="0.02em" @update:model-value="setStyle('letterSpacing', $event)" />
      </label>
    </section>

    <section class="web-page-style-section">
      <h5>Background</h5>
      <label class="web-page-style-row">
        <span>Color</span>
        <BaseColorPicker :model-value="String(block.styles?.backgroundColor ?? '#ffffff')" :show-value="true" @update:model-value="setStyle('backgroundColor', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Image</span>
        <BaseInput :model-value="String(block.styles?.backgroundImage ?? '')" placeholder="url(...)" @update:model-value="setStyle('backgroundImage', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Size</span>
        <BaseSelect :model-value="String(block.styles?.backgroundSize ?? '')" :options="backgroundSizeOptions" @update:model-value="setStyle('backgroundSize', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Position</span>
        <BaseInput :model-value="String(block.styles?.backgroundPosition ?? '')" placeholder="center" @update:model-value="setStyle('backgroundPosition', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Object Fit</span>
        <BaseSelect :model-value="String(block.styles?.objectFit ?? '')" :options="objectFitOptions" @update:model-value="setStyle('objectFit', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Object Position</span>
        <BaseInput :model-value="String(block.styles?.objectPosition ?? '')" placeholder="center" @update:model-value="setStyle('objectPosition', $event)" />
      </label>
    </section>

    <section class="web-page-style-section">
      <h5>Border</h5>
      <label class="web-page-style-row">
        <span>Border</span>
        <BaseInput :model-value="String(block.styles?.border ?? '')" placeholder="1px solid #ddd" @update:model-value="setStyle('border', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Width</span>
        <BaseInput :model-value="String(block.styles?.borderWidth ?? '')" placeholder="1px" @update:model-value="setStyle('borderWidth', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Style</span>
        <BaseSelect :model-value="String(block.styles?.borderStyle ?? '')" :options="borderStyleOptions" @update:model-value="setStyle('borderStyle', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Color</span>
        <BaseColorPicker :model-value="String(block.styles?.borderColor ?? '#dddddd')" :show-value="true" @update:model-value="setStyle('borderColor', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Radius</span>
        <BaseInput :model-value="String(block.styles?.borderRadius ?? '')" placeholder="8px" @update:model-value="setStyle('borderRadius', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Shadow</span>
        <BaseInput :model-value="String(block.styles?.boxShadow ?? '')" placeholder="0 8px 24px rgba(0,0,0,.12)" @update:model-value="setStyle('boxShadow', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Opacity</span>
        <BaseInput :model-value="String(block.styles?.opacity ?? '')" placeholder="0.8" @update:model-value="setStyle('opacity', $event)" />
      </label>
    </section>
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
const overflowOptions = [
  { label: 'Default', value: '' },
  { label: 'Visible', value: 'visible' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Auto', value: 'auto' },
  { label: 'Scroll', value: 'scroll' },
]
const textTransformOptions = [
  { label: 'Default', value: '' },
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Lowercase', value: 'lowercase' },
  { label: 'Capitalize', value: 'capitalize' },
]
const backgroundSizeOptions = [
  { label: 'Default', value: '' },
  { label: 'Auto', value: 'auto' },
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
]
const objectFitOptions = [
  { label: 'Default', value: '' },
  { label: 'Fill', value: 'fill' },
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
  { label: 'Scale Down', value: 'scale-down' },
]
const borderStyleOptions = [
  { label: 'Default', value: '' },
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'None', value: 'none' },
]

function setStyle(key: string, value: string | boolean) {
  emit('patch', {
    styles: sanitizeStyles({ ...(props.block.styles ?? {}), [key]: String(value) }),
  })
}
</script>

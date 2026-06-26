<template>
  <div class="web-page-inspector web-page-style-panel">
    <h4>{{ title }}</h4>
    <section class="web-page-style-section">
      <h5>Layout</h5>
      <label class="web-page-style-row">
        <span>Display</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.display ?? 'block')" :options="layoutOptions" @update:model-value="setStyle('display', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Direction</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.flexDirection ?? 'row')" :options="directionOptions" @update:model-value="setStyle('flexDirection', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Align</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.alignItems ?? 'stretch')" :options="alignOptions" @update:model-value="setStyle('alignItems', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Justify</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.justifyContent ?? 'flex-start')" :options="justifyOptions" @update:model-value="setStyle('justifyContent', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Overflow</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.overflow ?? '')" :options="overflowOptions" @update:model-value="setStyle('overflow', String($event))" />
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
        <span class="web-page-style-control">
          <BaseInput :model-value="String(block.styles?.width ?? '')" placeholder="auto, 100%, 320px" @update:model-value="setStyle('width', $event)" />
          <span class="web-page-style-unit-strip">
            <button
              v-for="unit in dimensionUnitOptions"
              :key="`width-${unit}`"
              type="button"
              @click="setStyleUnit('width', unit)"
            >
              {{ unit }}
            </button>
          </span>
        </span>
      </label>
      <label class="web-page-style-row">
        <span>Height</span>
        <span class="web-page-style-control">
          <BaseInput :model-value="String(block.styles?.height ?? '')" placeholder="auto, 240px" @update:model-value="setStyle('height', $event)" />
          <span class="web-page-style-unit-strip">
            <button
              v-for="unit in dimensionUnitOptions"
              :key="`height-${unit}`"
              type="button"
              @click="setStyleUnit('height', unit)"
            >
              {{ unit }}
            </button>
          </span>
        </span>
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
        <BaseInput
          :model-value="String(block.styles?.fontFamily ?? '')"
          placeholder="Inter, Arial, sans-serif"
          @update:model-value="setStyle('fontFamily', $event)"
          @drop.prevent="setDroppedFontFamily"
        />
      </label>
      <label class="web-page-style-row">
        <span>Font Weight</span>
        <BaseInput :model-value="String(block.styles?.fontWeight ?? '')" placeholder="400, 600, 700" @update:model-value="setStyle('fontWeight', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Line Height</span>
        <BaseInput :model-value="String(block.styles?.lineHeight ?? '')" placeholder="1.5, 24px" @update:model-value="setStyle('lineHeight', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Text Align</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.textAlign ?? '')" :options="textAlignOptions" @update:model-value="setStyle('textAlign', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Transform</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.textTransform ?? '')" :options="textTransformOptions" @update:model-value="setStyle('textTransform', String($event))" />
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
        <BaseSegmentedSelect :model-value="String(block.styles?.backgroundSize ?? '')" :options="backgroundSizeOptions" @update:model-value="setStyle('backgroundSize', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Position</span>
        <BaseInput :model-value="String(block.styles?.backgroundPosition ?? '')" placeholder="center" @update:model-value="setStyle('backgroundPosition', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Object Fit</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.objectFit ?? '')" :options="objectFitOptions" @update:model-value="setStyle('objectFit', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Object Position</span>
        <BaseInput :model-value="String(block.styles?.objectPosition ?? '')" placeholder="center" @update:model-value="setStyle('objectPosition', $event)" />
      </label>
    </section>

    <section class="web-page-style-section">
      <h5>Border</h5>
      <label class="web-page-style-row">
        <span>Width</span>
        <BaseInput :model-value="String(block.styles?.borderWidth ?? '')" placeholder="1px" @update:model-value="setStyle('borderWidth', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Style</span>
        <BaseSegmentedSelect :model-value="String(block.styles?.borderStyle ?? '')" :options="borderStyleOptions" @update:model-value="setStyle('borderStyle', String($event))" />
      </label>
      <label class="web-page-style-row">
        <span>Color</span>
        <BaseColorPicker :model-value="String(block.styles?.borderColor ?? '#dddddd')" :show-value="true" @update:model-value="setStyle('borderColor', $event)" />
      </label>
      <label class="web-page-style-row">
        <span>Radius</span>
        <BaseInput :model-value="String(block.styles?.borderRadius ?? '')" placeholder="8px" @update:model-value="setStyle('borderRadius', $event)" />
      </label>
      <div class="web-page-style-presets" aria-label="Radius presets">
        <button
          v-for="preset in radiusPresets"
          :key="preset.label"
          type="button"
          @click="applyStylePreset('borderRadius', preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>
      <label class="web-page-style-row">
        <span>Shadow</span>
        <BaseInput :model-value="String(block.styles?.boxShadow ?? '')" placeholder="0 8px 24px rgba(0,0,0,.12)" @update:model-value="setStyle('boxShadow', $event)" />
      </label>
      <div class="web-page-style-presets" aria-label="Shadow presets">
        <button
          v-for="preset in shadowPresets"
          :key="preset.label"
          type="button"
          @click="applyStylePreset('boxShadow', preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>
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
import BaseSegmentedSelect from '@/shared/components/base/BaseSegmentedSelect.vue'
import type { PageBlock } from '../types/page.types.ts'
import { sanitizeStyles } from '../utils/styleAllowlist.ts'

const props = withDefaults(defineProps<{ block: PageBlock; title?: string }>(), {
  title: 'Style',
})
const emit = defineEmits<{ patch: [patch: Partial<PageBlock>] }>()
const dimensionUnitOptions = ['px', '%', 'rem', 'auto']
const radiusPresets = [
  { label: '0', value: '0' },
  { label: '4', value: '4px' },
  { label: '8', value: '8px' },
  { label: 'Full', value: '999px' },
]
const shadowPresets = [
  { label: 'None', value: 'none' },
  { label: 'Soft', value: '0 8px 24px rgba(0,0,0,.12)' },
  { label: 'Lift', value: '0 16px 42px rgba(0,0,0,.18)' },
]
const layoutOptions = [
  { label: '', title: 'Block', value: 'block', icon: 'square' },
  { label: '', title: 'Flex', value: 'flex', icon: 'rows-3' },
  { label: '', title: 'Grid', value: 'grid', icon: 'grid-2x2' },
  { label: '', title: 'Inline Block', value: 'inline-block', icon: 'box' },
  { label: '', title: 'Inline Flex', value: 'inline-flex', icon: 'columns-3' },
]
const directionOptions = [
  { label: '', title: 'Row', value: 'row', icon: 'arrow-right' },
  { label: '', title: 'Column', value: 'column', icon: 'arrow-down' },
  { label: '', title: 'Row Reverse', value: 'row-reverse', icon: 'arrow-left' },
  { label: '', title: 'Column Reverse', value: 'column-reverse', icon: 'arrow-up' },
]
const alignOptions = [
  { label: '', title: 'Stretch', value: 'stretch', icon: 'move-horizontal' },
  { label: '', title: 'Start', value: 'flex-start', icon: 'align-start-horizontal' },
  { label: '', title: 'Center', value: 'center', icon: 'align-center-horizontal' },
  { label: '', title: 'End', value: 'flex-end', icon: 'align-end-horizontal' },
]
const justifyOptions = [
  { label: '', title: 'Start', value: 'flex-start', icon: 'align-start-vertical' },
  { label: '', title: 'Center', value: 'center', icon: 'align-center-vertical' },
  { label: '', title: 'End', value: 'flex-end', icon: 'align-end-vertical' },
  { label: '', title: 'Between', value: 'space-between', icon: 'between-horizontal-start' },
  { label: '', title: 'Around', value: 'space-around', icon: 'between-horizontal-end' },
]
const textAlignOptions = [
  { label: '', title: 'Default', value: '', icon: 'circle-slash' },
  { label: '', title: 'Left', value: 'left', icon: 'align-left' },
  { label: '', title: 'Center', value: 'center', icon: 'align-center' },
  { label: '', title: 'Right', value: 'right', icon: 'align-right' },
  { label: '', title: 'Justify', value: 'justify', icon: 'align-justify' },
]
const overflowOptions = [
  { label: '', title: 'Default', value: '', icon: 'circle-slash' },
  { label: '', title: 'Visible', value: 'visible', icon: 'eye' },
  { label: '', title: 'Hidden', value: 'hidden', icon: 'eye-off' },
  { label: '', title: 'Auto', value: 'auto', icon: 'wand-sparkles' },
  { label: '', title: 'Scroll', value: 'scroll', icon: 'scroll' },
]
const textTransformOptions = [
  { label: '', title: 'Default', value: '', icon: 'circle-slash' },
  { label: '', title: 'None', value: 'none', icon: 'type' },
  { label: '', title: 'Uppercase', value: 'uppercase', icon: 'case-upper' },
  { label: '', title: 'Lowercase', value: 'lowercase', icon: 'case-lower' },
  { label: '', title: 'Capitalize', value: 'capitalize', icon: 'case-sensitive' },
]
const backgroundSizeOptions = [
  { label: '', title: 'Default', value: '', icon: 'circle-slash' },
  { label: '', title: 'Auto', value: 'auto', icon: 'wand-sparkles' },
  { label: '', title: 'Cover', value: 'cover', icon: 'scan' },
  { label: '', title: 'Contain', value: 'contain', icon: 'minimize' },
]
const objectFitOptions = [
  { label: '', title: 'Default', value: '', icon: 'circle-slash' },
  { label: '', title: 'Fill', value: 'fill', icon: 'maximize' },
  { label: '', title: 'Cover', value: 'cover', icon: 'scan' },
  { label: '', title: 'Contain', value: 'contain', icon: 'minimize' },
  { label: '', title: 'Scale Down', value: 'scale-down', icon: 'shrink' },
]
const borderStyleOptions = [
  { label: '', title: 'Default', value: '', icon: 'circle-slash' },
  { label: '', title: 'Solid', value: 'solid', icon: 'minus' },
  { label: '', title: 'Dashed', value: 'dashed', icon: 'ellipsis' },
  { label: '', title: 'Dotted', value: 'dotted', icon: 'more-horizontal' },
  { label: '', title: 'None', value: 'none', icon: 'x' },
]

function setStyle(key: string, value: string | boolean) {
  emit('patch', {
    styles: sanitizeStyles({ [key]: String(value) }),
  })
}

function setStyleUnit(key: string, unit: string) {
  if (unit === 'auto') {
    setStyle(key, 'auto')
    return
  }
  const current = String(props.block.styles?.[key] ?? '')
  const numeric = current.match(/-?\d+(\.\d+)?/)?.[0] ?? '0'
  setStyle(key, `${numeric}${unit}`)
}

function applyStylePreset(key: string, value: string) {
  setStyle(key, value)
}

function setDroppedFontFamily(event: DragEvent) {
  const path = event.dataTransfer?.getData('application/x-sailor-page-asset')
    || event.dataTransfer?.getData('text/plain')
    || ''
  if (path) setStyle('fontFamily', path)
}
</script>

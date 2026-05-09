<template>
  <div class="form-theme-menu-field">
    <span class="te-label">Form Theme</span>
    <button type="button" class="ftm-open-btn" @click="isOpen = true">
      <span class="ftm-open-preview" :style="themeSwatchStyle"></span>
      <span>
        <strong>{{ activeThemeLabel }}</strong>
        <small>Customize layout, colors, fields and buttons</small>
      </span>
    </button>
  </div>

  <BaseMiniMenu
    :is-open="isOpen"
    title="Form Theme"
    icon="palette"
    max-width="1580px"
    max-height="88vh"
    @close="isOpen = false"
  >
    <div class="ftm-menu">
      <div class="ftm-preview" :class="previewClasses" :style="previewStyle">
        <div class="ftm-preview-card" :style="previewCardStyle">
          <span class="ftm-preview-badge">Preview</span>
          <h3 :style="previewTitleStyle">{{ title || 'Contact us' }}</h3>
          <p :style="previewSubtitleStyle">
            {{ description || 'This is how your public form will feel.' }}
          </p>
          <div class="ftm-preview-input" :style="previewInputStyle">Email</div>
          <div class="ftm-preview-input" :style="previewInputStyle">Message</div>
          <button type="button" class="ftm-preview-button" :style="previewButtonStyle">
            Submit
          </button>
        </div>
      </div>

      <div class="ftm-controls">
        <!-- Presets -->
        <div class="ftm-preset-list">
          <BasePresetCard
            v-for="preset in FORM_THEME_PRESET_CARDS"
            :key="preset.value"
            :label="preset.label"
            :description="preset.description"
            :swatch="preset.swatch"
            :active="(modelValue.preset || 'social-media') === preset.value"
            @click="applyPreset(preset.value)"
          />
        </div>

        <!-- Layout & Background -->
        <div class="ftm-section">
          <span class="ftm-section-title">Layout & Background</span>
          <div class="ftm-row">
            <span class="ftm-row-label">Layout</span>
            <div class="ftm-row-control">
              <BaseSelect
                :model-value="modelValue.layout || 'floating'"
                :options="FORM_THEME_LAYOUTS"
                @update:model-value="updateTheme({ layout: $event as FormTheme['layout'] })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Background Type</span>
            <div class="ftm-row-control">
              <BaseSelect
                :model-value="modelValue.background?.type || 'gradient'"
                :options="FORM_BACKGROUND_TYPES"
                @update:model-value="
                  updateSection('background', {
                    type: $event as NonNullable<FormTheme['background']>['type'],
                  })
                "
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Background Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.background?.color || '#0b0d12'"
                show-value
                @update:model-value="updateSection('background', { color: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Gradient CSS</span>
            <div class="ftm-row-control">
              <BaseInput
                :model-value="modelValue.background?.gradient || ''"
                @update:model-value="updateSection('background', { gradient: $event as string })"
                placeholder="linear-gradient(135deg, #0b0d12 0%, #111827 100%)"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Image URL</span>
            <div class="ftm-row-control">
              <BaseInput
                :model-value="modelValue.background?.imageUrl || ''"
                @update:model-value="updateSection('background', { imageUrl: $event as string })"
                placeholder="https://example.com/background.jpg"
              />
            </div>
          </div>
        </div>

        <!-- Container -->
        <div class="ftm-section">
          <span class="ftm-section-title">Container</span>
          <div class="ftm-row">
            <span class="ftm-row-label">Background</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.container?.backgroundColor || '#141821'"
                show-value
                @update:model-value="updateSection('container', { backgroundColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Border Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.container?.borderColor || '#1f2430'"
                show-value
                @update:model-value="updateSection('container', { borderColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Corner Radius</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseInput
                type="number"
                style="width: 80px"
                :model-value="String(modelValue.container?.radius ?? 12)"
                @update:model-value="updateNumber('container', 'radius', $event)"
              />
            </div>
          </div>
        </div>

        <!-- Typography -->
        <div class="ftm-section">
          <span class="ftm-section-title">Typography</span>
          <div class="ftm-row">
            <span class="ftm-row-label">Title Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.typography?.titleColor || '#e7e9ee'"
                show-value
                @update:model-value="updateSection('typography', { titleColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Subtitle Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.typography?.subtitleColor || '#9ba3b3'"
                show-value
                @update:model-value="updateSection('typography', { subtitleColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Title Font</span>
            <div class="ftm-row-control">
              <BaseInput
                :model-value="modelValue.typography?.titleFontFamily || ''"
                @update:model-value="
                  updateSection('typography', { titleFontFamily: $event as string })
                "
                placeholder="Inter, system-ui, sans-serif"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Subtitle Font</span>
            <div class="ftm-row-control">
              <BaseInput
                :model-value="modelValue.typography?.subtitleFontFamily || ''"
                @update:model-value="
                  updateSection('typography', { subtitleFontFamily: $event as string })
                "
                placeholder="Inter, system-ui, sans-serif"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Input Font</span>
            <div class="ftm-row-control">
              <BaseInput
                :model-value="modelValue.typography?.inputFontFamily || ''"
                @update:model-value="
                  updateSection('typography', { inputFontFamily: $event as string })
                "
                placeholder="Inter, system-ui, sans-serif"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Button Font</span>
            <div class="ftm-row-control">
              <BaseInput
                :model-value="modelValue.typography?.buttonFontFamily || ''"
                @update:model-value="
                  updateSection('typography', { buttonFontFamily: $event as string })
                "
                placeholder="Inter, system-ui, sans-serif"
              />
            </div>
          </div>
        </div>

        <!-- Fields -->
        <div class="ftm-section">
          <span class="ftm-section-title">Fields</span>
          <div class="ftm-row">
            <span class="ftm-row-label">Background</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.fields?.backgroundColor || '#0b0d12'"
                show-value
                @update:model-value="updateSection('fields', { backgroundColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Text Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.fields?.textColor || '#e7e9ee'"
                show-value
                @update:model-value="updateSection('fields', { textColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Border Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.fields?.borderColor || '#2a3142'"
                show-value
                @update:model-value="updateSection('fields', { borderColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Focus Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.fields?.focusColor || '#7c3aed'"
                show-value
                @update:model-value="updateSection('fields', { focusColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Shape</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseSelect
                style="width: 130px"
                :model-value="modelValue.fields?.shape || 'medium'"
                :options="FORM_FIELD_SHAPES"
                @update:model-value="
                  updateSection('fields', {
                    shape: $event as NonNullable<FormTheme['fields']>['shape'],
                  })
                "
              />
            </div>
          </div>
        </div>

        <!-- Button -->
        <div class="ftm-section">
          <span class="ftm-section-title">Button</span>
          <div class="ftm-row">
            <span class="ftm-row-label">Background</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.button?.backgroundColor || '#7c3aed'"
                show-value
                @update:model-value="updateSection('button', { backgroundColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Text Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.button?.textColor || '#ffffff'"
                show-value
                @update:model-value="updateSection('button', { textColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Border Color</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseColorPicker
                :model-value="modelValue.button?.borderColor || '#7c3aed'"
                show-value
                @update:model-value="updateSection('button', { borderColor: $event })"
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Width</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseSelect
                style="width: 130px"
                :model-value="modelValue.button?.width || 'full'"
                :options="FORM_BUTTON_WIDTHS"
                @update:model-value="
                  updateSection('button', {
                    width: $event as NonNullable<FormTheme['button']>['width'],
                  })
                "
              />
            </div>
          </div>
          <div class="ftm-row">
            <span class="ftm-row-label">Shape</span>
            <div class="ftm-row-control ftm-row-control--right">
              <BaseSelect
                style="width: 130px"
                :model-value="modelValue.button?.shape || 'medium'"
                :options="FORM_BUTTON_SHAPES"
                @update:model-value="
                  updateSection('button', {
                    shape: $event as NonNullable<FormTheme['button']>['shape'],
                  })
                "
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseMiniMenu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormTheme } from '@/core/types/workflow.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseColorPicker from '@/shared/components/base/BaseColorPicker.vue'
import BasePresetCard from '@/shared/components/base/BasePresetCard.vue'
import BaseMiniMenu from '@/shared/components/base/BaseMiniMenu.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: FormTheme
    title?: string
    description?: string
  }>(),
  {
    modelValue: () => ({}),
    title: '',
    description: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [theme: FormTheme]
}>()

const isOpen = ref(false)

const FORM_THEME_PRESET_CARDS = [
  {
    value: 'custom',
    label: 'Custom',
    description: 'Create your own theme.',
    swatch: 'linear-gradient(135deg, #1f2937, #4b5563)',
  },
  {
    value: 'social-media',
    label: 'Social Media',
    description: 'Perfect for social media campaigns.',
    swatch: 'linear-gradient(162deg,rgba(196, 87, 255, 1) 0%, rgba(255, 0, 0, 1) 100%)',
  },
  {
    value: 'minimal-flat',
    label: 'Minimal Flat',
    description: 'Clean, light and squared layout.',
    swatch: 'linear-gradient(135deg, #f8fafc, #111827)',
  },
  {
    value: 'google-forms',
    label: 'Google Forms',
    description: 'Soft purple page with centered form.',
    swatch: 'linear-gradient(135deg, #f0ebf8, #673ab7)',
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'High contrast dark neon style.',
    swatch: 'linear-gradient(135deg, #09090b, #06b6d4)',
  },
  {
    value: 'ocean-breeze',
    label: 'Ocean Breeze',
    description: 'Relaxing light blue gradients.',
    swatch: 'linear-gradient(135deg, #e0f2fe, #0284c7)',
  },
  {
    value: 'sunset',
    label: 'Sunset',
    description: 'Warm colors with rounded shapes.',
    swatch: 'linear-gradient(135deg, #ffedd5, #ea580c)',
  },
  {
    value: 'forest',
    label: 'Forest',
    description: 'Earthy greens and soft layout.',
    swatch: 'linear-gradient(135deg, #dcfce7, #166534)',
  },
  {
    value: 'glass',
    label: 'Glassmorphism',
    description: 'Translucent floating dark glassy card.',
    swatch: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.8))',
  },
] as const

const FORM_THEME_LAYOUTS = [
  { value: 'floating', label: 'Floating', icon: 'panel-top' },
  { value: 'flat', label: 'Flat', icon: 'minus' },
  { value: 'full-width', label: 'Full Width', icon: 'maximize' },
  { value: 'centered', label: 'Centered', icon: 'align-center' },
]

const FORM_BACKGROUND_TYPES = [
  { value: 'solid', label: 'Solid', icon: 'square' },
  { value: 'gradient', label: 'Gradient', icon: 'palette' },
  { value: 'image', label: 'Image', icon: 'image' },
]

const FORM_BUTTON_WIDTHS = [
  { value: 'auto', label: 'Auto', icon: 'minimize' },
  { value: 'full', label: 'Full', icon: 'maximize' },
]

const FORM_BUTTON_SHAPES = [
  { value: 'square', label: 'Square', icon: 'square' },
  { value: 'medium', label: 'Medium', icon: 'box' },
  { value: 'pill', label: 'Pill', icon: 'pill' },
]

const FORM_FIELD_SHAPES = FORM_BUTTON_SHAPES

const presetDefaults = {
  custom: {
    preset: 'custom',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#0b0d12',
      gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    },
    container: {
      backgroundColor: '#141821',
      borderColor: '#374151',
      borderWidth: 1,
      radius: 12,
      shadow: 'lg',
      maxWidth: 560,
      padding: 28,
    },
    button: {
      width: 'full',
      shape: 'medium',
      backgroundColor: '#374151',
      textColor: '#ffffff',
      borderColor: '#374151',
      hoverBackgroundColor: '#4b5563',
    },
    fields: {
      backgroundColor: '#0b0d12',
      textColor: '#e7e9ee',
      borderColor: '#374151',
      focusColor: '#4b5563',
      radius: 8,
      shape: 'medium',
      spacing: 16,
    },
    typography: {
      fontFamily: 'var(--nod8-font-sans)',
      titleFontFamily: 'var(--nod8-font-sans)',
      subtitleFontFamily: 'var(--nod8-font-sans)',
      buttonFontFamily: 'var(--nod8-font-sans)',
      inputFontFamily: 'var(--nod8-font-sans)',
      titleColor: '#e7e9ee',
      subtitleColor: '#9ba3b3',
      baseSize: 14,
      weight: 500,
    },
  },
  'social-media': {
    preset: 'social-media',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#0b0d12',
      gradient: 'linear-gradient(162deg,rgba(196, 87, 255, 1) 0%, rgba(255, 0, 0, 1) 100%)',
    },
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0.51)',
      borderColor: 'rgba(0, 0, 0, 0)',
      borderWidth: 1,
      radius: 17,
      shadow: 'lg',
      maxWidth: 560,
      padding: 28,
    },
    button: {
      width: 'full',
      shape: 'medium',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      textColor: '#000000',
      borderColor: 'transparent',
      hoverBackgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    fields: {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      textColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      focusColor: 'rgba(255, 255, 255, 0.15)',
      radius: 8,
      shape: 'medium',
      spacing: 16,
    },
    typography: {
      fontFamily: 'var(--nod8-font-sans)',
      titleFontFamily: 'var(--nod8-font-sans)',
      subtitleFontFamily: 'var(--nod8-font-sans)',
      buttonFontFamily: 'var(--nod8-font-sans)',
      inputFontFamily: 'var(--nod8-font-sans)',
      titleColor: '#ffffff',
      subtitleColor: 'rgba(255, 255, 255, 0.7)',
      baseSize: 14,
      weight: 500,
    },
  },
  'minimal-flat': {
    preset: 'minimal-flat',
    layout: 'floating',
    background: { type: 'solid', color: '#f8fafc' },
    container: {
      backgroundColor: '#ffffff',
      borderColor: '#dbe3ef',
      borderWidth: 1,
      radius: 0,
      shadow: 'none',
      maxWidth: 720,
      padding: 32,
    },
    button: {
      width: 'auto',
      shape: 'square',
      backgroundColor: '#111827',
      textColor: '#ffffff',
      borderColor: '#111827',
      hoverBackgroundColor: '#374151',
    },
    fields: {
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderColor: '#cbd5e1',
      focusColor: '#2563eb',
      radius: 4,
      shape: 'square',
      spacing: 18,
    },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      titleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      subtitleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      buttonFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      inputFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      titleColor: '#111827',
      subtitleColor: '#475569',
      baseSize: 15,
      weight: 500,
    },
  },
  'google-forms': {
    preset: 'google-forms',
    layout: 'floating',
    background: { type: 'solid', color: '#f0ebf8' },
    container: {
      backgroundColor: '#ffffff',
      borderColor: '#dadce0',
      borderWidth: 1,
      radius: 8,
      shadow: 'sm',
      maxWidth: 640,
      padding: 24,
    },
    button: {
      width: 'auto',
      shape: 'medium',
      backgroundColor: '#673ab7',
      textColor: '#ffffff',
      borderColor: '#673ab7',
      hoverBackgroundColor: '#5e35b1',
    },
    fields: {
      backgroundColor: '#ffffff',
      textColor: '#202124',
      borderColor: '#dadce0',
      focusColor: '#673ab7',
      radius: 4,
      shape: 'medium',
      spacing: 20,
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
      titleFontFamily: 'Roboto, Arial, sans-serif',
      subtitleFontFamily: 'Roboto, Arial, sans-serif',
      buttonFontFamily: 'Roboto, Arial, sans-serif',
      inputFontFamily: 'Roboto, Arial, sans-serif',
      titleColor: '#202124',
      subtitleColor: '#5f6368',
      baseSize: 14,
      weight: 400,
    },
  },
  cyberpunk: {
    preset: 'cyberpunk',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#0f172a',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #0ea5e9 100%)',
    },
    container: {
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      borderColor: 'rgba(125, 211, 252, 0.18)',
      borderWidth: 1,
      radius: 16,
      shadow: 'lg',
      maxWidth: 560,
      padding: 28,
    },
    button: {
      width: 'full',
      shape: 'medium',
      backgroundColor: '#38bdf8',
      textColor: '#0f172a',
      borderColor: 'rgba(125, 211, 252, 0.25)',
      hoverBackgroundColor: '#0ea5e9',
    },
    fields: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      textColor: '#e2e8f0',
      borderColor: 'rgba(148, 163, 184, 0.12)',
      focusColor: '#38bdf8',
      radius: 10,
      shape: 'square',
      spacing: 16,
    },
    typography: {
      fontFamily: '"Space Grotesk", sans-serif',
      titleFontFamily: '"Space Grotesk", sans-serif',
      subtitleFontFamily: '"Space Grotesk", sans-serif',
      buttonFontFamily: '"Space Grotesk", sans-serif',
      inputFontFamily: '"Space Grotesk", sans-serif',
      titleColor: '#7dd3fc',
      subtitleColor: '#94a3b8',
      baseSize: 14,
      weight: 500,
    },
  },
  'ocean-breeze': {
    preset: 'ocean-breeze',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#e0f2fe',
      gradient: 'linear-gradient(135deg, #e0f2fe 0%, #0284c7 100%)',
    },
    container: {
      backgroundColor: '#ffffff',
      borderColor: '#bae6fd',
      borderWidth: 1,
      radius: 16,
      shadow: 'md',
      maxWidth: 600,
      padding: 32,
    },
    button: {
      width: 'full',
      shape: 'pill',
      backgroundColor: '#0284c7',
      textColor: '#ffffff',
      borderColor: '#0284c7',
      hoverBackgroundColor: '#0369a1',
    },
    fields: {
      backgroundColor: '#f0f9ff',
      textColor: '#0f172a',
      borderColor: '#e0f2fe',
      focusColor: '#0284c7',
      radius: 12,
      shape: 'pill',
      spacing: 16,
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      titleFontFamily: 'Inter, sans-serif',
      subtitleFontFamily: 'Inter, sans-serif',
      buttonFontFamily: 'Inter, sans-serif',
      inputFontFamily: 'Inter, sans-serif',
      titleColor: '#0c4a6e',
      subtitleColor: '#475569',
      baseSize: 15,
      weight: 500,
    },
  },
  sunset: {
    preset: 'sunset',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#fff1e6',
      gradient: 'linear-gradient(135deg, #fff1e6 0%, #fb923c 55%, #f97316 100%)',
    },
    container: {
      backgroundColor: 'rgba(255, 255, 255, 0.72)',
      borderColor: 'rgba(255, 255, 255, 0.28)',
      borderWidth: 1,
      radius: 28,
      shadow: 'lg',
      maxWidth: 580,
      padding: 36,
    },
    button: {
      width: 'auto',
      shape: 'pill',
      backgroundColor: '#f97316',
      textColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.18)',
      hoverBackgroundColor: '#ea580c',
    },
    fields: {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      textColor: '#431407',
      borderColor: 'rgba(251, 146, 60, 0.18)',
      focusColor: '#f97316',
      radius: 14,
      shape: 'medium',
      spacing: 20,
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      titleFontFamily: 'Inter, system-ui, sans-serif',
      subtitleFontFamily: 'Inter, system-ui, sans-serif',
      buttonFontFamily: 'Inter, system-ui, sans-serif',
      inputFontFamily: 'Inter, system-ui, sans-serif',
      titleColor: '#9a3412',
      subtitleColor: '#7c2d12',
      baseSize: 16,
      weight: 600,
    },
  },
  forest: {
    preset: 'forest',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#dff7e7',
      gradient: 'linear-gradient(135deg, #dff7e7 0%, #2f6b45 100%)',
    },
    container: {
      backgroundColor: 'rgba(255, 255, 255, 0.75)',
      borderColor: 'rgba(187, 247, 208, 0.4)',
      borderWidth: 1,
      radius: 12,
      shadow: 'md',
      maxWidth: 540,
      padding: 24,
    },
    button: {
      width: 'full',
      shape: 'medium',
      backgroundColor: '#2f6b45',
      textColor: '#ffffff',
      borderColor: '#2f6b45',
      hoverBackgroundColor: '#245336',
    },
    fields: {
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      textColor: '#1f3b2d',
      borderColor: 'rgba(187, 247, 208, 0.5)',
      focusColor: '#2f6b45',
      radius: 8,
      shape: 'square',
      spacing: 16,
    },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      titleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      subtitleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      buttonFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      inputFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      titleColor: '#163020',
      subtitleColor: '#3f5f4a',
      baseSize: 14,
      weight: 400,
    },
  },
  glass: {
    preset: 'glass',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#989898',
      gradient: 'linear-gradient(135deg, #989898 0%, #565656 45%, #000000 100%)',
    },
    container: {
      backgroundColor: 'rgba(20, 24, 33, 0.45)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      radius: 16,
      shadow: 'lg',
      maxWidth: 560,
      padding: 32,
    },
    button: {
      width: 'full',
      shape: 'medium',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      textColor: '#000000',
      borderColor: 'transparent',
      hoverBackgroundColor: '#ffffff',
    },
    fields: {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      textColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      focusColor: 'rgba(255, 255, 255, 0.5)',
      radius: 8,
      shape: 'medium',
      spacing: 16,
    },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      titleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      subtitleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      buttonFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      inputFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      titleColor: '#ffffff',
      subtitleColor: 'rgba(255, 255, 255, 0.7)',
      baseSize: 14,
      weight: 500,
    },
  },
} as Record<NonNullable<FormTheme['preset']>, FormTheme>

const activeTheme = computed<FormTheme>(() => {
  const preset = props.modelValue.preset ?? 'social-media'
  const defaults = presetDefaults[preset] || presetDefaults['social-media']
  return {
    ...defaults,
    ...props.modelValue,
    background: { ...defaults.background, ...props.modelValue.background },
    container: { ...defaults.container, ...props.modelValue.container },
    button: { ...defaults.button, ...props.modelValue.button },
    fields: { ...defaults.fields, ...props.modelValue.fields },
    typography: { ...defaults.typography, ...props.modelValue.typography },
  }
})

const activeThemeLabel = computed(() => {
  const preset = props.modelValue.preset ?? 'social-media'
  return FORM_THEME_PRESET_CARDS.find((item) => item.value === preset)?.label ?? 'Default Floating'
})

const backgroundValue = computed(() => {
  const background = activeTheme.value.background
  if (background?.type === 'image' && background.imageUrl) {
    return `linear-gradient(rgba(11, 13, 18, 0.35), rgba(11, 13, 18, 0.35)), url("${background.imageUrl}") center / cover no-repeat`
  }
  if (background?.type === 'gradient' && background.gradient) return background.gradient
  return background?.color ?? '#0b0d12'
})

const themeSwatchStyle = computed(() => ({ background: backgroundValue.value }))
const previewStyle = computed(() => ({ background: backgroundValue.value }))
const previewClasses = computed(() => [`ftm-preview--${activeTheme.value.layout ?? 'floating'}`])
const previewCardStyle = computed(() => ({
  background: activeTheme.value.container?.backgroundColor,
  borderColor: activeTheme.value.container?.borderColor,
  borderRadius: `${activeTheme.value.container?.radius ?? 12}px`,
}))
const previewTitleStyle = computed(() => ({
  color: activeTheme.value.typography?.titleColor,
  fontFamily:
    activeTheme.value.typography?.titleFontFamily ?? activeTheme.value.typography?.fontFamily,
}))
const previewSubtitleStyle = computed(() => ({
  color: activeTheme.value.typography?.subtitleColor,
  fontFamily:
    activeTheme.value.typography?.subtitleFontFamily ?? activeTheme.value.typography?.fontFamily,
}))
const previewInputStyle = computed(() => ({
  background: activeTheme.value.fields?.backgroundColor,
  borderColor: activeTheme.value.fields?.borderColor,
  borderRadius:
    activeTheme.value.fields?.shape === 'pill'
      ? '999px'
      : activeTheme.value.fields?.shape === 'square'
        ? '0'
        : `${activeTheme.value.fields?.radius ?? 8}px`,
  color: activeTheme.value.fields?.textColor,
  fontFamily:
    activeTheme.value.typography?.inputFontFamily ?? activeTheme.value.typography?.fontFamily,
}))
const previewButtonStyle = computed(() => ({
  width: activeTheme.value.button?.width === 'full' ? '100%' : 'fit-content',
  background: activeTheme.value.button?.backgroundColor,
  borderColor: activeTheme.value.button?.borderColor,
  borderRadius:
    activeTheme.value.button?.shape === 'pill'
      ? '999px'
      : activeTheme.value.button?.shape === 'square'
        ? '0'
        : '8px',
  color: activeTheme.value.button?.textColor,
  fontFamily:
    activeTheme.value.typography?.buttonFontFamily ?? activeTheme.value.typography?.fontFamily,
}))

const CUSTOM_THEME_KEY = 'nod8_custom_form_theme'

function saveCustomTheme(theme: FormTheme) {
  try {
    sessionStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(theme))
  } catch (e) {}
}

function updateTheme(updates: Partial<FormTheme>) {
  const newTheme: FormTheme = {
    ...props.modelValue,
    ...updates,
    preset: 'custom',
  }
  saveCustomTheme(newTheme)
  emit('update:modelValue', newTheme)
}

function applyPreset(preset: NonNullable<FormTheme['preset']>) {
  if (preset === 'custom') {
    try {
      const saved = sessionStorage.getItem(CUSTOM_THEME_KEY)
      if (saved) {
        emit('update:modelValue', JSON.parse(saved))
        return
      }
    } catch (e) {}

    // Fallback if no custom theme was saved yet
    const newTheme: FormTheme = { ...props.modelValue, preset: 'custom' }
    saveCustomTheme(newTheme)
    emit('update:modelValue', newTheme)
    return
  }

  emit('update:modelValue', presetDefaults[preset as keyof typeof presetDefaults])
}

function updateSection<K extends keyof FormTheme>(
  section: K,
  updates: Partial<NonNullable<FormTheme[K]>>,
) {
  const currentSection = props.modelValue[section]
  const newTheme: FormTheme = {
    ...props.modelValue,
    preset: 'custom',
    [section]: {
      ...(typeof currentSection === 'object' && currentSection ? currentSection : {}),
      ...updates,
    },
  }
  saveCustomTheme(newTheme)
  emit('update:modelValue', newTheme)
}

function updateNumber<K extends 'container' | 'typography' | 'fields'>(
  section: K,
  key: keyof NonNullable<FormTheme[K]>,
  value: unknown,
) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return
  updateSection(section, { [key]: parsed } as Partial<NonNullable<FormTheme[K]>>)
}
</script>

<style scoped>
.form-theme-menu-field,
.ftm-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ftm-open-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  background: var(--nod8-bg-surface);
  color: var(--nod8-text-primary);
  text-align: left;
  cursor: pointer;
}

.ftm-open-btn:hover {
  border-color: var(--nod8-border-strong);
}

.ftm-open-preview {
  width: 44px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.ftm-open-btn strong,
.ftm-preset-card strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.ftm-open-btn small,
.ftm-preset-card small {
  display: block;
  margin-top: 2px;
  color: var(--nod8-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.ftm-menu {
  height: min(680px, calc(88vh - 112px));
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.35fr);
  gap: 16px;
  min-height: 0;
}

.ftm-preview {
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  overflow: hidden;
}

.ftm-preview--flat {
  place-items: start center;
}

.ftm-preview--full-width {
  place-items: stretch;
  padding: 0;
}

.ftm-preview--centered {
  align-content: start;
  padding-top: 28px;
}

.ftm-preview--floating {
  place-items: center;
}

.ftm-preview-card {
  width: min(100%, 340px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border: 1px solid;
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.22);
}

.ftm-preview--full-width .ftm-preview-card {
  width: 100%;
  min-height: 100%;
  border-radius: 0 !important;
}

.ftm-preview-badge {
  width: fit-content;
  padding: 3px 7px;
  border-radius: var(--nod8-radius-sm);
  background: rgba(124, 58, 237, 0.12);
  color: var(--nod8-accent);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.ftm-preview-card h3 {
  margin: 0;
  color: var(--nod8-text-primary);
  font-size: 20px;
}

.ftm-preview-card p {
  margin: 0;
  color: var(--nod8-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.ftm-preview-input {
  padding: 9px 10px;
  border: 1px solid;
  font-size: 12px;
}

.ftm-preview-button {
  padding: 10px 14px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 700;
}

.ftm-controls {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overflow-x: visible;
  padding-right: 4px;
}

/* Preset cards */
.ftm-preset-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

/* Sections */
.ftm-section {
  border-radius: var(--nod8-radius-md);
}

.ftm-section-title {
  display: block;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--nod8-text-primary);
  background: var(--nod8-bg-base);
}

/* Rows — label left, control right */
.ftm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  min-height: 38px;
}

.ftm-row-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--nod8-text-secondary);
  flex-shrink: 0;
}

.ftm-row-control {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
  max-width: 220px;
}

.ftm-row-control--right {
  flex: 0 0 auto;
  max-width: none;
}

/* Compact native color picker */
.ftm-color {
  width: 36px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-surface);
  cursor: pointer;
}

.ftm-color:hover {
  border-color: var(--nod8-accent);
}

@media (max-width: 820px) {
  .ftm-menu,
  .ftm-preset-list {
    grid-template-columns: 1fr;
  }
}
</style>

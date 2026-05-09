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
    max-width="1080px"
    max-height="88vh"
    @close="isOpen = false"
  >
    <div class="ftm-menu">
      <div class="ftm-preview" :class="previewClasses" :style="previewStyle">
        <div class="ftm-preview-card" :style="previewCardStyle">
          <span class="ftm-preview-badge">Preview</span>
          <h3 :style="previewTitleStyle">{{ title || 'Contact us' }}</h3>
          <p :style="previewSubtitleStyle">{{ description || 'This is how your public form will feel.' }}</p>
          <div class="ftm-preview-input" :style="previewInputStyle">Email</div>
          <div class="ftm-preview-input" :style="previewInputStyle">Message</div>
          <button type="button" class="ftm-preview-button" :style="previewButtonStyle">Submit</button>
        </div>
      </div>

      <div class="ftm-controls">
        <div class="ftm-preset-list">
          <button
            v-for="preset in FORM_THEME_PRESET_CARDS"
            :key="preset.value"
            type="button"
            class="ftm-preset-card"
            :class="{ 'ftm-preset-card--active': (modelValue.preset || 'default-floating') === preset.value }"
            @click="applyPreset(preset.value)"
          >
            <span class="ftm-preset-chip" :style="{ background: preset.swatch }"></span>
            <span>
              <strong>{{ preset.label }}</strong>
              <small>{{ preset.description }}</small>
            </span>
          </button>
        </div>

        <div class="ftm-grid">
          <div class="ftm-field">
            <span class="te-label">Layout</span>
            <BaseSelect
              :model-value="modelValue.layout || 'floating'"
              :options="FORM_THEME_LAYOUTS"
              @update:model-value="updateTheme({ layout: $event as FormTheme['layout'] })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Background Type</span>
            <BaseSelect
              :model-value="modelValue.background?.type || 'gradient'"
              :options="FORM_BACKGROUND_TYPES"
              @update:model-value="updateSection('background', { type: $event as NonNullable<FormTheme['background']>['type'] })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Background Color</span>
            <BaseInput
              type="color"
              :model-value="modelValue.background?.color || '#0b0d12'"
              @update:model-value="updateSection('background', { color: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Container Background</span>
            <BaseInput
              type="color"
              :model-value="modelValue.container?.backgroundColor || '#141821'"
              @update:model-value="updateSection('container', { backgroundColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Container Border</span>
            <BaseInput
              type="color"
              :model-value="modelValue.container?.borderColor || '#1f2430'"
              @update:model-value="updateSection('container', { borderColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Radius</span>
            <BaseInput
              type="number"
              :model-value="String(modelValue.container?.radius ?? 12)"
              @update:model-value="updateNumber('container', 'radius', $event)"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Title Color</span>
            <BaseInput
              type="color"
              :model-value="modelValue.typography?.titleColor || '#e7e9ee'"
              @update:model-value="updateSection('typography', { titleColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Subtitle Color</span>
            <BaseInput
              type="color"
              :model-value="modelValue.typography?.subtitleColor || '#9ba3b3'"
              @update:model-value="updateSection('typography', { subtitleColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Input Text</span>
            <BaseInput
              type="color"
              :model-value="modelValue.fields?.textColor || '#e7e9ee'"
              @update:model-value="updateSection('fields', { textColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Input Background</span>
            <BaseInput
              type="color"
              :model-value="modelValue.fields?.backgroundColor || '#0b0d12'"
              @update:model-value="updateSection('fields', { backgroundColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Input Border</span>
            <BaseInput
              type="color"
              :model-value="modelValue.fields?.borderColor || '#2a3142'"
              @update:model-value="updateSection('fields', { borderColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Button Width</span>
            <BaseSelect
              :model-value="modelValue.button?.width || 'full'"
              :options="FORM_BUTTON_WIDTHS"
              @update:model-value="updateSection('button', { width: $event as NonNullable<FormTheme['button']>['width'] })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Button Shape</span>
            <BaseSelect
              :model-value="modelValue.button?.shape || 'medium'"
              :options="FORM_BUTTON_SHAPES"
              @update:model-value="updateSection('button', { shape: $event as NonNullable<FormTheme['button']>['shape'] })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Button Color</span>
            <BaseInput
              type="color"
              :model-value="modelValue.button?.backgroundColor || '#7c3aed'"
              @update:model-value="updateSection('button', { backgroundColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Button Text</span>
            <BaseInput
              type="color"
              :model-value="modelValue.button?.textColor || '#ffffff'"
              @update:model-value="updateSection('button', { textColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Field Focus</span>
            <BaseInput
              type="color"
              :model-value="modelValue.fields?.focusColor || '#7c3aed'"
              @update:model-value="updateSection('fields', { focusColor: $event as string })"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Input Shape</span>
            <BaseSelect
              :model-value="modelValue.fields?.shape || 'medium'"
              :options="FORM_FIELD_SHAPES"
              @update:model-value="updateSection('fields', { shape: $event as NonNullable<FormTheme['fields']>['shape'] })"
            />
          </div>
        </div>

        <div class="ftm-grid">
          <div class="ftm-field">
            <span class="te-label">Title Font</span>
            <BaseInput
              :model-value="modelValue.typography?.titleFontFamily || ''"
              @update:model-value="updateSection('typography', { titleFontFamily: $event as string })"
              placeholder="Inter, system-ui, sans-serif"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Subtitle Font</span>
            <BaseInput
              :model-value="modelValue.typography?.subtitleFontFamily || ''"
              @update:model-value="updateSection('typography', { subtitleFontFamily: $event as string })"
              placeholder="Inter, system-ui, sans-serif"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Button Font</span>
            <BaseInput
              :model-value="modelValue.typography?.buttonFontFamily || ''"
              @update:model-value="updateSection('typography', { buttonFontFamily: $event as string })"
              placeholder="Inter, system-ui, sans-serif"
            />
          </div>
          <div class="ftm-field">
            <span class="te-label">Input Font</span>
            <BaseInput
              :model-value="modelValue.typography?.inputFontFamily || ''"
              @update:model-value="updateSection('typography', { inputFontFamily: $event as string })"
              placeholder="Inter, system-ui, sans-serif"
            />
          </div>
        </div>

        <div class="ftm-field">
          <span class="te-label">Gradient</span>
          <BaseInput
            :model-value="modelValue.background?.gradient || ''"
            @update:model-value="updateSection('background', { gradient: $event as string })"
            placeholder="linear-gradient(135deg, #0b0d12 0%, #111827 100%)"
          />
        </div>

        <div class="ftm-field">
          <span class="te-label">Background Image URL</span>
          <BaseInput
            :model-value="modelValue.background?.imageUrl || ''"
            @update:model-value="updateSection('background', { imageUrl: $event as string })"
            placeholder="https://example.com/background.jpg"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="ghost" @click="isOpen = false">Close</BaseButton>
    </template>
  </BaseMiniMenu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormTheme } from '@/core/types/workflow.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseMiniMenu from '@/shared/components/base/BaseMiniMenu.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'

const props = withDefaults(defineProps<{
  modelValue?: FormTheme
  title?: string
  description?: string
}>(), {
  modelValue: () => ({}),
  title: '',
  description: '',
})

const emit = defineEmits<{
  'update:modelValue': [theme: FormTheme]
}>()

const isOpen = ref(false)

const FORM_THEME_PRESET_CARDS = [
  {
    value: 'default-floating',
    label: 'Default Floating',
    description: 'Dark floating card with ND8 accent.',
    swatch: 'linear-gradient(135deg, #0b0d12, #7c3aed)',
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

const presetDefaults: Record<NonNullable<FormTheme['preset']>, FormTheme> = {
  'default-floating': {
    preset: 'default-floating',
    layout: 'floating',
    background: {
      type: 'gradient',
      color: '#0b0d12',
      gradient: 'linear-gradient(135deg, #0b0d12 0%, #111827 100%)',
    },
    container: {
      backgroundColor: '#141821',
      borderColor: '#1f2430',
      borderWidth: 1,
      radius: 12,
      shadow: 'lg',
      maxWidth: 560,
      padding: 28,
    },
    button: {
      width: 'full',
      shape: 'medium',
      backgroundColor: '#7c3aed',
      textColor: '#ffffff',
      borderColor: '#7c3aed',
      hoverBackgroundColor: '#6d28d9',
    },
    fields: {
      backgroundColor: '#0b0d12',
      textColor: '#e7e9ee',
      borderColor: '#2a3142',
      focusColor: '#7c3aed',
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
  'minimal-flat': {
    preset: 'minimal-flat',
    layout: 'flat',
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
    layout: 'centered',
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
}

const activeTheme = computed<FormTheme>(() => {
  const preset = props.modelValue.preset ?? 'default-floating'
  const defaults = presetDefaults[preset]
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
  const preset = props.modelValue.preset ?? 'default-floating'
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
  fontFamily: activeTheme.value.typography?.titleFontFamily ?? activeTheme.value.typography?.fontFamily,
}))
const previewSubtitleStyle = computed(() => ({
  color: activeTheme.value.typography?.subtitleColor,
  fontFamily: activeTheme.value.typography?.subtitleFontFamily ?? activeTheme.value.typography?.fontFamily,
}))
const previewInputStyle = computed(() => ({
  background: activeTheme.value.fields?.backgroundColor,
  borderColor: activeTheme.value.fields?.borderColor,
  borderRadius: activeTheme.value.fields?.shape === 'pill'
    ? '999px'
    : activeTheme.value.fields?.shape === 'square'
      ? '0'
      : `${activeTheme.value.fields?.radius ?? 8}px`,
  color: activeTheme.value.fields?.textColor,
  fontFamily: activeTheme.value.typography?.inputFontFamily ?? activeTheme.value.typography?.fontFamily,
}))
const previewButtonStyle = computed(() => ({
  width: activeTheme.value.button?.width === 'full' ? '100%' : 'fit-content',
  background: activeTheme.value.button?.backgroundColor,
  borderColor: activeTheme.value.button?.borderColor,
  borderRadius: activeTheme.value.button?.shape === 'pill'
    ? '999px'
    : activeTheme.value.button?.shape === 'square'
      ? '0'
      : '8px',
  color: activeTheme.value.button?.textColor,
  fontFamily: activeTheme.value.typography?.buttonFontFamily ?? activeTheme.value.typography?.fontFamily,
}))

function updateTheme(updates: Partial<FormTheme>) {
  emit('update:modelValue', {
    ...props.modelValue,
    ...updates,
  })
}

function applyPreset(preset: NonNullable<FormTheme['preset']>) {
  emit('update:modelValue', presetDefaults[preset])
}

function updateSection<K extends keyof FormTheme>(
  section: K,
  updates: Partial<NonNullable<FormTheme[K]>>,
) {
  const currentSection = props.modelValue[section]
  emit('update:modelValue', {
    ...props.modelValue,
    [section]: {
      ...(typeof currentSection === 'object' && currentSection ? currentSection : {}),
      ...updates,
    },
  })
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
  border-color: var(--nod8-accent);
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
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.ftm-preset-list,
.ftm-grid {
  display: grid;
  gap: 10px;
}

.ftm-preset-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ftm-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ftm-preset-card {
  min-height: 92px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  background: var(--nod8-bg-surface);
  color: var(--nod8-text-primary);
  text-align: left;
  cursor: pointer;
}

.ftm-preset-card--active {
  border-color: var(--nod8-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--nod8-accent) 40%, transparent);
}

.ftm-preset-chip {
  width: 100%;
  height: 26px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
}

@media (max-width: 820px) {
  .ftm-menu,
  .ftm-preset-list,
  .ftm-grid {
    grid-template-columns: 1fr;
  }
}
</style>

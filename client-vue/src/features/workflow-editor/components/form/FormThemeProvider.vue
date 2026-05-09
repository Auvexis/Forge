<template>
  <main class="form-theme-page" :class="pageClasses" :style="themeVars">
    <section class="form-theme-container">
      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { FormTheme } from '@/core/types/workflow.types'
import './form-themes.css'

const props = defineProps<{
  theme?: FormTheme
}>()

const presetDefaults: Record<NonNullable<FormTheme['preset']>, FormTheme> = {
  'default-floating': {
    layout: 'floating',
    background: {
      type: 'gradient',
      gradient: 'radial-gradient(circle at 20% 0%, rgba(236, 72, 153, 0.16), transparent 28%), linear-gradient(135deg, #0b0d12 0%, #111827 100%)',
    },
    container: {
      backgroundColor: 'var(--nod8-bg-surface)',
      borderColor: 'var(--nod8-border)',
      borderWidth: 1,
      radius: 12,
      shadow: 'lg',
      maxWidth: 560,
      padding: 28,
    },
    button: {
      width: 'full',
      shape: 'medium',
      backgroundColor: 'var(--nod8-accent)',
      textColor: '#ffffff',
      borderColor: 'var(--nod8-accent)',
      hoverBackgroundColor: '#6d28d9',
    },
    typography: {
      fontFamily: 'var(--nod8-font-sans)',
      titleFontFamily: 'var(--nod8-font-sans)',
      subtitleFontFamily: 'var(--nod8-font-sans)',
      buttonFontFamily: 'var(--nod8-font-sans)',
      inputFontFamily: 'var(--nod8-font-sans)',
      baseSize: 14,
      weight: 500,
      titleColor: 'var(--nod8-text-primary)',
      subtitleColor: 'var(--nod8-text-secondary)',
    },
    fields: {
      backgroundColor: 'var(--nod8-bg-overlay)',
      textColor: 'var(--nod8-text-primary)',
      borderColor: 'var(--nod8-border)',
      focusColor: 'var(--nod8-accent)',
      radius: 8,
      spacing: 16,
    },
  },
  'minimal-flat': {
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
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      titleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      subtitleFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      buttonFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      inputFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      baseSize: 15,
      weight: 500,
      titleColor: '#111827',
      subtitleColor: '#475569',
    },
    fields: {
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderColor: '#cbd5e1',
      focusColor: '#2563eb',
      radius: 4,
      spacing: 18,
    },
  },
  'google-forms': {
    layout: 'centered',
    background: { type: 'solid', color: '#f0ebf8' },
    container: {
      backgroundColor: '#ffffff',
      borderColor: '#dadce0',
      borderWidth: 1,
      radius: 8,
      shadow: 'sm',
      maxWidth: 640,
      padding: 0,
    },
    button: {
      width: 'auto',
      shape: 'medium',
      backgroundColor: '#673ab7',
      textColor: '#ffffff',
      borderColor: '#673ab7',
      hoverBackgroundColor: '#5e35b1',
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
      titleFontFamily: 'Roboto, Arial, sans-serif',
      subtitleFontFamily: 'Roboto, Arial, sans-serif',
      buttonFontFamily: 'Roboto, Arial, sans-serif',
      inputFontFamily: 'Roboto, Arial, sans-serif',
      baseSize: 14,
      weight: 400,
      titleColor: '#202124',
      subtitleColor: '#5f6368',
    },
    fields: {
      backgroundColor: '#ffffff',
      textColor: '#202124',
      borderColor: '#dadce0',
      focusColor: '#673ab7',
      radius: 4,
      spacing: 20,
    },
  },
}

function mergeTheme(theme?: FormTheme): FormTheme {
  const preset = theme?.preset ?? 'default-floating'
  const defaults = presetDefaults[preset]
  return {
    ...defaults,
    ...theme,
    background: { ...defaults.background, ...theme?.background },
    container: { ...defaults.container, ...theme?.container },
    button: { ...defaults.button, ...theme?.button },
    typography: { ...defaults.typography, ...theme?.typography },
    fields: { ...defaults.fields, ...theme?.fields },
  }
}

const resolvedTheme = computed(() => mergeTheme(props.theme))

const backgroundValue = computed(() => {
  const background = resolvedTheme.value.background
  if (background?.type === 'image' && background.imageUrl) {
    return `linear-gradient(rgba(11, 13, 18, 0.38), rgba(11, 13, 18, 0.38)), url("${background.imageUrl}") center / cover no-repeat`
  }
  if (background?.type === 'gradient' && background.gradient) return background.gradient
  return background?.color ?? '#0b0d12'
})

const shadowValue = computed(() => {
  const shadow = resolvedTheme.value.container?.shadow
  if (shadow === 'none') return 'none'
  if (shadow === 'sm') return '0 8px 18px rgba(15, 23, 42, 0.08)'
  if (shadow === 'md') return '0 16px 36px rgba(15, 23, 42, 0.14)'
  return '0 22px 60px rgba(0, 0, 0, 0.28)'
})

const pageClasses = computed(() => {
  const layout = resolvedTheme.value.layout ?? 'floating'
  return [`form-theme-page--${layout}`]
})

const themeVars = computed<CSSProperties>(() => {
  const theme = resolvedTheme.value
  return {
    '--form-page-background': backgroundValue.value,
    '--form-container-background': theme.container?.backgroundColor,
    '--form-container-border-color': theme.container?.borderColor,
    '--form-container-border-width': `${theme.container?.borderWidth ?? 1}px`,
    '--form-container-radius': `${theme.container?.radius ?? 12}px`,
    '--form-container-shadow': shadowValue.value,
    '--form-container-max-width': `${theme.container?.maxWidth ?? 560}px`,
    '--form-container-padding': `${theme.container?.padding ?? 28}px`,
    '--form-button-width': theme.button?.width === 'full' ? '100%' : 'fit-content',
    '--form-button-radius': theme.button?.shape === 'pill'
      ? '999px'
      : theme.button?.shape === 'square'
        ? '0px'
        : '8px',
    '--form-button-background': theme.button?.backgroundColor,
    '--form-button-color': theme.button?.textColor,
    '--form-button-border-color': theme.button?.borderColor,
    '--form-button-hover-background': theme.button?.hoverBackgroundColor,
    '--form-font-family': theme.typography?.fontFamily,
    '--form-title-font-family': theme.typography?.titleFontFamily ?? theme.typography?.fontFamily,
    '--form-subtitle-font-family': theme.typography?.subtitleFontFamily ?? theme.typography?.fontFamily,
    '--form-button-font-family': theme.typography?.buttonFontFamily ?? theme.typography?.fontFamily,
    '--form-input-font-family': theme.typography?.inputFontFamily ?? theme.typography?.fontFamily,
    '--form-base-size': `${theme.typography?.baseSize ?? 14}px`,
    '--form-font-weight': String(theme.typography?.weight ?? 500),
    '--form-title-color': theme.typography?.titleColor,
    '--form-subtitle-color': theme.typography?.subtitleColor,
    '--form-field-background': theme.fields?.backgroundColor,
    '--form-field-color': theme.fields?.textColor,
    '--form-field-border-color': theme.fields?.borderColor,
    '--form-field-focus-color': theme.fields?.focusColor,
    '--form-field-radius': `${theme.fields?.radius ?? 8}px`,
    '--form-field-spacing': `${theme.fields?.spacing ?? 16}px`,
  } as CSSProperties
})
</script>

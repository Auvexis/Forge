<script setup lang="ts">
import { getFabricThemePreviewCards } from '@/themes/runtime/theme.preview'
import type { ThemeMode } from '@/shared/composables/useTheme'

defineProps<{
  modelValue: ThemeMode
}>()

defineEmits<{
  'update:modelValue': [value: ThemeMode]
}>()

const themeCards = getFabricThemePreviewCards()
</script>

<template>
  <div class="base-theme-grid">
    <button
      v-for="theme in themeCards"
      :key="theme.value"
      class="base-theme-card"
      :class="{ 'base-theme-card--selected': theme.value === modelValue }"
      :style="{
        '--theme-bg': theme.bgColor,
        '--theme-surface': theme.surfaceColor,
        '--theme-component': theme.componentColor,
        '--theme-border': theme.borderColor,
        '--theme-accent': theme.accentColor,
        '--theme-muted': theme.mutedColor,
      }"
      type="button"
      @click="$emit('update:modelValue', theme.value)"
    >
      <span class="base-theme-preview">
        <span class="base-theme-window">
          <span class="base-theme-toolbar">
            <span class="base-theme-toolbar__group">
              <span class="base-theme-pill base-theme-pill--small" />
              <span class="base-theme-pill base-theme-pill--small" />
            </span>
            <span class="base-theme-pill base-theme-pill--center" />
            <span class="base-theme-toolbar__group">
              <span class="base-theme-dot" />
              <span class="base-theme-dot base-theme-dot--accent" />
              <span class="base-theme-dot" />
            </span>
          </span>
          <span class="base-theme-body">
            <span class="base-theme-line base-theme-line--title" />
            <span class="base-theme-line base-theme-line--wide" />
            <span class="base-theme-row-preview">
              <span class="base-theme-line base-theme-line--compact base-theme-line--accent" />
              <span class="base-theme-line base-theme-line--compact" />
              <span class="base-theme-line base-theme-line--compact" />
            </span>
            <span class="base-theme-action" />
          </span>
        </span>
      </span>
      <span class="base-theme-label">{{ theme.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.base-theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 148px));
  gap: 12px;
  justify-content: flex-start;
}

.base-theme-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 148px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--fabric-text-secondary);
  cursor: pointer;
  text-align: left;
}

.base-theme-card:hover .base-theme-preview {
  border-color: var(--fabric-border-strong);
  transform: translateY(-1px);
}

.base-theme-card--selected .base-theme-preview {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--theme-accent) 42%, transparent);
}

.base-theme-card--selected .base-theme-label {
  color: var(--fabric-text-primary);
}

.base-theme-preview {
  display: block;
  width: 148px;
  height: 88px;
  padding: 6px;
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: 11px;
  background: transparent;
  transition:
    border-color var(--fabric-duration-base) var(--fabric-ease-standard),
    box-shadow var(--fabric-duration-base) var(--fabric-ease-standard),
    transform var(--fabric-duration-base) var(--fabric-ease-standard);
}

.base-theme-window {
  display: block;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-bg);
}

.base-theme-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  height: 22px;
  padding: 0 9px;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-border) 82%, transparent);
  background: color-mix(in srgb, var(--theme-surface) 85%, var(--theme-bg));
}

.base-theme-toolbar__group,
.base-theme-row-preview {
  display: flex;
  align-items: center;
  gap: 4px;
}

.base-theme-pill,
.base-theme-dot,
.base-theme-line,
.base-theme-action {
  display: block;
}

.base-theme-pill {
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-muted) 58%, transparent);
}

.base-theme-pill--small {
  width: 11px;
  height: 4px;
}

.base-theme-pill--center {
  width: 28px;
  height: 5px;
  justify-self: center;
}

.base-theme-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-muted);
}

.base-theme-dot--accent {
  background: var(--theme-accent);
}

.base-theme-body {
  position: relative;
  display: block;
  height: calc(100% - 22px);
  padding: 12px 11px 10px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--theme-surface) 28%, transparent),
    transparent 60%
  );
}

.base-theme-line {
  height: 6px;
  border-radius: 999px;
  background: var(--theme-component);
}

.base-theme-line--title {
  width: 27%;
  margin-bottom: 12px;
}

.base-theme-line--wide {
  width: 70%;
  margin-bottom: 10px;
}

.base-theme-line--compact {
  width: 14%;
  min-width: 14px;
}

.base-theme-line--accent {
  background: var(--theme-accent);
}

.base-theme-row-preview {
  gap: 6px;
}

.base-theme-action {
  position: absolute;
  top: 35px;
  right: 11px;
  width: 17px;
  height: 12px;
  border-radius: 3px;
  background: var(--theme-accent);
}

.base-theme-label {
  width: 100%;
  color: var(--fabric-text-secondary);
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}
</style>

<template>
  <button
    class="app-dropdown-item"
    :class="{ 'app-dropdown-item--danger': danger }"
    :disabled="disabled"
    @click="handleClick"
  >
    <template v-if="!$slots.element">
      <div v-if="icon" class="app-dropdown-item__icon">
        <LucideIcon :name="icon" :size="14" />
      </div>

      <div class="app-dropdown-item__content">
        <span class="app-dropdown-item__label">
          <slot>{{ label }}</slot>
        </span>
        <span v-if="hint" class="app-dropdown-item__hint">{{ hint }}</span>
      </div>

      <div v-if="shortcut" class="app-dropdown-item__shortcut">
        {{ shortcut }}
      </div>
    </template>

    <template v-else>
      <div v-if="icon" class="app-dropdown-item__icon">
        <LucideIcon :name="icon" :size="14" />
      </div>

      <div class="app-dropdown-item__content">
        <span class="app-dropdown-item__label">
          <slot>{{ label }}</slot>
        </span>
        <span v-if="hint" class="app-dropdown-item__hint">{{ hint }}</span>
        <slot name="element"></slot>
      </div>

      <div v-if="shortcut" class="app-dropdown-item__shortcut">
        {{ shortcut }}
      </div>
    </template>
  </button>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  label?: string
  icon?: string
  hint?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  preventClose?: boolean
}>()

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const closeDropdown = inject<{ (): void }>('closeDropdown')

const handleClick = (e: MouseEvent) => {
  if (props.disabled) return
  emit('click', e)

  if (!props.preventClose && closeDropdown) {
    closeDropdown()
  }
}
</script>

<style scoped>
.app-dropdown-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 30px;
  padding: 5px 8px;
  border-radius: var(--fabric-app-dropdown-item-radius);
  background-color: transparent;
  color: var(--fabric-app-dropdown-item-text-primary);
  text-align: left;
  border: none;
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
  user-select: none;
  font-size: 13px;
  font-family: inherit;
}

.app-dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-dropdown-item--danger {
  color: var(--fabric-app-dropdown-item-text-error);
}

.app-dropdown-item:hover:not(:disabled) {
  background: var(--fabric-app-dropdown-item-button-ghost-hover);
  color: var(--fabric-app-dropdown-item-button-ghost-hover-text);
}

.app-dropdown-item--danger:hover:not(:disabled) {
  background: var(--fabric-app-dropdown-item-status-error-bg);
  color: var(--fabric-app-dropdown-item-text-error);
}

.app-dropdown-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: inherit;
  opacity: 0.8;
}

.app-dropdown-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.app-dropdown-item__label {
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-dropdown-item__hint {
  font-size: 11px;
  color: var(--fabric-app-dropdown-item-text-muted);
}

.app-dropdown-item__shortcut {
  flex-shrink: 0;
  font-size: 11px;
  font-family: var(--fabric-font-mono);
  color: var(--fabric-app-dropdown-item-text-muted);
  letter-spacing: 0.05em;
  opacity: 0.7;
}
</style>

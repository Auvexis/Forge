<template>
  <button
    class="app-dropdown-item"
    :class="{ 'app-dropdown-item--danger': danger }"
    :disabled="disabled"
    @click="handleClick"
  >
    <template v-if="!$slots.element">
      <div v-if="icon" class="app-dropdown-item__icon">
        <LucideIcon :name="icon" :size="16" />
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
      <div class="flex flex-col gap-1">
        <div class="flex gap-2">
          <div v-if="icon" class="app-dropdown-item__icon">
            <LucideIcon :name="icon" :size="16" />
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
        </div>

        <slot name="element"></slot>
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
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  width: 100%;
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  background-color: transparent;
  color: var(--nod8-text-primary);
  text-align: left;
  border: none;
  cursor: pointer;
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  user-select: none;
}

.app-dropdown-item:hover:not(:disabled) {
  background-color: var(--nod8-bg-muted);
}

.app-dropdown-item--danger {
  color: var(--nod8-text-error);
}

.app-dropdown-item--danger:hover:not(:disabled) {
  background-color: rgba(248, 113, 113, 0.1); /* light red */
}

.app-dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  min-width: 0;
}

.app-dropdown-item__label {
  font-size: var(--nod8-text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-dropdown-item__hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}

.app-dropdown-item__shortcut {
  flex-shrink: 0;
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-muted);
  letter-spacing: 0.05em;
  opacity: 0.7;
}
</style>

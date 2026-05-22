<template>
  <div class="plugin-creator-variable-picker">
    <button
      type="button"
      class="plugin-creator-variable-picker__trigger"
      title="Insert variable"
      @click="isOpen = !isOpen"
    >
      <LucideIcon name="braces" :size="15" />
    </button>
    <div v-if="isOpen" class="plugin-creator-variable-picker__popover">
      <PluginCreatorVariableTree @select="selectVariable" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import PluginCreatorVariableTree from '../PluginCreatorVariableTree.vue'

defineOptions({ name: 'PluginCreatorVariablePicker' })
const emit = defineEmits<{ select: [value: string] }>()

const variableRoots = ['params', 'credentials', 'steps']
const isOpen = ref(false)

function selectVariable(value: string) {
  emit('select', value)
  isOpen.value = false
}
</script>

<style scoped>
.plugin-creator-variable-picker {
  position: relative;
  display: inline-flex;
  align-self: stretch;
}

.plugin-creator-variable-picker__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  min-height: 36px;
  border: 0;
  border-left: 1px solid var(--sailor-border);
  background: transparent;
  color: var(--sailor-text-primary);
  cursor: pointer;
}

.plugin-creator-variable-picker__trigger:hover,
.plugin-creator-variable-picker__trigger:focus-visible {
  background: var(--sailor-bg-elevated);
  outline: none;
}

.plugin-creator-variable-picker__popover {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 10020;
  width: min(560px, calc(100vw - 48px));
  padding: 10px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-xl);
}
</style>

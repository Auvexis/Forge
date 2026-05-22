<template>
  <div class="plugin-creator-variable-tree">
    <button v-for="item in variables" :key="item" type="button" @click="$emit('select', item)">
      {{ item }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PluginCreatorVariableTree' })
defineEmits<{ select: [value: string] }>()

const variables = [
  'params',
  'credentials',
  'previous',
  'steps',
  'steps.<nodeId>.output',
  'steps.<nodeId>.status',
  'steps.<nodeId>.error',
  'response.status',
  'response.headers',
  'response.body',
]
</script>

<style scoped>
.plugin-creator-variable-tree {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.plugin-creator-variable-tree button {
  padding: 4px 7px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: 12px;
  cursor: pointer;
}
</style>

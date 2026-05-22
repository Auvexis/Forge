<template>
  <div class="plugin-creator-variable-picker">
    <PluginCreatorVariableTree @select="$emit('select', $event)" />
  </div>
</template>

<script setup lang="ts">
import PluginCreatorVariableTree from '../PluginCreatorVariableTree.vue'

defineOptions({ name: 'PluginCreatorVariablePicker' })
defineEmits<{ select: [value: string] }>()

const variableRoots = ['params', 'credentials', 'steps']
</script>

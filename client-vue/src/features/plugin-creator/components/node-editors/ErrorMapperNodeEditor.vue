<template>
  <PluginCreatorNodeEditorFields kind="errorMapper" v-bind="$props" />
</template>

<script setup lang="ts">
import PluginCreatorNodeEditorFields from './PluginCreatorNodeEditorFields.vue'
import type { PluginCreatorNodeEditorProps } from './types'

defineProps<PluginCreatorNodeEditorProps>()
</script>

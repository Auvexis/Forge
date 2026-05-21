<template>
  <PluginCreatorNodeEditorFields kind="output" v-bind="$props" v-on="$attrs" />
</template>

<script setup lang="ts">
import PluginCreatorNodeEditorFields from './PluginCreatorNodeEditorFields.vue'
import type { PluginCreatorNodeEditorProps } from './types'

defineProps<PluginCreatorNodeEditorProps>()
defineOptions({ inheritAttrs: false })
</script>

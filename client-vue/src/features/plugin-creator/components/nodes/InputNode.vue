<template>
  <div class="plugin-creator-node plugin-creator-node--input">
    <Handle type="target" :position="Position.Left" />
    <div class="plugin-creator-node__eyebrow">Input Field</div>
    <strong>{{ data.label ?? data.name ?? 'Input' }}</strong>
    <span>{{ data.handle ?? data.name ?? 'inputName' }}</span>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: Record<string, unknown>
}>()
</script>

<style scoped src="./plugin-creator-node.css"></style>

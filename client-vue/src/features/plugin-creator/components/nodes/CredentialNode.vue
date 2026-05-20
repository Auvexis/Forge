<template>
  <div class="plugin-creator-node plugin-creator-node--credential">
    <Handle type="target" :position="Position.Left" />
    <div class="plugin-creator-node__eyebrow">Credential Field</div>
    <strong>{{ data.label ?? data.name ?? 'Credential' }}</strong>
    <span>{{ data.handle ?? data.name ?? 'credentialName' }}</span>
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

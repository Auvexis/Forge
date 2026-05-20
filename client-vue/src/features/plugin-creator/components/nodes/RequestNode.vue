<template>
  <div class="plugin-creator-node plugin-creator-node--request">
    <Handle type="target" :position="Position.Left" />
    <div class="plugin-creator-node__eyebrow">Request</div>
    <strong>{{ data.name ?? data.method ?? 'HTTP Request' }}</strong>
    <span>{{ data.handle ?? data.url ?? 'https://api.example.com' }}</span>
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

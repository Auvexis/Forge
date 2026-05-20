<template>
  <div class="plugin-creator-node plugin-creator-node--output">
    <Handle type="target" :position="Position.Left" />
    <div class="plugin-creator-node__eyebrow">Output Field</div>
    <strong>{{ data.name ?? data.label ?? 'Output' }}</strong>
    <span>{{ data.methodId ?? 'method' }}</span>
    <ul>
      <li v-for="output in outputs" :key="output">{{ output }}</li>
    </ul>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{ data: Record<string, unknown> }>()

const outputs = computed(() =>
  Array.isArray(props.data.outputs) ? props.data.outputs.map(String) : [],
)
</script>

<style scoped src="./plugin-creator-node.css"></style>

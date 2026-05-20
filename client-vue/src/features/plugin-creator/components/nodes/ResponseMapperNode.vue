<template>
  <div class="plugin-creator-node plugin-creator-node--response-mapper">
    <Handle type="target" :position="Position.Left" />
    <div class="plugin-creator-node__eyebrow">Response Mapper</div>
    <strong>{{ data.name ?? 'Response mapping' }}</strong>
    <span>{{ data.methodId ?? 'method' }}</span>
    <ul>
      <li v-for="mapping in mappings" :key="mapping">{{ mapping }}</li>
    </ul>
    <button type="button" @click="emit('map-selected-field-as-output', data.methodId)">
      Map selected field as output
    </button>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{ data: Record<string, unknown> }>()
const emit = defineEmits<{
  'map-selected-field-as-output': [methodId: unknown]
}>()

const mappings = computed(() =>
  Array.isArray(props.data.mappings) ? props.data.mappings.map(String) : [],
)
</script>

<style scoped src="./plugin-creator-node.css"></style>

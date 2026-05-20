<template>
  <div class="plugin-creator-node plugin-creator-node--error-mapper">
    <Handle type="target" :position="Position.Left" />
    <div class="plugin-creator-node__eyebrow">Error Mapper</div>
    <strong>{{ data.name ?? 'Error rules' }}</strong>
    <span>{{ data.methodId ?? 'method' }}</span>
    <ul>
      <li v-for="error in errors" :key="error">{{ error }}</li>
    </ul>
    <button type="button" @click="emit('create-error-rule-from-response', data.methodId)">
      Create error rule from this response
    </button>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{ data: Record<string, unknown> }>()
const emit = defineEmits<{
  'create-error-rule-from-response': [methodId: unknown]
}>()

const errors = computed(() =>
  Array.isArray(props.data.errors) ? props.data.errors.map(String) : [],
)
</script>

<style scoped src="./plugin-creator-node.css"></style>

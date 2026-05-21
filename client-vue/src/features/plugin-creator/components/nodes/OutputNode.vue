<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    icon="package-check"
    color="#60a5fa"
    bg="rgba(59, 130, 246, 0.12)"
    border-color="rgba(96, 165, 250, 0.58)"
    has-target
    has-source
    :selected="selected"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.name ?? data.label ?? 'Output' }}</strong>
        <span>{{ outputs[0] ?? data.methodId ?? 'method' }}</span>
      </div>
    </template>
  </BaseNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'

const props = defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()

const outputs = computed(() =>
  Array.isArray(props.data.outputs) ? props.data.outputs.map(String) : [],
)
</script>

<style scoped src="./plugin-creator-node.css"></style>

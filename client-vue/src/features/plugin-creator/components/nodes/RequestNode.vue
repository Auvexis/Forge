<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    icon="globe"
    color="#fb923c"
    bg="rgba(249, 115, 22, 0.13)"
    border-color="rgba(251, 146, 60, 0.62)"
    has-target
    has-source
    :selected="selected"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.name ?? data.method ?? 'HTTP Request' }}</strong>
        <span>{{ data.handle ?? data.url ?? 'https://api.example.com' }}</span>
      </div>
    </template>
  </BaseNode>
</template>

<script setup lang="ts">
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'

defineProps<{
  id: string
  data: Record<string, unknown>
  selected?: boolean
}>()
</script>

<style scoped src="./plugin-creator-node.css"></style>

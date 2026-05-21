<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    icon="braces"
    color="#34d399"
    bg="rgba(16, 185, 129, 0.12)"
    border-color="rgba(52, 211, 153, 0.55)"
    has-target
    has-source
    :selected="selected"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.label ?? data.name ?? 'Input' }}</strong>
        <span>{{ data.handle ?? data.name ?? 'inputName' }}</span>
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

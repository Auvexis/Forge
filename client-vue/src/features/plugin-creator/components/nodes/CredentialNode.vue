<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    icon="key-round"
    color="#f59e0b"
    bg="rgba(245, 158, 11, 0.12)"
    border-color="rgba(245, 158, 11, 0.62)"
    has-target
    has-source
    :has-outgoing-connection="Boolean(data.hasOutgoingConnection)"
    :selected="selected"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.label ?? data.name ?? 'Credential' }}</strong>
        <span>{{ data.handle ?? data.name ?? 'credentialName' }}</span>
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

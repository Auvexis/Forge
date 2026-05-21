<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    icon="shield-alert"
    color="#fb7185"
    bg="rgba(244, 63, 94, 0.12)"
    border-color="rgba(251, 113, 133, 0.58)"
    has-target
    has-source
    :has-outgoing-connection="Boolean(data.hasOutgoingConnection)"
    :selected="selected"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.name ?? 'Error mapping' }}</strong>
        <span>{{ errors[0] ?? data.methodId ?? 'method' }}</span>
      </div>
    </template>
  </BaseNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'

const props = defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()

const errors = computed(() =>
  Array.isArray(props.data.errors) ? props.data.errors.map(String) : [],
)
</script>

<style scoped src="./plugin-creator-node.css"></style>

<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    icon="git-branch-plus"
    color="#34d399"
    bg="rgba(16, 185, 129, 0.1)"
    border-color="rgba(52, 211, 153, 0.5)"
    has-target
    has-source
    :has-outgoing-connection="Boolean(data.hasOutgoingConnection)"
    :selected="selected"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.name ?? 'Response mapping' }}</strong>
        <span>{{ mappings[0] ?? data.methodId ?? 'method' }}</span>
      </div>
    </template>
  </BaseNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'

const props = defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()

const mappings = computed(() =>
  Array.isArray(props.data.mappings) ? props.data.mappings.map(String) : [],
)
</script>

<style scoped src="./plugin-creator-node.css"></style>

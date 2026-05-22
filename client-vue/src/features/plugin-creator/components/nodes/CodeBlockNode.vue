<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    title="Code Block"
    :subtitle="String(data.outputName ?? data.codeBlockId ?? 'custom step')"
    icon="braces"
    color="#f472b6"
    bg="rgba(244, 114, 182, 0.14)"
    border-color="rgba(244, 114, 182, 0.58)"
    has-target
    has-source
    :has-outgoing-connection="Boolean(data.hasOutgoingConnection)"
    :selected="selected"
    :status="data.status as any"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.name ?? data.label ?? 'Code Block' }}</strong>
        <span>{{ sourcePreview }}</span>
      </div>
    </template>
  </BaseNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'

const props = defineProps<{
  id: string
  data: Record<string, unknown>
  selected?: boolean
}>()

const sourcePreview = computed(() => {
  const source = String(props.data.source ?? 'return previous;')
  return source.length > 42 ? `${source.slice(0, 42)}...` : source
})
</script>

<style scoped src="./plugin-creator-node.css"></style>

<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { CodeNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<CodeNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const snippet = computed(() => props.data?.script || '// empty script')
const stepTitle = computed(() => (props.data as any)?.name || 'Code Block')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="'JavaScript Engine'"
    icon="code-2"
    color="var(--nod8-node-codeblock-icon)"
    bg="var(--nod8-node-codeblock-bg)"
  />
</template>

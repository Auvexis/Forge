<script setup lang="ts">
import { Position } from '../nodePresentation.types'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { RespondToWebhookNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<RespondToWebhookNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => (props.data as any)?.name || 'Respond to Webhook')
const statusCode = computed(() => props.data?.statusCode ?? 200)
const subtitle = computed(() => `HTTP ${statusCode.value}`)
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    :title="stepTitle"
    :subtitle="subtitle"
    icon="send"
    color="var(--sailor-node-respond-webhook-icon)"
    bg="var(--sailor-node-respond-webhook-bg)"
    border-color="var(--sailor-node-respond-webhook-border)"
  >
    <!-- Terminal node — no source output handle -->
  </BaseNode>
</template>

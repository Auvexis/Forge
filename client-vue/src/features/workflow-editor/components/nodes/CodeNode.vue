<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { CodeNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<CodeNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const snippet = computed(() => props.data?.script || '// empty script')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    title="Code Block"
    subtitle="JavaScript Engine"
    icon="code-2"
    color="var(--nod8-node-codeblock-icon)"
    bg="var(--nod8-node-codeblock-bg)"
    badge-text="CODE"
  >
    <div class="nod8-code-body">
      <pre class="nod8-code-pre">{{
        snippet.length > 120 ? snippet.substring(0, 120) + '…' : snippet
      }}</pre>
    </div>
  </BaseNode>
</template>

<style scoped>
.nod8-code-body {
  padding: var(--nod8-space-2);
  background-color: rgba(115, 115, 115, 0.15); /* bg-muted/30 appx */
  border-radius: var(--nod8-radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.05);
  max-height: 60px;
  overflow: hidden;
  width: 100%;
}

.nod8-code-pre {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-muted);
  line-height: var(--nod8-leading-tight);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>

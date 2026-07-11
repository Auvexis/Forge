<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExecutionRunDetailModel } from './executionRunTree.types.ts'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import ExecutionNodeInspector from './ExecutionNodeInspector.vue'
import ExecutionNodeTree from './ExecutionNodeTree.vue'

const props = defineProps<{ detail: ExecutionRunDetailModel }>()
const emit = defineEmits<{ (event: 'back'): void }>()
const selectedNodeId = ref<string | null>(null)
const selectedNode = computed(() => selectedNodeId.value ? props.detail.nodesById[selectedNodeId.value] ?? null : null)

watch(() => props.detail.id, () => { selectedNodeId.value = props.detail.roots[0]?.nodeId ?? null }, { immediate: true })

function formatJson(value: unknown) {
  if (value === undefined) return 'No data.'
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
</script>

<template>
  <section class="execution-run-detail">
    <header class="execution-run-detail__header">
      <BaseButton size="icon" variant="ghost" icon-left="arrow-left" title="Back to runs" @click="emit('back')" />
      <div><strong>Run</strong><small>{{ new Date(detail.startedAt).toLocaleString() }}</small></div>
      <span>{{ detail.status }}<template v-if="detail.durationMs !== null"> · {{ detail.durationMs }}ms</template></span>
    </header>
    <div class="execution-run-detail__body">
      <aside class="execution-run-detail__tree">
        <section v-if="detail.finalResult" class="execution-run-detail__result">
          <header>
            <strong>Final Result</strong>
            <span>{{ detail.finalResult.label }}</span>
          </header>
          <BaseCodeEditor
            :model-value="formatJson(detail.finalResult.value)"
            language="json"
            height="180px"
            readonly
          />
        </section>
        <ExecutionNodeTree :nodes="detail.roots" :selected-node-id="selectedNodeId" @select="selectedNodeId = $event" />
      </aside>
      <ExecutionNodeInspector :node="selectedNode" />
    </div>
  </section>
</template>

<style scoped>
.execution-run-detail { height: 100%; min-height: 0; display: flex; flex-direction: column; background-color: var(--fabric-bg-surface); }
.execution-run-detail__header { min-height: 48px; display: flex; align-items: center; gap: var(--fabric-space-3); padding: 0 var(--fabric-space-3); border-bottom: 1px solid var(--fabric-border); }
.execution-run-detail__header > div { display: grid; gap: 1px; }
.execution-run-detail__header strong { color: var(--fabric-text-primary); font-size: var(--fabric-text-sm); }
.execution-run-detail__header small, .execution-run-detail__header > span { color: var(--fabric-text-muted); font-size: var(--fabric-text-xs); }
.execution-run-detail__header > span { margin-left: auto; }
.execution-run-detail__body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(240px, 40%) minmax(0, 1fr); }
.execution-run-detail__tree { min-height: 0; overflow: auto; padding: var(--fabric-space-3); border-right: 1px solid var(--fabric-border); background-color: var(--fabric-bg-base); }
.execution-run-detail__result { display: grid; gap: var(--fabric-space-2); margin-bottom: var(--fabric-space-3); padding: var(--fabric-space-3); border: 1px solid var(--fabric-border); border-radius: var(--fabric-radius-sm); background-color: var(--fabric-bg-surface); }
.execution-run-detail__result header { display: flex; align-items: center; justify-content: space-between; gap: var(--fabric-space-2); }
.execution-run-detail__result strong { color: var(--fabric-text-primary); font-size: var(--fabric-text-xs); font-weight: var(--fabric-font-semibold); }
.execution-run-detail__result span { color: var(--fabric-text-muted); font-size: var(--fabric-text-xs); }
@media (max-width: 720px) { .execution-run-detail__body { grid-template-columns: 1fr; } .execution-run-detail__tree { max-height: 42%; border-right: 0; border-bottom: 1px solid var(--fabric-border); } }
</style>

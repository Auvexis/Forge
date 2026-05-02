<script setup lang="ts">
import { computed } from 'vue'
import { useNodeInspectorStore } from '../../../stores/node-inspector.store'
import { useWorkflowStore } from '../../../stores/workflow.store'

import TriggerEditor from './editors/TriggerEditor.vue'
import HttpEditor from './editors/HttpEditor.vue'
import CodeEditor from './editors/CodeEditor.vue'
import LoopEditor from './editors/LoopEditor.vue'
import SubWorkflowEditor from './editors/SubWorkflowEditor.vue'
import EventEditor from './editors/EventEditor.vue'
import EventListenerEditor from './editors/EventListenerEditor.vue'
import PluginEditor from './editors/PluginEditor.vue'
import IfEditor from './editors/IfEditor.vue'
import JsonTreeView from './shared/JsonTreeView.vue'
import { workflowsApi } from '@/core/api/workflows.api'

const inspectorStore = useNodeInspectorStore()
const workflowStore = useWorkflowStore()

const editorMap: Record<string, any> = {
  trigger: TriggerEditor,
  http: HttpEditor,
  code: CodeEditor,
  loop: LoopEditor,
  subworkflow: SubWorkflowEditor,
  event: EventEditor,
  'event-listener': EventListenerEditor,
  plugin: PluginEditor,
  if: IfEditor,
}

const activeEditor = computed(() => {
  const node = inspectorStore.activeNode
  if (!node) return null
  return editorMap[node.type] || null
})

function close() {
  inspectorStore.closeInspector()
}

async function runStep() {
  if (!inspectorStore.activeNodeId || !workflowStore.activeWorkflow) return
  inspectorStore.isTesting = true
  inspectorStore.lastTestOutput = null
  
  try {
    const res = await workflowsApi.executeNode(
      workflowStore.activeWorkflow.metadata.id,
      inspectorStore.activeNodeId,
      inspectorStore.activeNode!.data
    )
    inspectorStore.lastTestOutput = { success: true, data: res }
  } catch (err: any) {
    inspectorStore.lastTestOutput = { success: false, error: err.message || 'Execution failed' }
  } finally {
    inspectorStore.isTesting = false
  }
}
</script>

<template>
  <div v-if="inspectorStore.isOpen" class="inspector-backdrop absolute inset-0 z-50 flex items-center justify-center">
    <div class="inspector-modal flex flex-col rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="inspector-pane-header flex-between border-b border-nod8-border">
        <div class="flex items-center gap-3">
          <div class="icon-box" style="width: 32px; height: 32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
          </div>
          <h3 class="text-h4 m-0 text-primary">
            {{ inspectorStore.activeNode?.data?.name || 'Node Inspector' }}
          </h3>
          <span class="text-xs text-muted font-mono bg-elevated px-2 py-1 rounded-sm">
            {{ inspectorStore.activeNode?.id }}
          </span>
        </div>
        <button class="btn btn-ghost" @click="close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 3-Column Grid -->
      <div class="inspector-grid flex-1 min-h-0">
        <!-- Left Pane: Input -->
        <div class="inspector-pane">
          <div class="inspector-pane-header text-sm text-muted font-semibold flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            INPUT (Past)
          </div>
          <div class="inspector-pane-content">
            <div class="empty-state mt-8">
              <div class="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              </div>
              <p class="text-sm mt-2">No input data available yet.</p>
            </div>
          </div>
        </div>

        <!-- Center Pane: Config -->
        <div class="inspector-pane" style="background: var(--nod8-bg-surface);">
          <div class="inspector-pane-header text-sm text-muted font-semibold flex items-center gap-2" style="background: var(--nod8-bg-surface);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            CONFIGURATION (Present)
          </div>
          <div class="inspector-pane-content relative">
            <component 
              :is="activeEditor" 
              v-if="activeEditor && inspectorStore.activeNode" 
              :node="inspectorStore.activeNode" 
            />
          </div>
        </div>

        <!-- Right Pane: Output -->
        <div class="inspector-pane">
          <div class="inspector-pane-header flex-between text-sm text-muted font-semibold">
            <div class="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              OUTPUT (Future)
            </div>
            <button 
              class="btn btn-primary" 
              style="padding: 4px 12px; min-height: unset; height: 28px; border-radius: 4px;" 
              :disabled="inspectorStore.isTesting"
              @click="runStep"
            >
              {{ inspectorStore.isTesting ? 'Running...' : 'Run Step' }}
            </button>
          </div>
          <div class="inspector-pane-content">
            <div v-if="inspectorStore.isTesting" class="empty-state mt-8">
              <svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--nod8-color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
              <p class="text-sm mt-2 text-primary">Executing step...</p>
            </div>
            
            <div v-else-if="inspectorStore.lastTestOutput" class="h-full">
              <div v-if="!inspectorStore.lastTestOutput.success" class="p-3 mb-3 rounded-md text-sm" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: rgb(239, 68, 68);">
                <div class="font-bold mb-1">Execution Error</div>
                <div class="font-mono whitespace-pre-wrap">{{ inspectorStore.lastTestOutput.error }}</div>
              </div>
              <div v-else class="h-full">
                <JsonTreeView :data="inspectorStore.lastTestOutput.data" :is-root="true" />
              </div>
            </div>

            <div v-else class="empty-state mt-8">
              <div class="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
              <p class="text-sm mt-2">Run the step to generate output.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Inherits classes from inspector.css */
</style>

/**
 * Node Editor Registry — Vue 3
 *
 * Maps workflow node types to their specific editor components.
 */
import type { Component } from 'vue'
import type { WorkflowNodeType } from '@/core/types/workflow.types'

import HttpEditor from './HttpEditor.vue'
import CodeEditor from './CodeEditor.vue'
import IfEditor from './IfEditor.vue'
import LoopEditor from './LoopEditor.vue'
import SubWorkflowEditor from './SubWorkflowEditor.vue'
import EventEditor from './EventEditor.vue'
import EventListenerEditor from './EventListenerEditor.vue'
import PluginEditor from './PluginEditor.vue'
import TriggerEditor from './TriggerEditor.vue'
import SetEditor from './SetEditor.vue'
import SwitchEditor from './SwitchEditor.vue'
import MergeEditor from './MergeEditor.vue'
import SplitInBatchesEditor from './SplitInBatchesEditor.vue'
import RespondToWebhookEditor from './RespondToWebhookEditor.vue'
import WaitFormEditor from './WaitFormEditor.vue'
import AiAgentEditor from './AiAgentEditor.vue'
import AiModelEditor from './AiModelEditor.vue'
import AiMemoryEditor from './AiMemoryEditor.vue'
import AiToolEditor from './AiToolEditor.vue'
import TextDatasetEditor from './TextDatasetEditor.vue'
import FileDatasetEditor from './FileDatasetEditor.vue'
import DatabaseDatasetEditor from './DatabaseDatasetEditor.vue'
import EmbeddingsEditor from './EmbeddingsEditor.vue'
import VectorStoreEditor from './VectorStoreEditor.vue'
import RetrieverEditor from './RetrieverEditor.vue'

export const NODE_EDITOR_REGISTRY: Partial<Record<WorkflowNodeType | 'trigger', Component>> = {
  plugin: PluginEditor,
  code: CodeEditor,
  if: IfEditor,
  loop: LoopEditor,
  subworkflow: SubWorkflowEditor,
  http: HttpEditor,
  event: EventEditor,
  'event-listener': EventListenerEditor,
  trigger: TriggerEditor,
  set: SetEditor,
  switch: SwitchEditor,
  merge: MergeEditor,
  'split-in-batches': SplitInBatchesEditor,
  'respond-webhook': RespondToWebhookEditor,
  'wait-form': WaitFormEditor,
  'ai-agent': AiAgentEditor,
  'ai-model': AiModelEditor,
  'ai-memory': AiMemoryEditor,
  'ai-tool': AiToolEditor,
  'text-dataset': TextDatasetEditor,
  'file-dataset': FileDatasetEditor,
  'database-dataset': DatabaseDatasetEditor,
  embeddings: EmbeddingsEditor,
  'vector-store': VectorStoreEditor,
  retriever: RetrieverEditor,
}

export type { NodeEditorProps } from './types'

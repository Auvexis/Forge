<template>
  <div class="variable-tree">
    <!-- Search bar -->
    <div class="vt-search mb-4">
      <BaseInput v-model="search" icon-left="search" placeholder="Search variables..." />
    </div>

    <JsonTreeView 
      v-if="Object.keys(mockData).length > 0"
      :data="mockData" 
      :is-root="true" 
      :icons="iconsMap"
    />

    <p v-else class="vt-empty">
      No variables found for "{{ search }}"
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GraphNode } from '@vue-flow/core'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import JsonTreeView from '../shared/JsonTreeView.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import {
  resolveSchemaTree,
  resolveTriggerPaths,
  type SchemaPath,
} from '@/core/utils/schemaResolver'
import type { WorkflowTrigger, WorkflowNode, PluginNode } from '@/core/types/workflow.types'
import type { NodeData } from './types'
import { useWorkflowStore } from '../../../stores/workflow.store'
import { useExecutionStore } from '../../../stores/execution.store'

const props = defineProps<{
  paramKey: string
  upstreamNodes: GraphNode<NodeData>[]
  nodes: GraphNode<NodeData>[]
}>()

const executionStore = useExecutionStore()

const emit = defineEmits<{
  (e: 'inject', paramKey: string, path: string): void
}>()

const search = ref('')

const { data: plugins, execute: fetchPlugins } = useApi(pluginsApi.getAll, [])
fetchPlugins()

// ... (removed getVariableDisplayLabel)

const allPaths = computed(() => {
  const paths: SchemaPath[] = []
  const workflowVariables = useWorkflowStore().activeWorkflow?.variables ?? []

  for (const variable of workflowVariables) {
    paths.push({
      path: `variables.${variable.name}`,
      label: variable.name,
      type: variable.type,
      sourceNodeName: 'Workflow Variables',
      value: variable.type === 'secret' ? '••••••••••••' : variable.defaultValue,
    })
  }

  for (const upNode of [...props.upstreamNodes].reverse()) {
    if (upNode.id === 'trigger') {
      const triggerData = upNode.data as unknown as WorkflowTrigger

      // ── Form Trigger: campos ficam em trigger.fields.<name> ──
      if (triggerData?.type === 'form' && triggerData.formFields && triggerData.formFields.length > 0) {
        const triggerOutput = executionStore.nodeStatuses['trigger']?.output as any
        for (const field of triggerData.formFields) {
          if (!field.name) continue
          if (field.type === 'file') {
            paths.push({
              path: `trigger.fields.${field.name}`,
              label: field.label || field.name,
              type: 'object',
              sourceNodeName: 'Trigger (Form)',
              value: triggerOutput?.fields?.[field.name]
            })
            paths.push({
              path: `trigger.fields.${field.name}.filename`,
              label: 'filename',
              type: 'string',
              sourceNodeName: 'Trigger (Form)',
              value: triggerOutput?.fields?.[field.name]?.filename
            })
            paths.push({
              path: `trigger.fields.${field.name}.mimetype`,
              label: 'mimetype',
              type: 'string',
              sourceNodeName: 'Trigger (Form)',
              value: triggerOutput?.fields?.[field.name]?.mimetype
            })
            paths.push({
              path: `trigger.fields.${field.name}.size`,
              label: 'size',
              type: 'number',
              sourceNodeName: 'Trigger (Form)',
              value: triggerOutput?.fields?.[field.name]?.size
            })
            paths.push({
              path: `trigger.fields.${field.name}.buffer`,
              label: 'buffer',
              type: 'object',
              sourceNodeName: 'Trigger (Form)',
              value: triggerOutput?.fields?.[field.name]?.buffer
            })
          } else {
            paths.push({
              path: `trigger.fields.${field.name}`,
              label: field.label || field.name,
              type: field.type === 'number' ? 'number' : field.type === 'checkbox-group' ? 'array' : 'string',
              sourceNodeName: 'Trigger (Form)',
              value: triggerOutput?.fields?.[field.name]
            })
          }
        }
        
        paths.push({
          path: 'trigger.submittedAt',
          label: 'submittedAt',
          type: 'number',
          sourceNodeName: 'Trigger (Form)',
          value: triggerOutput?.submittedAt
        })
        paths.push({
          path: 'trigger.ip',
          label: 'ip',
          type: 'string',
          sourceNodeName: 'Trigger (Form)',
          value: triggerOutput?.ip
        })
        paths.push({
          path: 'trigger.userAgent',
          label: 'userAgent',
          type: 'string',
          sourceNodeName: 'Trigger (Form)',
          value: triggerOutput?.userAgent
        })
        continue
      }

      // ── Manual Trigger: campos ficam em trigger.<name> via schema ──
      if (triggerData?.schema && Object.keys(triggerData.schema).length > 0) {
        paths.push(...resolveTriggerPaths(triggerData.schema))
      } else {
        const lastPayload = useWorkflowStore().activeWorkflow?.trigger?.lastTriggerPayload
        if (lastPayload) {
          // Flatten the payload dynamically
          const flatten = (obj: any, prefix = 'trigger'): SchemaPath[] => {
            if (!obj || typeof obj !== 'object') return []
            let res: SchemaPath[] = []
            for (const [k, v] of Object.entries(obj)) {
              const newPath = `${prefix}.${k}`
              res.push({
                path: newPath,
                label: k,
                type: Array.isArray(v) ? 'array' : typeof v,
                sourceNodeName: 'Trigger',
                value: v
              })
              if (v && typeof v === 'object' && !Array.isArray(v)) {
                res.push(...flatten(v, newPath))
              }
            }
            return res
          }
          paths.push(...flatten(lastPayload))
        } else {
          paths.push({
            path: 'trigger.payload',
            label: 'trigger.payload',
            type: 'any',
            sourceNodeName: 'Trigger',
          })
        }
      }
      continue
    }

    const upData = upNode.data as unknown as WorkflowNode
    const nodeName: string = upData.name || upNode.id
    const liveOutput = executionStore.nodeStatuses[upNode.id]?.output

    // Flatten helper for dynamic live output inference
    const flattenLive = (obj: any, prefix: string): SchemaPath[] => {
      if (obj === null || obj === undefined) return []
      let res: SchemaPath[] = []
      for (const [k, v] of Object.entries(obj)) {
        const newPath = `${prefix}.${k}`
        const vType = Array.isArray(v) ? 'array' : typeof v
        res.push({
          path: newPath,
          label: k,
          type: vType,
          sourceNodeName: nodeName,
          value: v
        })
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          res.push(...flattenLive(v, newPath))
        }
      }
      return res
    }

    // 1. Dynamic Inference: If the node has run, we use its EXACT real-time output
    if (liveOutput !== undefined && liveOutput !== null) {
      if (typeof liveOutput === 'object' && !Array.isArray(liveOutput)) {
        paths.push({
          path: `steps.${upNode.id}.output`,
          label: 'output',
          type: 'object',
          sourceNodeName: nodeName,
          value: liveOutput
        })
        paths.push(...flattenLive(liveOutput, `steps.${upNode.id}.output`))
      } else {
        paths.push({
          path: `steps.${upNode.id}.output`,
          label: 'output',
          type: Array.isArray(liveOutput) ? 'array' : typeof liveOutput,
          sourceNodeName: nodeName,
          value: liveOutput
        })
      }
      continue
    }

    // 2. Static Inference: Fallback when the node hasn't run yet
    if (!('pluginId' in upData)) {
      if (upData.type === 'set') {
        const assignments = (upData as any).assignments || [];
        if (assignments.length > 0) {
          for (const assignment of assignments) {
            if (assignment.key) {
              let inferredType = 'any'
              if (assignment.value !== undefined && assignment.value !== null) {
                const strVal = String(assignment.value).trim()
                const match = strVal.match(/^{{\s*(.*?)\s*}}$/)
                if (match) {
                  const refPath = match[1]
                  const foundPath = paths.find(p => p.path === refPath)
                  if (foundPath) inferredType = foundPath.type
                } else if (!isNaN(Number(strVal)) && strVal !== '') {
                  inferredType = 'number'
                } else if (strVal === 'true' || strVal === 'false') {
                  inferredType = 'boolean'
                } else {
                  inferredType = 'string'
                }
              }
              paths.push({
                path: `steps.${upNode.id}.output.${assignment.key}`,
                label: assignment.key,
                type: inferredType,
                sourceNodeName: nodeName,
              })
            }
          }
        } else {
          paths.push({ path: `steps.${upNode.id}.output`, label: 'output', type: 'any', sourceNodeName: nodeName })
        }
      } else if (upData.type === 'switch') {
        paths.push({ path: `steps.${upNode.id}.output.activeHandle`, label: 'activeHandle', type: 'string', sourceNodeName: nodeName })
      } else if (upData.type === 'if') {
        paths.push({ path: `steps.${upNode.id}.output.branch`, label: 'branch', type: 'string', sourceNodeName: nodeName })
      } else if (upData.type === 'merge') {
        // Merge Node passivo não tem dados de output, ele apenas repassa. 
        // Os usuários devem buscar os dados nos nós anteriores.
      } else if (upData.type === 'event-listener') {
        const eventName = (upData as any).eventName
        const workflowNodes = useWorkflowStore().activeWorkflow?.nodes || {}
        let hasParams = false
        
        for (const n of Object.values(workflowNodes)) {
          if (n.type === 'event' && (n as any).eventName === eventName) {
            const params = (n as any).payloadParams || []
            for (const param of params) {
              if (param.key) {
                paths.push({
                  path: `steps.${upNode.id}.output.${param.key}`,
                  label: param.key,
                  type: 'any',
                  sourceNodeName: nodeName
                })
                hasParams = true
              }
            }
          }
        }
        
        if (!hasParams) {
          paths.push({ path: `steps.${upNode.id}.output`, label: 'output', type: 'any', sourceNodeName: nodeName })
        }
      } else {
        paths.push({ path: `steps.${upNode.id}.output`, label: 'output', type: 'any', sourceNodeName: nodeName })
      }
      continue
    }

    const pluginNodeData = upData as PluginNode
    const upPlugin = plugins.value?.find((p) => p.id === pluginNodeData.pluginId)
    const upMethod = upPlugin?.manifest.methods[pluginNodeData.action]

    if (upMethod?.responseSchema) {
      paths.push(...resolveSchemaTree(upNode.id, nodeName, upMethod.responseSchema))
    } else {
      paths.push({ path: `steps.${upNode.id}.output`, label: 'output', type: 'any', sourceNodeName: nodeName })
    }
  }

  // Deduplicate
  const deduped: SchemaPath[] = []
  const seen = new Set<string>()
  for (const p of paths) {
    if (seen.has(p.path)) continue
    seen.add(p.path)
    deduped.push(p)
  }

  return deduped
})

const filteredPaths = computed(() => {
  if (!search.value) return allPaths.value
  const lowerSearch = search.value.toLowerCase()
  return allPaths.value.filter(
    (p) =>
      p.path.toLowerCase().includes(lowerSearch) ||
      p.label.toLowerCase().includes(lowerSearch) ||
      p.sourceNodeName.toLowerCase().includes(lowerSearch),
  )
})

const mockData = computed(() => {
  // Pre-seed to guarantee insertion order (trigger first, then steps)
  const obj: any = { variables: {}, trigger: {}, steps: {} }
  
  for (const p of filteredPaths.value) {
    const parts = p.path.split('.')
    let current = obj
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] as string
      if (i === parts.length - 1) {
        if (p.value !== undefined) {
          try {
            current[part] = JSON.parse(JSON.stringify(p.value))
          } catch {
            current[part] = String(p.value)
          }
        } else {
          current[part] = p.type || 'any'
        }
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {}
        }
        current = current[part]
      }
    }
  }
  
  if (Object.keys(obj.trigger).length === 0) delete obj.trigger
  if (Object.keys(obj.steps).length === 0) delete obj.steps
  if (Object.keys(obj.variables).length === 0) delete obj.variables
  
  return obj
})

const iconsMap = computed(() => {
  const map: Record<string, string> = {}
  
  // Assign a specific icon for the steps root
  map['steps'] = 'blocks'
  map['variables'] = 'tags'
  
  const typeIcons: Record<string, string> = {
    http: 'globe',
    code: 'code',
    loop: 'repeat',
    subworkflow: 'layers',
    event: 'bell',
    'event-listener': 'radio',
    if: 'git-branch',
    set: 'sliders-horizontal',
    switch: 'git-branch-plus',
    merge: 'merge',
    'split-in-batches': 'layers',
    'respond-webhook': 'send',
  }

  for (const upNode of props.upstreamNodes) {
    if (upNode.id === 'trigger') {
      const triggerData = upNode.data as unknown as WorkflowTrigger
      if (triggerData?.type === 'form') {
        map['trigger'] = 'file-text'
        map['trigger.fields'] = 'list'
      } else {
        map['trigger'] = 'zap'
        map['trigger.payload'] = 'package'
      }
      continue
    }

    const upData = upNode.data as unknown as WorkflowNode
    
    if ('pluginId' in upData) {
      const pluginNodeData = upData as PluginNode
      const upPlugin = plugins.value?.find((p) => p.id === pluginNodeData.pluginId)
      if (upPlugin?.manifest.metadata.icon) {
        map[`steps.${upNode.id}`] = upPlugin.manifest.metadata.icon
      } else {
        map[`steps.${upNode.id}`] = 'puzzle'
      }
    } else {
      map[`steps.${upNode.id}`] = upNode.type ? (typeIcons[upNode.type] || 'settings') : 'settings'
    }

    // Assign a specific icon for the output root of the node
    map[`steps.${upNode.id}.output`] = 'file-output'
  }
  
  return map
})
</script>

<style scoped>
.variable-tree {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
  margin-top: var(--nod8-space-1);
}

.vt-search {
  display: flex;
  align-items: center;
}

.vt-search-icon {
  color: var(--nod8-text-muted);
  flex-shrink: 0;
}

.vt-search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 11px;
  outline: none;
  color: var(--nod8-text-primary);
}

.vt-search-input::placeholder {
  color: var(--nod8-text-muted);
  opacity: 0.5;
}



.vt-empty {
  font-size: 11px;
  color: var(--nod8-text-muted);
  font-style: italic;
  padding: 0 4px;
}
</style>

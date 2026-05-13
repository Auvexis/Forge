import type { NodeExecutionState } from '@/core/types/execution.types'
import type { WorkflowNode } from '@/core/types/workflow.types'
import type { VariableTreePath } from './editors/variableTreeInference.ts'
import { inferEventListenerPaths } from './editors/variableTreeInference.ts'

type NodeStatuses = Record<string, NodeExecutionState>

interface NodeTestExecutionContext {
  trigger: unknown
  steps: Record<string, { status: string; output?: unknown; error?: string }>
  variables: Record<string, unknown>
}

interface EventListenerPreviewOptions {
  eventName: string
  workflowNodes: Record<string, WorkflowNode | any>
  nodeStatuses: NodeStatuses
}

function flattenOutput(
  output: unknown,
  prefix: string,
  sourceNodeName: string,
): VariableTreePath[] {
  if (output === null || output === undefined) return []

  if (typeof output !== 'object' || Array.isArray(output)) {
    return [
      {
        path: prefix,
        label: 'output',
        type: Array.isArray(output) ? 'array' : typeof output,
        sourceNodeName,
        value: output,
      },
    ]
  }

  const paths: VariableTreePath[] = [
    {
      path: prefix,
      label: 'output',
      type: 'object',
      sourceNodeName,
      value: output,
    },
  ]

  for (const [key, value] of Object.entries(output)) {
    const childPath = `${prefix}.${key}`
    paths.push({
      path: childPath,
      label: key,
      type: Array.isArray(value) ? 'array' : typeof value,
      sourceNodeName,
      value,
    })
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...flattenOutput(value, childPath, sourceNodeName))
    }
  }

  return paths
}

export function buildNodeTestExecutionContext(
  nodeStatuses: NodeStatuses,
  variables: Record<string, unknown> = {},
): NodeTestExecutionContext {
  const context: NodeTestExecutionContext = {
    trigger: {},
    steps: {},
    variables,
  }

  for (const [nodeId, state] of Object.entries(nodeStatuses)) {
    if (state.status !== 'success' || state.output === undefined) continue

    if (nodeId === 'trigger') {
      context.trigger = state.output
      continue
    }

    context.steps[nodeId] = {
      status: 'SUCCESS',
      output: state.output,
    }
  }

  return context
}

export function buildKnownPathsFromNodeStatuses(nodeStatuses: NodeStatuses): VariableTreePath[] {
  const paths: VariableTreePath[] = []

  for (const [nodeId, state] of Object.entries(nodeStatuses)) {
    if (state.status !== 'success' || state.output === undefined) continue

    if (nodeId === 'trigger') {
      paths.push(...flattenOutput(state.output, 'trigger', 'Trigger'))
      continue
    }

    paths.push(...flattenOutput(state.output, `steps.${nodeId}.output`, nodeId))
  }

  return paths
}

export function buildEventListenerInputPreview(
  options: EventListenerPreviewOptions,
): Record<string, unknown> | null {
  const paths = inferEventListenerPaths({
    eventName: options.eventName,
    listenerNodeId: 'event-listener-preview',
    sourceNodeName: 'Event Listener',
    workflowNodes: options.workflowNodes,
    knownPaths: buildKnownPathsFromNodeStatuses(options.nodeStatuses),
  })

  const preview: Record<string, unknown> = {}
  for (const path of paths) {
    preview[path.label] = path.value !== undefined ? path.value : path.type || 'any'
  }

  return Object.keys(preview).length > 0 ? preview : null
}

import type { NodeExecutionState } from '@/core/types/execution.types'
import type { WorkflowNode, WorkflowTrigger } from '@/core/types/workflow.types'
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
  listenerNodeId?: string
  sourceNodeName?: string
  workflowNodes: Record<string, WorkflowNode | any>
  nodeStatuses: NodeStatuses
}

export interface AgentNodePreview {
  title: string
  summary: string
  details: Record<string, unknown>
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
  const paths = buildEventListenerOutputPathsFromStatuses({
    ...options,
    listenerNodeId: options.listenerNodeId ?? 'event-listener-preview',
    sourceNodeName: options.sourceNodeName ?? 'Event Listener',
  })

  const preview: Record<string, unknown> = {}
  for (const path of paths) {
    preview[path.label] = path.value !== undefined ? path.value : path.type || 'any'
  }

  return Object.keys(preview).length > 0 ? preview : null
}

export function buildEventListenerOutputPathsFromStatuses(
  options: Required<Pick<EventListenerPreviewOptions, 'eventName' | 'workflowNodes' | 'nodeStatuses'>> & {
    listenerNodeId: string
    sourceNodeName: string
  },
): VariableTreePath[] {
  return inferEventListenerPaths({
    eventName: options.eventName,
    listenerNodeId: options.listenerNodeId,
    sourceNodeName: options.sourceNodeName,
    workflowNodes: options.workflowNodes,
    knownPaths: buildKnownPathsFromNodeStatuses(options.nodeStatuses),
  })
}

export function buildAgentNodePreview(
  node: WorkflowNode | WorkflowTrigger,
): AgentNodePreview | null {
  if ('type' in node && node.type === 'ai-agent') {
    return {
      title: node.name,
      summary: `${node.providerCount ?? 0} provider nodes, ${node.memoryCount ?? 0} memory nodes, ${node.toolCount ?? 0} tools`,
      details: {
        provider: node.providerCount ?? 0,
        memory: node.memoryCount ?? 0,
        tools: node.toolCount ?? 0,
        outputMode: node.outputMode,
      },
    }
  }

  if ('type' in node && node.type === 'ai-model') {
    return {
      title: node.name,
      summary: `${node.pluginId} / ${node.model}`,
      details: {
        pluginId: node.pluginId,
        adapter: node.adapter,
        model: node.model,
        temperature: node.temperature,
      },
    }
  }

  if ('type' in node && node.type === 'ai-memory') {
    return {
      title: node.name,
      summary: `${node.scope} memory`,
      details: {
        memory: node.scope,
        readEnabled: node.readEnabled,
        writeEnabled: node.writeEnabled,
        maxRetrievedMemories: node.maxRetrievedMemories,
      },
    }
  }

  if ('type' in node && node.type === 'ai-tool') {
    return {
      title: node.name,
      summary: `${node.pluginId} / ${node.methodId}`,
      details: {
        tools: `${node.pluginId}.${node.methodId}`,
        sideEffect: node.sideEffect,
        requiresApproval: node.requiresApproval,
      },
    }
  }

  if ('type' in node && node.type === 'chat') {
    return {
      title: node.chatTitle ?? 'Chat Trigger',
      summary: `${node.chatSlug ?? 'chat'} chat`,
      details: {
        chat: node.chatSlug ?? 'chat',
        chatAuthMode: node.chatAuthMode ?? 'profile',
        chatSessionMode: node.chatSessionMode ?? 'resume-by-session-id',
        chatRateLimitPerMinute: node.chatRateLimitPerMinute,
      },
    }
  }

  return null
}

import type {
  ExecutionLog,
  ExecutionTimelineEvent,
  NodeExecutionState,
  NodeExecutionStatus,
  WorkflowExecutionStatus,
} from '@/core/types/execution.types'
import type { WorkflowItem, WorkflowNode } from '@/core/types/workflow.types'
import type {
  ExecutionNodePresentation,
  ExecutionRunDetailModel,
  ExecutionRunTreeNode,
} from './executionRunTree.types.ts'

const NODE_ICON: Record<string, string> = {
  trigger: 'play',
  plugin: 'puzzle',
  code: 'code-2',
  http: 'globe-2',
  if: 'git-branch',
  switch: 'git-branch-plus',
  merge: 'git-merge',
  loop: 'repeat-2',
  set: 'list-plus',
  'call-workflow': 'workflow',
  return: 'corner-down-left',
  event: 'send',
  'event-listener': 'radio',
  'split-in-batches': 'list-restart',
  'respond-webhook': 'reply',
  'wait-form': 'clipboard-list',
  'ai-agent': 'bot',
  'ai-model': 'brain',
  'ai-memory': 'database',
  'ai-tool': 'wrench',
  embeddings: 'scan-text',
  'vector-store': 'database-zap',
  retriever: 'search',
  'basic-llm-chain': 'link',
  'structured-json-parser': 'braces',
  'vector-store-retriever': 'search-code',
  'question-answer-chain': 'message-circle-question',
  'vector-store-tool': 'database-zap',
}

const NODE_ICON_COLOR: Record<string, string> = {
  code: 'var(--sailor-node-codeblock-icon)',
  http: 'var(--sailor-node-http-icon)',
  if: 'var(--sailor-node-if-icon)',
  switch: 'var(--sailor-node-switch-icon)',
  merge: 'var(--sailor-node-merge-icon)',
  loop: 'var(--sailor-node-loop-icon)',
  set: 'var(--sailor-node-set-icon)',
  'call-workflow': 'var(--sailor-node-call-workflow-icon)',
  return: 'var(--sailor-node-return-icon)',
  event: 'var(--sailor-node-event-icon)',
  'event-listener': 'var(--sailor-node-event-listener-icon)',
  'split-in-batches': 'var(--sailor-node-split-icon)',
  'respond-webhook': 'var(--sailor-node-respond-webhook-icon)',
}

type ExecutionStep = NonNullable<ExecutionLog['context']['steps']>[string] & { input?: unknown }

export function buildLiveExecutionLog(input: {
  executionId: string | null
  workflowId: string | null
  workflowStatus: WorkflowExecutionStatus | null
  timeline: ExecutionTimelineEvent[]
  nodeStatuses: Record<string, NodeExecutionState | undefined>
}): ExecutionLog | null {
  if (!input.executionId || !input.workflowId) return null
  const events = input.timeline.filter((event) => !event.executionId || event.executionId === input.executionId)
  const timestamps = events.map((event) => event.timestamp)
  const startedAt = timestamps.length ? Math.min(...timestamps) : Date.now()
  const status = input.workflowStatus ?? 'RUNNING'
  const endedAt = status === 'RUNNING' ? null : (timestamps.length ? Math.max(...timestamps) : startedAt)
  const steps = Object.fromEntries(
    Object.entries(input.nodeStatuses)
      .filter((entry): entry is [string, NodeExecutionState] => entry[1] !== undefined && entry[1].status !== 'idle')
      .map(([nodeId, state]) => [nodeId, {
        status: state.status.toUpperCase(),
        input: state.input,
        output: state.output,
        error: state.error,
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        attempts: state.attempts,
        retries: state.retries,
      }]),
  )
  return {
    id: input.executionId,
    workflowId: input.workflowId,
    status,
    startedAt,
    endedAt,
    context: { steps },
  }
}

export function buildExecutionRunDetail(input: {
  workflow: WorkflowItem | null
  run: ExecutionLog
  nodePresentations?: Record<string, ExecutionNodePresentation>
}): ExecutionRunDetailModel {
  const steps = input.run.context.steps ?? {}
  const executedIds = Object.keys(steps)
  const executedSet = new Set(executedIds)
  const parentByChild = new Map<string, string>()
  const childIdsByParent = new Map<string, string[]>()

  for (const edge of input.workflow?.edges ?? []) {
    if (!executedSet.has(edge.source) || !executedSet.has(edge.target)) continue
    const configurationEdge = Boolean(edge.targetHandle && edge.targetHandle !== 'target')
    const parentId = configurationEdge ? edge.target : edge.source
    const childId = configurationEdge ? edge.source : edge.target
    if (parentId === childId || parentByChild.has(childId)) continue
    parentByChild.set(childId, parentId)
    const children = childIdsByParent.get(parentId) ?? []
    children.push(childId)
    childIdsByParent.set(parentId, children)
  }

  const nodesById: Record<string, ExecutionRunTreeNode | undefined> = {}
  for (const nodeId of executedIds) {
    nodesById[nodeId] = createTreeNode(
      nodeId,
      steps[nodeId]!,
      input.workflow,
      parentByChild.get(nodeId) ?? null,
      input.nodePresentations,
    )
  }

  const attachChildren = (node: ExecutionRunTreeNode, ancestors: Set<string>) => {
    if (ancestors.has(node.nodeId)) return
    const nextAncestors = new Set(ancestors).add(node.nodeId)
    node.children = (childIdsByParent.get(node.nodeId) ?? [])
      .map((id) => nodesById[id])
      .filter((child): child is ExecutionRunTreeNode => child !== undefined)
      .filter((child) => !nextAncestors.has(child.nodeId))
    node.children.forEach((child) => attachChildren(child, nextAncestors))
  }

  const roots = executedIds
    .filter((nodeId) => !parentByChild.has(nodeId))
    .map((nodeId) => nodesById[nodeId]!)
  roots.forEach((root) => attachChildren(root, new Set()))

  return {
    id: input.run.id,
    workflowId: input.run.workflowId,
    status: input.run.status,
    startedAt: input.run.startedAt,
    endedAt: input.run.endedAt,
    durationMs: durationBetween(input.run.startedAt, input.run.endedAt ?? undefined),
    roots,
    nodesById,
  }
}

function createTreeNode(
  nodeId: string,
  step: ExecutionStep,
  workflow: WorkflowItem | null,
  parentId: string | null,
  nodePresentations?: Record<string, ExecutionNodePresentation>,
): ExecutionRunTreeNode {
  const node = workflow?.nodes[nodeId] as WorkflowNode | undefined
  const type = node?.type ?? 'unknown'
  const presentation = nodePresentations?.[nodeId] ?? nodePresentations?.[type]
  const agentName = node?.type === 'ai-agent'
    ? node.agentDisplayName?.trim() || node.name?.trim() || 'AI Agent'
    : null
  return {
    id: nodeId,
    nodeId,
    parentId,
    name: agentName ? `${agentName} - AI Agent` : node?.name || nodeId,
    type,
    icon: presentation?.icon || node?.ui?.icon || NODE_ICON[type] || 'box',
    iconColor: presentation?.iconColor || NODE_ICON_COLOR[type] || 'var(--sailor-text-secondary)',
    avatar: node?.type === 'ai-agent' ? node.agentEmoji?.trim() || '🤖' : undefined,
    status: normalizeNodeStatus(step.status),
    startedAt: step.startedAt,
    endedAt: step.endedAt,
    durationMs: durationBetween(step.startedAt, step.endedAt),
    input: step.input,
    output: step.output,
    error: step.error,
    attempts: step.attempts,
    retries: step.retries,
    children: [],
  }
}

function normalizeNodeStatus(status: string): NodeExecutionStatus {
  const normalized = status.toLowerCase()
  if (normalized === 'running' || normalized === 'retrying' || normalized === 'success' || normalized === 'failed' || normalized === 'waiting') return normalized
  return 'idle'
}

function durationBetween(startedAt?: number, endedAt?: number): number | null {
  return startedAt !== undefined && endedAt !== undefined ? Math.max(0, endedAt - startedAt) : null
}

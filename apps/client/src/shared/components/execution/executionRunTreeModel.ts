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
  ExecutionRunFinalResult,
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
  code: 'var(--fabric-node-codeblock-icon)',
  http: 'var(--fabric-node-http-icon)',
  if: 'var(--fabric-node-if-icon)',
  switch: 'var(--fabric-node-switch-icon)',
  merge: 'var(--fabric-node-merge-icon)',
  loop: 'var(--fabric-node-loop-icon)',
  set: 'var(--fabric-node-set-icon)',
  'call-workflow': 'var(--fabric-node-call-workflow-icon)',
  return: 'var(--fabric-node-return-icon)',
  event: 'var(--fabric-node-event-icon)',
  'event-listener': 'var(--fabric-node-event-listener-icon)',
  'split-in-batches': 'var(--fabric-node-split-icon)',
  'respond-webhook': 'var(--fabric-node-respond-webhook-icon)',
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
  const status = input.workflowStatus ?? inferExecutionStatus(events) ?? 'RUNNING'
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
  const parentIdsByChild = new Map<string, string[]>()
  const childIdsByParent = new Map<string, string[]>()

  for (const edge of input.workflow?.edges ?? []) {
    if (!executedSet.has(edge.source) || !executedSet.has(edge.target)) continue
    const configurationEdge = Boolean(edge.targetHandle && edge.targetHandle !== 'target')
    const parentId = configurationEdge ? edge.target : edge.source
    const childId = configurationEdge ? edge.source : edge.target
    if (parentId === childId) continue
    const parents = parentIdsByChild.get(childId) ?? []
    parents.push(parentId)
    parentIdsByChild.set(childId, parents)
    const children = childIdsByParent.get(parentId) ?? []
    children.push(childId)
    childIdsByParent.set(parentId, children)
  }

  const nodesById: Record<string, ExecutionRunTreeNode | undefined> = {}
  for (const nodeId of executedIds) {
    const treeNode = createTreeNode(
      nodeId,
      steps[nodeId]!,
      input.workflow,
      parentIdsByChild.get(nodeId)?.[0] ?? null,
      input.nodePresentations,
    )
    nodesById[nodeId] = treeNode
    for (const child of treeNode.children) nodesById[child.nodeId] = child
  }

  const instantiateTreeNode = (
    nodeId: string,
    parentId: string | null,
    visualId: string,
    ancestors: Set<string>,
    includeGraphChildren = true,
  ): ExecutionRunTreeNode | null => {
    if (ancestors.has(nodeId)) return null
    const step = steps[nodeId]
    if (!step) return null
    const node = createTreeNode(nodeId, step, input.workflow, parentId, input.nodePresentations)
    node.id = visualId
    if (includeGraphChildren) attachChildren(node, ancestors)
    return node
  }

  const attachChildren = (node: ExecutionRunTreeNode, ancestors: Set<string>) => {
    const nextAncestors = new Set(ancestors).add(node.nodeId)
    const graphChildren = (childIdsByParent.get(node.nodeId) ?? [])
      .map((id) => {
        const primaryParentId = parentIdsByChild.get(id)?.[0] ?? node.nodeId
        return instantiateTreeNode(
          id,
          node.nodeId,
          `${node.id}>${id}`,
          nextAncestors,
          primaryParentId === node.nodeId,
        )
      })
      .filter((child): child is ExecutionRunTreeNode => child !== null)
    node.children = [...node.children, ...graphChildren]
  }

  const roots = executedIds
    .filter((nodeId) => !parentIdsByChild.has(nodeId))
    .map((nodeId) => instantiateTreeNode(nodeId, null, nodeId, new Set()))
    .filter((node): node is ExecutionRunTreeNode => node !== null)

  return {
    id: input.run.id,
    workflowId: input.run.workflowId,
    status: input.run.status,
    startedAt: input.run.startedAt,
    endedAt: input.run.endedAt,
    durationMs: durationBetween(input.run.startedAt, input.run.endedAt ?? undefined),
    finalResult: buildFinalResult(input.run),
    roots,
    nodesById,
  }
}

function buildFinalResult(run: ExecutionLog): ExecutionRunFinalResult | undefined {
  const source = run.context.resultSource
  if (!source) return undefined
  const label = source.type === 'return' ? 'Returned result' : 'Executed steps result'
  return {
    label,
    sourceType: source.type,
    nodeId: source.nodeId,
    value: run.context.result,
  }
}

function inferExecutionStatus(events: ExecutionTimelineEvent[]): WorkflowExecutionStatus | null {
  for (const event of [...events].reverse()) {
    if (event.type === 'workflow:success' || event.type === 'job:success') return 'SUCCESS'
    if (event.type === 'workflow:failed' || event.type === 'job:failed') return 'FAILED'
    if (event.type === 'workflow:cancelled' || event.type === 'job:cancelled') return 'CANCELLED'
  }
  return null
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
    kind: 'node',
    name: agentName ? `${agentName} - AI Agent` : node?.name || nodeId,
    type,
    icon: presentation?.icon || node?.ui?.icon || NODE_ICON[type] || 'box',
    iconColor: presentation?.iconColor || NODE_ICON_COLOR[type] || 'var(--fabric-text-secondary)',
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
    children: step.error ? [createErrorTreeNode(nodeId, step.error)] : [],
  }
}

function createErrorTreeNode(parentId: string, error: string): ExecutionRunTreeNode {
  const nodeId = `${parentId}:error`
  return {
    id: nodeId,
    nodeId,
    parentId,
    kind: 'error',
    name: 'Error',
    type: 'error',
    icon: 'circle-alert',
    iconColor: 'var(--fabric-status-error-border)',
    status: 'failed',
    durationMs: null,
    error,
    children: [],
  }
}

function normalizeNodeStatus(status: unknown): NodeExecutionStatus {
  const normalized = typeof status === 'string' ? status.toLowerCase() : ''
  if (normalized === 'running' || normalized === 'retrying' || normalized === 'success' || normalized === 'failed' || normalized === 'waiting') return normalized
  return 'idle'
}

function durationBetween(startedAt?: number, endedAt?: number): number | null {
  return startedAt !== undefined && endedAt !== undefined ? Math.max(0, endedAt - startedAt) : null
}

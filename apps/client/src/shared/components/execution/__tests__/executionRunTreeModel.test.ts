import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ExecutionLog } from '@/core/types/execution.types'
import type { WorkflowItem } from '@/core/types/workflow.types'
import { buildExecutionRunDetail, buildLiveExecutionLog } from '../executionRunTreeModel.ts'

const workflow = {
  metadata: { id: 'wf-1', name: 'Agent Flow', version: '1', isActive: true, isDraft: false, public: false },
  trigger: { type: 'manual' },
  nodes: {
    agent: { type: 'ai-agent', name: 'AI Agent', agentDisplayName: 'Fabric', agentEmoji: '⚓' },
    model: { type: 'ai-model', name: 'OpenAI Chat Model', ui: { positionX: 0, positionY: 0, icon: 'brain' } },
    tool: { type: 'vector-store-tool', name: 'Vector Tool' },
    output: { type: 'set', name: 'Final Output' },
    detached: { type: 'code', name: 'Detached Step' },
  },
  edges: [
    { id: 'model-agent', source: 'model', target: 'agent', targetHandle: 'model' },
    { id: 'tool-agent', source: 'tool', target: 'agent', targetHandle: 'tool' },
    { id: 'agent-output', source: 'agent', target: 'output', targetHandle: 'target' },
  ],
} as unknown as WorkflowItem

const run = {
  id: 'run-1',
  workflowId: 'wf-1',
  status: 'SUCCESS',
  startedAt: 100,
  endedAt: 900,
  context: {
    steps: {
      agent: { status: 'SUCCESS', input: { prompt: 'hello' }, output: { answer: 'hi' }, startedAt: 100, endedAt: 800 },
      model: { status: 'SUCCESS', output: { tokens: 8 }, startedAt: 150, endedAt: 400 },
      tool: { status: 'SUCCESS', output: { matches: [] }, startedAt: 410, endedAt: 700 },
      output: { status: 'SUCCESS', output: { answer: 'hi' }, startedAt: 800, endedAt: 850 },
      detached: { status: 'FAILED', error: 'boom', startedAt: 860, endedAt: 900 },
    },
  },
} as unknown as ExecutionLog

describe('execution run tree model', () => {
  it('builds executed hierarchy and reverses advanced configuration edges', () => {
    const detail = buildExecutionRunDetail({ workflow, run })

    assert.deepEqual(detail.roots.map((node) => node.nodeId), ['agent', 'detached'])
    assert.deepEqual(detail.roots[0]?.children.map((node) => node.nodeId), ['model', 'tool', 'output'])
    assert.equal(detail.roots[0]?.name, 'Fabric - AI Agent')
    assert.equal(detail.roots[0]?.avatar, '⚓')
  })

  it('uses real node presentation and execution details', () => {
    const detail = buildExecutionRunDetail({
      workflow,
      run,
      nodePresentations: {
        'ai-model': { icon: 'sparkles', iconColor: 'rgb(16, 185, 129)' },
      },
    })
    const model = detail.nodesById.model

    assert.equal(model?.name, 'OpenAI Chat Model')
    assert.equal(model?.icon, 'sparkles')
    assert.equal(model?.iconColor, 'rgb(16, 185, 129)')
    assert.equal(model?.durationMs, 250)
    assert.deepEqual(model?.output, { tokens: 8 })
    assert.equal(detail.nodesById.detached?.error, 'boom')
    assert.equal(detail.nodesById.detached?.children[0]?.kind, 'error')
    assert.equal(detail.nodesById.detached?.children[0]?.icon, 'circle-alert')
    assert.equal(detail.nodesById['detached:error']?.error, 'boom')
  })

  it('exposes explicit Return results in the run detail model', () => {
    const detail = buildExecutionRunDetail({
      workflow,
      run: {
        ...run,
        context: {
          ...run.context,
          result: { recipe: 'cake' },
          resultSource: { type: 'return', nodeId: 'return_1' },
        },
      } as ExecutionLog,
    })

    assert.deepEqual(detail.finalResult, {
      label: 'Returned result',
      sourceType: 'return',
      nodeId: 'return_1',
      value: { recipe: 'cake' },
    })
  })

  it('exposes fallback steps results in the run detail model', () => {
    const detail = buildExecutionRunDetail({
      workflow,
      run: {
        ...run,
        context: {
          ...run.context,
          result: { steps: { output: { answer: 'hi' } } },
          resultSource: { type: 'fallback-steps' },
        },
      } as ExecutionLog,
    })

    assert.deepEqual(detail.finalResult, {
      label: 'Executed steps result',
      sourceType: 'fallback-steps',
      nodeId: undefined,
      value: { steps: { output: { answer: 'hi' } } },
    })
  })

  it('degrades missing graph metadata to ordered flat roots', () => {
    const detail = buildExecutionRunDetail({ workflow: null, run })

    assert.deepEqual(detail.roots.map((node) => node.nodeId), ['agent', 'model', 'tool', 'output', 'detached'])
    assert.equal(detail.roots[0]?.icon, 'box')
  })

  it('groups multi-parent branches before the shared child', () => {
    const multiParentWorkflow = {
      metadata: { id: 'wf-merge', name: 'Merge Flow', version: '1', isActive: true, isDraft: false, public: false },
      trigger: { type: 'manual' },
      nodes: {
        trigger: { type: 'trigger', name: 'Trigger' },
        httpA: { type: 'http', name: 'HTTP Request' },
        httpB: { type: 'http', name: 'HTTP Request' },
        merge: { type: 'merge', name: 'Merge' },
        done: { type: 'return', name: 'Return' },
      },
      edges: [
        { id: 'trigger-http-a', source: 'trigger', target: 'httpA', targetHandle: 'target' },
        { id: 'trigger-http-b', source: 'trigger', target: 'httpB', targetHandle: 'target' },
        { id: 'http-a-merge', source: 'httpA', target: 'merge', targetHandle: 'target' },
        { id: 'http-b-merge', source: 'httpB', target: 'merge', targetHandle: 'target' },
        { id: 'merge-done', source: 'merge', target: 'done', targetHandle: 'target' },
      ],
    } as unknown as WorkflowItem
    const detail = buildExecutionRunDetail({
      workflow: multiParentWorkflow,
      run: {
        id: 'run-merge',
        workflowId: 'wf-merge',
        status: 'SUCCESS',
        startedAt: 1,
        endedAt: 10,
        context: {
          steps: {
            trigger: { status: 'SUCCESS', startedAt: 1, endedAt: 2 },
            httpA: { status: 'SUCCESS', startedAt: 2, endedAt: 4 },
            httpB: { status: 'SUCCESS', startedAt: 2, endedAt: 4 },
            merge: { status: 'SUCCESS', startedAt: 4, endedAt: 5 },
            done: { status: 'SUCCESS', startedAt: 5, endedAt: 6 },
          },
        },
      } as unknown as ExecutionLog,
    })

    const trigger = detail.roots.find((node) => node.nodeId === 'trigger')
    const joinGroup = trigger?.children.find((node) => node.kind === 'group')
    const httpA = joinGroup?.children.find((node) => node.nodeId === 'httpA')
    const httpB = joinGroup?.children.find((node) => node.nodeId === 'httpB')
    const sharedMerge = joinGroup?.children.find((node) => node.nodeId === 'merge')

    assert.equal(trigger?.children.length, 1)
    assert.equal(joinGroup?.name, '2 branches join')
    assert.equal(httpA?.children.some((node) => node.nodeId === 'merge'), false)
    assert.equal(httpB?.children.some((node) => node.nodeId === 'merge'), false)
    assert.equal(sharedMerge?.parentId, 'trigger')
    assert.equal(sharedMerge?.children.some((node) => node.nodeId === 'done'), true)
  })

  it('treats persisted steps without status as idle instead of crashing', () => {
    const detail = buildExecutionRunDetail({
      workflow,
      run: {
        ...run,
        context: {
          ...run.context,
          steps: {
            agent: { output: { error: 'Model returned invalid JSON' } },
          },
        },
      } as unknown as ExecutionLog,
    })

    assert.equal(detail.nodesById.agent?.status, 'idle')
    assert.deepEqual(detail.nodesById.agent?.output, { error: 'Model returned invalid JSON' })
  })

  it('normalizes live execution state into the persisted run shape', () => {
    const live = buildLiveExecutionLog({
      executionId: 'live-1',
      workflowId: 'wf-1',
      workflowStatus: 'RUNNING',
      timeline: [
        { id: 'start', type: 'workflow:start', executionId: 'live-1', timestamp: 100, status: 'running', label: 'started' },
        { id: 'agent', type: 'node:start', nodeId: 'agent', executionId: 'live-1', timestamp: 120, status: 'running', label: 'agent' },
      ],
      nodeStatuses: { agent: { status: 'running', input: { prompt: 'hi' }, startedAt: 120 } },
    })

    assert.equal(live?.id, 'live-1')
    assert.equal(live?.status, 'RUNNING')
    assert.deepEqual(live?.context.steps?.agent?.input, { prompt: 'hi' })
  })

  it('infers terminal live run status from job timeline events', () => {
    const live = buildLiveExecutionLog({
      executionId: 'live-1',
      workflowId: 'wf-1',
      workflowStatus: null,
      timeline: [
        { id: 'start', type: 'job:start', executionId: 'live-1', timestamp: 100, status: 'running', label: 'started' },
        { id: 'failed', type: 'job:failed', executionId: 'live-1', timestamp: 240, status: 'failed', label: 'failed' },
      ],
      nodeStatuses: { agent: { status: 'failed', error: 'boom', startedAt: 120, endedAt: 220 } },
    })

    assert.equal(live?.status, 'FAILED')
    assert.equal(live?.endedAt, 240)
  })
})

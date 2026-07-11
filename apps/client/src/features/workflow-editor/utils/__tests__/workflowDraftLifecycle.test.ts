import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  clearWorkflowReloadDiscard,
  consumeWorkflowReloadDiscard,
  discardWorkflowDraft,
  markWorkflowReloadDiscard,
} from '../workflowDraftLifecycle.ts'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('workflow draft lifecycle', () => {
  it('removes the active workflow draft when navigation is discarded', () => {
    const local = new MemoryStorage()
    local.setItem('fabric.workflow-draft.workflow-1', 'draft')

    discardWorkflowDraft(local, 'workflow-1')

    assert.equal(local.getItem('fabric.workflow-draft.workflow-1'), null)
  })

  it('consumes a reload discard marker and removes the marked draft', () => {
    const local = new MemoryStorage()
    const session = new MemoryStorage()
    local.setItem('fabric.workflow-draft.workflow-1', 'draft')
    markWorkflowReloadDiscard(session, 'workflow-1')

    assert.equal(consumeWorkflowReloadDiscard(local, session), true)
    assert.equal(local.getItem('fabric.workflow-draft.workflow-1'), null)
    assert.equal(consumeWorkflowReloadDiscard(local, session), false)
  })

  it('clears the reload marker when the user stays on the page', () => {
    const session = new MemoryStorage()
    markWorkflowReloadDiscard(session, 'workflow-1')

    clearWorkflowReloadDiscard(session)

    assert.equal(consumeWorkflowReloadDiscard(new MemoryStorage(), session), false)
  })
})

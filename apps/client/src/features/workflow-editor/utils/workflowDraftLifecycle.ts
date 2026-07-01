const WORKFLOW_DRAFT_PREFIX = 'sailor.workflow-draft.'
const RELOAD_DISCARD_KEY = 'sailor.workflow-discard-on-reload'

export function discardWorkflowDraft(storage: Storage, workflowId: string) {
  storage.removeItem(`${WORKFLOW_DRAFT_PREFIX}${workflowId}`)
}

export function markWorkflowReloadDiscard(storage: Storage, workflowId: string) {
  storage.setItem(RELOAD_DISCARD_KEY, workflowId)
}

export function clearWorkflowReloadDiscard(storage: Storage) {
  storage.removeItem(RELOAD_DISCARD_KEY)
}

export function consumeWorkflowReloadDiscard(local: Storage, session: Storage) {
  const workflowId = session.getItem(RELOAD_DISCARD_KEY)
  if (!workflowId) return false
  discardWorkflowDraft(local, workflowId)
  clearWorkflowReloadDiscard(session)
  return true
}

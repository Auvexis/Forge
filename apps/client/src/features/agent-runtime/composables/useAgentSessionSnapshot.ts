import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { agentChatApi } from '@/core/api/agent-chat.api'
import type { AgentSessionSnapshot } from '../types/agent.types'
import {
  AgentSessionReconciler,
  type AgentSessionReconcilerState,
} from '../services/agent-session-reconciler'

export function useAgentSessionSnapshot(sessionId: () => string | undefined) {
  const snapshot = shallowRef<AgentSessionSnapshot | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef<unknown>(null)
  let reconciler: AgentSessionReconciler | null = null
  let reconcilerSessionId: string | undefined
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let idlePolls = 0
  let liveRuns = 0

  function currentReconciler() {
    const id = sessionId()
    if (!id) return null
    if (reconciler && reconcilerSessionId === id) return reconciler

    reconcilerSessionId = id
    reconciler = new AgentSessionReconciler(
      () => agentChatApi.getSessionSnapshot(id),
      applyState,
    )
    return reconciler
  }

  function applyState(state: AgentSessionReconcilerState) {
    snapshot.value = state.snapshot
    loading.value = state.loading
    error.value = state.error
  }

  function refresh() {
    return currentReconciler()?.refresh() ?? Promise.resolve(null)
  }

  function invalidate(revision?: number) {
    currentReconciler()?.invalidate(revision)
    startPolling()
  }

  function beginLiveRun() {
    liveRuns += 1
    invalidate()
  }

  async function endLiveRun() {
    liveRuns = Math.max(0, liveRuns - 1)
    await refresh()
    startPolling()
  }

  function startPolling() {
    if (pollTimer) return
    idlePolls = 0
    pollTimer = setTimeout(poll, 250)
  }

  async function poll() {
    pollTimer = null
    if (document.visibilityState !== 'visible') return
    await refresh()
    const state = snapshot.value?.activeTurn?.state
    const active = liveRuns > 0 ||
      state === 'queued' ||
      state === 'running' ||
      state === 'waiting-user' ||
      state === 'waiting-approval'
    idlePolls = active ? 0 : idlePolls + 1
    if (active || idlePolls < 3) {
      pollTimer = setTimeout(poll, active ? 300 : 1_000)
    }
  }

  function reconcileWhenVisible() {
    if (document.visibilityState === 'visible') void refresh()
  }

  onMounted(() => {
    void refresh()
    startPolling()
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', reconcileWhenVisible)
  })

  onBeforeUnmount(() => {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
    window.removeEventListener('focus', refresh)
    window.removeEventListener('online', refresh)
    document.removeEventListener('visibilitychange', reconcileWhenVisible)
  })

  return {
    snapshot,
    loading,
    error,
    refresh,
    invalidate,
    beginLiveRun,
    endLiveRun,
  }
}

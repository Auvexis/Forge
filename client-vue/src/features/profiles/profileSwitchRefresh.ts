export const PROFILE_SWITCH_REFRESH_EVENT = 'sailor:profile-switched'

export interface ProfileSwitchRefreshDeps {
  execution: {
    stopStream: () => void
    resetNodeStatuses: () => void
  }
  workflow: {
    clearWorkflow: () => void
  }
  settings: {
    clearProfileScopedState: () => void
    fetchSettings: () => Promise<void>
    fetchVariables: () => Promise<void>
  }
  dispatchRefreshEvent: () => void
}

async function runtimeDeps(): Promise<ProfileSwitchRefreshDeps> {
  const [{ useExecutionStore }, { useWorkflowStore }, { useSettingsStore }] = await Promise.all([
    import('@/features/workflow-editor'),
    import('@/features/workflow-editor/stores/workflow.store'),
    import('@/shared/stores/settings.store'),
  ])
  const execution = useExecutionStore()
  const workflow = useWorkflowStore()
  const settings = useSettingsStore()

  return {
    execution,
    workflow,
    settings,
    dispatchRefreshEvent: () => window.dispatchEvent(new CustomEvent(PROFILE_SWITCH_REFRESH_EVENT)),
  }
}

export async function refreshAfterProfileSwitch(deps?: ProfileSwitchRefreshDeps) {
  const resolvedDeps = deps ?? (await runtimeDeps())

  resolvedDeps.execution.stopStream()
  resolvedDeps.execution.resetNodeStatuses()
  resolvedDeps.workflow.clearWorkflow()
  resolvedDeps.settings.clearProfileScopedState()
  await resolvedDeps.settings.fetchSettings()
  await resolvedDeps.settings.fetchVariables()
  resolvedDeps.dispatchRefreshEvent()
}

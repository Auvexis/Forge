import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { refreshAfterProfileSwitch, PROFILE_SWITCH_REFRESH_EVENT } from '../profileSwitchRefresh.ts'

describe('profile switch refresh', () => {
  it('clears profile-owned UI state before refetching profile-owned settings', async () => {
    const calls: string[] = []

    await refreshAfterProfileSwitch({
      workflow: { clearWorkflow: () => calls.push('workflow.clear') },
      execution: {
        stopStream: () => calls.push('execution.stopStream'),
        resetNodeStatuses: () => calls.push('execution.reset'),
      },
      settings: {
        clearProfileScopedState: () => calls.push('settings.clear'),
        fetchSettings: async () => calls.push('settings.fetchSettings'),
        fetchVariables: async () => calls.push('settings.fetchVariables'),
      },
      dispatchRefreshEvent: () => calls.push(PROFILE_SWITCH_REFRESH_EVENT),
    })

    assert.deepEqual(calls, [
      'execution.stopStream',
      'execution.reset',
      'workflow.clear',
      'settings.clear',
      'settings.fetchSettings',
      'settings.fetchVariables',
      PROFILE_SWITCH_REFRESH_EVENT,
    ])
  })
})

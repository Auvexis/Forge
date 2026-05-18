import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const monitorPath = fileURLToPath(new URL('../AppGlobalAutomationMonitor.vue', import.meta.url))
const oldMonitorPath = fileURLToPath(new URL('../AppProductionMonitor.vue', import.meta.url))
const appSource = readFileSync(fileURLToPath(new URL('../../../../app/App.vue', import.meta.url)), 'utf8')
const paletteSource = readFileSync(
  fileURLToPath(new URL('../../../../features/command-palette/components/CommandPaletteHost.vue', import.meta.url)),
  'utf8',
)
const apiSource = readFileSync(fileURLToPath(new URL('../../../../core/api/workflows.api.ts', import.meta.url)), 'utf8')

describe('global automation monitor shell', () => {
  it('replaces the old production monitor component with a BaseModal global monitor', () => {
    assert.equal(existsSync(monitorPath), true)
    assert.equal(existsSync(oldMonitorPath), false)

    const source = readFileSync(monitorPath, 'utf8')
    assert.match(source, /<BaseModal/)
    assert.match(source, /isAutomationMonitorOpen/)
    assert.match(source, /toggleAutomationMonitor/)
  })

  it('offers a profile dropdown with a Global default filter', () => {
    const source = readFileSync(monitorPath, 'utf8')

    assert.match(source, /Global/)
    assert.match(source, /useProfileStore/)
    assert.match(source, /selectedProfileId/)
    assert.match(source, /profileOptions/)
  })

  it('uses a task-manager style sidebar and a workflow execution view with trigger tabs', () => {
    const source = readFileSync(monitorPath, 'utf8')

    assert.match(source, /gam-sidebar/)
    assert.match(source, /gam-sidebar-metrics/)
    assert.match(source, /gam-main/)
    assert.match(source, /triggerTabs/)
    assert.match(source, /activeTriggerEvents/)
  })

  it('polls live production status and selected workflow execution data', () => {
    const source = readFileSync(monitorPath, 'utf8')

    assert.match(source, /getGlobalProductionStatus/)
    assert.match(source, /getExecutions\([^)]*profileId/)
    assert.match(source, /setInterval\(refreshLiveData,\s*3_000\)/)
  })
})

describe('global automation monitor wiring', () => {
  it('mounts and toggles the new global monitor from app chrome', () => {
    assert.match(appSource, /AppGlobalAutomationMonitor/)
    assert.match(appSource, /isAutomationMonitorOpen/)
    assert.match(appSource, /toggleAutomationMonitor/)
    assert.doesNotMatch(appSource, /AppProductionMonitor/)
  })

  it('maps command palette production panel intents to the new monitor', () => {
    assert.match(paletteSource, /AppGlobalAutomationMonitor\.vue/)
    assert.match(paletteSource, /production-panel\.open/)
    assert.match(paletteSource, /toggleAutomationMonitor/)
    assert.doesNotMatch(paletteSource, /AppProductionMonitor/)
  })

  it('adds API methods for global status and profile-scoped execution reads', () => {
    assert.match(apiSource, /getGlobalProductionStatus/)
    assert.match(apiSource, /profileId\?: string/)
    assert.match(apiSource, /PROFILE_WORKFLOW_EXECUTIONS/)
  })
})

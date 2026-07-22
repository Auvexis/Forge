import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const guideRoot = resolve(currentDir, '..')

function read(relativePath: string) {
  return readFileSync(resolve(guideRoot, relativePath), 'utf8')
}

describe('custom guides contract', () => {
  it('exposes custom guide building blocks without a central guide registry', () => {
    assert.equal(existsSync(resolve(guideRoot, 'components/GuideFullscreen.vue')), true)
    assert.equal(existsSync(resolve(guideRoot, 'components/GuideModal.vue')), true)
    assert.equal(existsSync(resolve(guideRoot, 'components/GuideStepFrame.vue')), true)
    assert.equal(existsSync(resolve(guideRoot, 'components/GuideActions.vue')), true)
    assert.equal(existsSync(resolve(guideRoot, 'composables/useGuideFlow.ts')), true)
    assert.equal(existsSync(resolve(guideRoot, 'composables/useGuideProgress.ts')), true)
    assert.equal(existsSync(resolve(guideRoot, 'composables/useGuideReward.ts')), true)
    assert.equal(existsSync(resolve(guideRoot, '../start-guide/startGuide.registry.ts')), false)
  })

  it('lets complete guide components own their steps and call reusable flow helpers', () => {
    const flow = read('composables/useGuideFlow.ts')
    const fullscreen = read('components/GuideFullscreen.vue')
    const modal = read('components/GuideModal.vue')

    assert.match(flow, /export function useGuideFlow/)
    assert.match(flow, /function goTo/)
    assert.match(flow, /function next/)
    assert.match(flow, /function back/)
    assert.match(fullscreen, /<Teleport to="body">/)
    assert.match(modal, /<Teleport to="body">/)
  })

  it('keeps guide progress scoped and reward emission behind dedicated composables', () => {
    const progress = read('composables/useGuideProgress.ts')
    const reward = read('composables/useGuideReward.ts')
    const types = read('types.ts')

    assert.match(types, /GuideProgressScope/)
    assert.match(progress, /scope: GuideProgressScope/)
    assert.match(progress, /markGuideCompleted/)
    assert.match(progress, /markGuideSkipped/)
    assert.match(reward, /useAuvexisProductEvents/)
    assert.match(reward, /claimGuideReward/)
  })
})

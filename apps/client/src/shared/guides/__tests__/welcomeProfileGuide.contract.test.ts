import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(currentDir, '../../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('welcome profile guide contract', () => {
  it('defines the first custom profile-scoped guide', () => {
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(guide, /const GUIDE_ID = 'welcome-profile'/)
    assert.match(guide, /const GUIDE_VERSION = 1/)
    assert.match(guide, /const GUIDE_SCOPE = 'profile'/)
    assert.match(guide, /useGuideFlow\(guideSteps\)/)
    assert.match(guide, /hasCompletedGuide/)
    assert.match(guide, /markGuideCompleted/)
    assert.match(guide, /markGuideSkipped/)
  })

  it('opens once from Home when the current profile has not completed it', () => {
    const home = read('features/home/HomePage.vue')
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(home, /WelcomeProfileGuide/)
    assert.match(guide, /onMounted\(async \(\) =>/)
    assert.match(guide, /profileStore\.currentProfile/)
    assert.match(guide, /openIfNeeded\(\)/)
    assert.match(guide, /scope: GUIDE_SCOPE/)
    assert.match(guide, /scopeId: currentProfileId\.value/)
  })

  it('keeps the first guide small and action-oriented', () => {
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(guide, /'welcome', 'shortcuts', 'start'/)
    assert.match(guide, /Fabric starts from Home/)
    assert.match(guide, /Your quick panels are already wired/)
    assert.match(guide, /Choose where to begin/)
    assert.match(guide, /Open Workflow Editor/)
    assert.match(guide, /Open Pages Editor/)
    assert.doesNotMatch(guide, /useGuideReward|claimGuideReward/)
  })
})

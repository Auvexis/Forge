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

  it('renders with its own flat modal shell', () => {
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(guide, /BaseModal/)
    assert.match(guide, /<BaseModal :is-open="isOpen" max-width="980px" height="min\(720px, calc\(100vh - 64px\)\)" @close="skip">/)
    assert.match(guide, /class="welcome-profile-guide__header"/)
    assert.match(guide, /class="welcome-profile-guide__body"/)
    assert.match(guide, /class="welcome-profile-guide__footer"/)
    assert.doesNotMatch(guide, /GuideModal/)
    assert.doesNotMatch(guide, /<Teleport to="body">/)
    assert.doesNotMatch(guide, /position: fixed;/)
    assert.doesNotMatch(guide, /welcome-profile-guide__panel/)
    assert.doesNotMatch(guide, /border-top: 1px solid var\(--fabric-border\)/)
  })

  it('unwraps guide flow state for navigation buttons', () => {
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(guide, /const isLastStep = computed\(\(\) => flow\.isLastStep\.value\)/)
    assert.match(guide, /v-if="!isLastStep"/)
    assert.doesNotMatch(guide, /v-if="!flow\.isLastStep"/)
    assert.doesNotMatch(guide, /activeStepNumber/)
    assert.doesNotMatch(guide, /stepCount/)
    assert.doesNotMatch(guide, /\{\{ activeStepNumber \}\} \/ \{\{ stepCount \}\}/)
  })

  it('supports English, Portuguese, Spanish, and French copy through BaseSegmentedSelect', () => {
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(guide, /type WelcomeGuideLang = 'en' \| 'pt' \| 'es' \| 'fr'/)
    assert.match(guide, /BaseSegmentedSelect/)
    assert.match(guide, /label: 'EN', title: 'English', emojiIcon: '🇺🇸'/)
    assert.match(guide, /label: 'PT', title: 'Portuguese', emojiIcon: '🇧🇷'/)
    assert.match(guide, /label: 'ES', title: 'Spanish', emojiIcon: '🇪🇸'/)
    assert.match(guide, /label: 'FR', title: 'French', emojiIcon: '🇫🇷'/)
    assert.match(guide, /@update:model-value="setLanguage"/)
    assert.doesNotMatch(guide, /welcome-profile-guide__language-option/)
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

  it('presents six welcome steps without reward side effects', () => {
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(guide, /'welcome', 'workflow', 'pages', 'theme', 'plugins', 'monitoring'/)
    assert.match(guide, /src="\/favicon\.svg"/)
    assert.match(guide, /alt="Fabric"/)
    assert.match(guide, /Build automations visually/)
    assert.match(guide, /Create workflow-connected pages/)
    assert.match(guide, /Plugin Installer/)
    assert.match(guide, /Monitoring Panel/)
    assert.doesNotMatch(guide, /useGuideReward|claimGuideReward/)
  })

  it('uses varied content layouts and the shared theme selector', () => {
    const guide = read('shared/guides/guides/WelcomeProfileGuide.vue')

    assert.match(guide, /<Transition name="welcome-profile-guide-step" mode="out-in">/)
    assert.match(guide, /:key="activeStep"/)
    assert.match(guide, /welcome-profile-guide-step-enter-from/)
    assert.match(guide, /welcome-profile-guide-step-leave-to/)
    assert.match(guide, /type WelcomeGuideLayout = 'center' \| 'media-left' \| 'media-right' \| 'media-top' \| 'media-bottom'/)
    assert.match(guide, /workflow: 'media-left'/)
    assert.match(guide, /pages: 'media-right'/)
    assert.match(guide, /plugins: 'media-top'/)
    assert.match(guide, /monitoring: 'media-bottom'/)
    assert.match(guide, /BaseThemeSelect/)
    assert.match(guide, /handleThemeChange/)
  })
})

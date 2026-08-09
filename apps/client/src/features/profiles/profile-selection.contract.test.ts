import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(
  new URL('./components/ProfileSelectionPage.vue', import.meta.url),
  'utf8',
)

describe('profile selection password view', () => {
  it('hides the right preview pane when asking for a protected profile password', () => {
    assert.match(source, /pe__split--password/)
    assert.match(source, /v-if="mode !== 'password'"/)
  })
})

describe('profile creation preview pane', () => {
  it('uses a modern title, gif slot, and description stack', () => {
    assert.match(source, /class="pe__preview-title"/)
    assert.match(source, /class="pe__preview-gif-slot"/)
    assert.match(source, /class="pe__preview-desc"/)
    assert.doesNotMatch(source, /pe__demo-/)
  })
})

describe('profile creation form copy', () => {
  it('shows password as a normal optional field without a divider', () => {
    assert.doesNotMatch(source, /class="pe__divider"/)
    assert.doesNotMatch(source, /Optional password/i)
    assert.match(source, /Password <span class="pe__opt">\(optional\)<\/span>/)
  })
})

describe('profile deletion rules', () => {
  it('hides delete actions for the default profile', () => {
    assert.match(source, /v-if="canDeleteProfile\(profile\)"/)
    assert.match(source, /function canDeleteProfile\(profile: ProfileSummary\)/)
    assert.match(source, /!isDefaultProfile\(profile\)/)
  })
})

describe('profile form back buttons', () => {
  it('uses BaseButton ghost icon buttons for back actions', () => {
    assert.doesNotMatch(source, /<button class="pe__back"/)
    assert.match(source, /class="pe__back"[\s\S]*variant="ghost"[\s\S]*size="icon"/)
    assert.match(source, /icon-left="arrow-left"/)
  })
})

describe('profile selection desktop chrome', () => {
  it('renders the reusable desktop topbar on profile selection screens', () => {
    assert.match(source, /<BaseDesktopTopBar title="Fabric" \/>/)
    assert.match(source, /import BaseDesktopTopBar/)
    assert.match(source, /'pe--desktop': isDesktopWindow/)
    assert.match(source, /window\.fabricDesktop\?\.isDesktop === true/)
  })
})

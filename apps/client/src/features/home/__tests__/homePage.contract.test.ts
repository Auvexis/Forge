import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(currentDir, '../../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('home page contract', () => {
  it('exposes /home as the app landing route', () => {
    const router = read('app/router.ts')

    assert.match(router, /redirect: '\/home'/)
    assert.match(router, /path: '\/home'/)
    assert.match(router, /component: \(\) => import\('@\/app\/pages\/HomePage\.vue'\)/)
  })

  it('keeps home UI inside the home feature folder', () => {
    assert.equal(existsSync(resolve(root, 'features/home/HomePage.vue')), true)
    assert.equal(existsSync(resolve(root, 'features/home/components/HomeWelcome.vue')), true)

    const appPage = read('app/pages/HomePage.vue')
    const page = read('features/home/HomePage.vue')
    assert.match(appPage, /@\/features\/home\/HomePage\.vue/)
    assert.doesNotMatch(page, /WelcomeProfileGuide/)
  })

  it('renders a centered two-action launcher without legacy home sections', () => {
    const page = read('features/home/HomePage.vue')
    const welcome = read('features/home/components/HomeWelcome.vue')
    const darkTheme = read('themes/json/dark.json')
    const lightTheme = read('themes/json/light.json')
    const templateTheme = read('themes/json/template.json')

    assert.match(page, /HomeWelcome/)
    assert.match(welcome, /home-welcome__actions/)
    assert.match(welcome, /home-welcome__tile/)
    assert.match(welcome, /New Workflow/)
    assert.match(welcome, /New Page/)
    assert.match(welcome, /openTarget', 'workflows'/)
    assert.match(welcome, /openTarget', 'pages'/)
    assert.match(welcome, /\.home-welcome\s*\{[\s\S]*align-items: center;[\s\S]*justify-content: center;/)
    assert.match(welcome, /\.home-welcome__actions\s*\{[\s\S]*display: flex;[\s\S]*gap: var\(--fabric-home-welcome-actions-gap\);/)
    assert.match(welcome, /\.home-welcome__tile\s*\{[\s\S]*width: var\(--fabric-home-welcome-tile-width\);[\s\S]*height: var\(--fabric-home-welcome-tile-height\);/)
    assert.doesNotMatch(welcome, /home-welcome__intro|home-welcome__sections|home-welcome__quick-actions|home-welcome__editors/)
    assert.doesNotMatch(welcome, /Monitoring|Plugin Installer|Settings|Your automation workspace/)
    assert.match(darkTheme, /"homeWelcome\.tile\.bg"/)
    assert.match(lightTheme, /"homeWelcome\.tile\.hover\.border"/)
    assert.match(templateTheme, /"homeWelcome\.actions\.gap"/)
  })

  it('opens editors by route from the home actions', () => {
    const page = read('features/home/HomePage.vue')

    assert.match(page, /panelId === 'workflows'/)
    assert.match(page, /router\.push\('\/workflows'\)/)
    assert.match(page, /panelId === 'pages'/)
    assert.match(page, /router\.push\('\/pages'\)/)
    assert.doesNotMatch(page, /monitoring: \{ type: 'monitoring\.open' \}/)
    assert.doesNotMatch(page, /plugin-installer\.open/)
    assert.doesNotMatch(page, /settings\.open/)
  })
})

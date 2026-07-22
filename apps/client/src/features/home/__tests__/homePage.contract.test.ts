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
    assert.match(appPage, /@\/features\/home\/HomePage\.vue/)
  })

  it('renders a flat software welcome page without IDE chrome', () => {
    const page = read('features/home/HomePage.vue')
    const welcome = read('features/home/components/HomeWelcome.vue')

    assert.match(page, /HomeWelcome/)
    assert.match(welcome, /home-welcome__intro/)
    assert.match(welcome, /home-welcome__media-slot/)
    assert.match(welcome, /home-welcome__editor-media-slot/)
    assert.match(welcome, /home-welcome__quick-actions/)
    assert.match(welcome, /home-welcome__editors/)
    assert.match(welcome, /Workflow Editor/)
    assert.match(welcome, /Pages Editor/)
    assert.match(welcome, /Create New Workflow/)
    assert.match(welcome, /Create Pages Project/)
    assert.match(welcome, /variant="link"/)
    assert.doesNotMatch(welcome, /variant="primary"/)
    assert.doesNotMatch(welcome, /variant="secondary"/)
    assert.match(welcome, /\.home-welcome__quick-actions,[\s\S]*\.home-welcome__editor-actions\s*\{[\s\S]*flex-direction: column;/)
    assert.doesNotMatch(welcome, /home-workspace/)
    assert.doesNotMatch(welcome, /home-workspace__timeline/)
    assert.doesNotMatch(welcome, /home-card|card/)
    assert.doesNotMatch(welcome, /home-welcome__flow-node|home-welcome__page-hero/)
  })

  it('opens editors by route and panels by shared UI intents', () => {
    const page = read('features/home/HomePage.vue')
    const app = read('app/App.vue')
    const topbar = read('shared/components/layout/AppTopbar.vue')

    assert.match(page, /panelId === 'workflows'/)
    assert.match(page, /router\.push\('\/workflows'\)/)
    assert.match(page, /panelId === 'pages'/)
    assert.match(page, /router\.push\('\/pages'\)/)
    assert.match(page, /monitoring: \{ type: 'monitoring\.open' \}/)
    assert.match(page, /plugins: \{ type: 'plugin-installer\.open' \}/)
    assert.match(page, /settings: \{ type: 'settings\.open' \}/)
    assert.match(app, /intent\?\.type === 'settings\.open'/)
    assert.match(app, /@open-home="openHome"/)
    assert.match(topbar, /open-home/)
    assert.match(topbar, /aria-label="Open home"/)
  })
})

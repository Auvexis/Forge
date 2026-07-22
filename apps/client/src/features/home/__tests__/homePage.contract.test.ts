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
    assert.equal(existsSync(resolve(root, 'features/home/components/HomeHero.vue')), true)
    assert.equal(existsSync(resolve(root, 'features/home/components/HomeProductSection.vue')), true)
    assert.equal(existsSync(resolve(root, 'features/home/components/HomePanelGrid.vue')), true)

    const appPage = read('app/pages/HomePage.vue')
    assert.match(appPage, /@\/features\/home\/HomePage\.vue/)
  })

  it('shows core Fabric software areas and panel shortcuts', () => {
    const page = read('features/home/HomePage.vue')
    const hero = read('features/home/components/HomeHero.vue')
    const panels = read('features/home/components/HomePanelGrid.vue')

    assert.match(hero, /Fabric Studio/)
    assert.match(page, /Workflow Editor/)
    assert.match(page, /Create New Workflow/)
    assert.match(page, /Pages/)
    assert.match(page, /Create Pages Project/)
    assert.match(panels, /Monitoring/)
    assert.match(panels, /Plugin Installer/)
    assert.match(panels, /Settings/)
    assert.match(panels, /Guides/)
  })

  it('opens editors by route and panels by shared UI intents', () => {
    const page = read('features/home/HomePage.vue')
    const app = read('app/App.vue')

    assert.match(page, /router\.push\('\/workflows'\)/)
    assert.match(page, /router\.push\('\/pages'\)/)
    assert.match(page, /monitoring: \{ type: 'monitoring\.open' \}/)
    assert.match(page, /plugins: \{ type: 'plugin-installer\.open' \}/)
    assert.match(page, /settings: \{ type: 'settings\.open' \}/)
    assert.match(app, /intent\?\.type === 'settings\.open'/)
  })
})

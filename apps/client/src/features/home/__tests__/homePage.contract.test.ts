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
    assert.equal(existsSync(resolve(root, 'features/home/components/HomeWorkspaceHub.vue')), true)

    const appPage = read('app/pages/HomePage.vue')
    assert.match(appPage, /@\/features\/home\/HomePage\.vue/)
  })

  it('renders a professional software workspace instead of a SaaS landing page', () => {
    const page = read('features/home/HomePage.vue')
    const hub = read('features/home/components/HomeWorkspaceHub.vue')

    assert.match(page, /HomeWorkspaceHub/)
    assert.match(hub, /home-workspace__toolbar/)
    assert.match(hub, /home-workspace__browser/)
    assert.match(hub, /home-workspace__viewer/)
    assert.match(hub, /home-workspace__inspector/)
    assert.match(hub, /home-workspace__timeline/)
    assert.match(hub, /home-workspace__status/)
    assert.doesNotMatch(hub, /home-hero/)
    assert.doesNotMatch(hub, /home-product/)
  })

  it('opens editors by route and panels by shared UI intents', () => {
    const page = read('features/home/HomePage.vue')
    const app = read('app/App.vue')

    assert.match(page, /panelId === 'workflows'/)
    assert.match(page, /router\.push\('\/workflows'\)/)
    assert.match(page, /panelId === 'pages'/)
    assert.match(page, /router\.push\('\/pages'\)/)
    assert.match(page, /monitoring: \{ type: 'monitoring\.open' \}/)
    assert.match(page, /plugins: \{ type: 'plugin-installer\.open' \}/)
    assert.match(page, /settings: \{ type: 'settings\.open' \}/)
    assert.match(app, /intent\?\.type === 'settings\.open'/)
  })
})

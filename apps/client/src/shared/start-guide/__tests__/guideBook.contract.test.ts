import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const startGuideDir = resolve(currentDir, '..')
const appPath = resolve(currentDir, '../../../app/App.vue')
const navPath = resolve(currentDir, '../../components/layout/appSidebarNavigation.ts')

function read(relativePath: string): string {
  return readFileSync(resolve(startGuideDir, relativePath), 'utf8')
}

describe('GuideBook contract', () => {
  it('adds categories to guide definitions for guide book grouping only', () => {
    const types = read('startGuide.types.ts')
    const registry = read('startGuide.registry.ts')

    assert.match(types, /category: string/)
    assert.match(types, /categoryLabel\?: string/)
    assert.match(registry, /category:/)
  })

  it('renders a guide book grouped by category and opens guides manually', () => {
    const guideBook = read('GuideBookComponent.vue')

    assert.match(guideBook, /groupedGuides/)
    assert.match(guideBook, /category/)
    assert.match(guideBook, /categoryLabel/)
    assert.match(guideBook, /useStartGuide/)
    assert.match(guideBook, /\.open\(/)
  })

  it('opens GuideBook from the Docs sidebar action and command palette intents', () => {
    const app = readFileSync(appPath, 'utf8')
    const nav = readFileSync(navPath, 'utf8')

    assert.match(nav, /intent\?: SidebarNavIntent/)
    assert.match(nav, /id: 'docs'[\s\S]*intent: \{ type: 'guide-book\.open' \}/)
    assert.match(app, /GuideBookHost/)
    assert.match(app, /guide-book\.open/)
  })
})

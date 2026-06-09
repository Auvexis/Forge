import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'

import {
  sidebarChromeLayout,
  sidebarActivityItems,
  sidebarSections,
  sidebarMainActiveStyle,
  sidebarPageLabelForPath,
  sidebarReferenceSpacing,
  sidebarWidthForState,
} from '../appSidebarNavigation.ts'

describe('app sidebar navigation', () => {
  it('groups core suite areas into apps and spaces', () => {
    const apps = sidebarSections.find((section) => section.label === 'Apps')
    const spaces = sidebarSections.find((section) =>
      section.items.some((item) => item.id === 'universe'),
    )

    assert.equal(
      apps?.items.some((item) => item.id === 'workflows'),
      true,
    )
    assert.equal(
      apps?.items.some((item) => item.id === 'pages'),
      true,
    )
    assert.equal(
      spaces?.items.some((item) => item.id === 'universe'),
      true,
    )
  })

  it('assigns stable color accents to visible suite apps', () => {
    const items = sidebarSections.flatMap((section) => section.items)

    assert.match(items.find((item) => item.id === 'workflows')?.accent ?? '', /^#[0-9a-fA-F]{6}$/)
    assert.match(items.find((item) => item.id === 'pages')?.accent ?? '', /^#[0-9a-fA-F]{6}$/)
    assert.match(items.find((item) => item.id === 'universe')?.accent ?? '', /^#[0-9a-fA-F]{6}$/)
    assert.equal(items.some((item) => item.id === 'plugin-creator'), false)
  })

  it('provides routes for each visible suite navigation item', () => {
    const items = sidebarSections.flatMap((section) => section.items)

    assert.equal(items.find((item) => item.id === 'workflows')?.route, '/workflows')
    assert.equal(items.find((item) => item.id === 'pages')?.route, '/pages')
    assert.equal(items.find((item) => item.id === 'universe')?.route, '/universe')
    assert.equal(items.some((item) => item.route === '/plugin-creator'), false)
  })

  it('opens the external plugin installer through a dispatched sidebar intent', () => {
    const item = sidebarSections
      .flatMap((section) => section.items)
      .find((navItem) => navItem.id === 'plugin-external-installer')

    assert.equal(item?.route, undefined)
    assert.deepEqual(item?.intent, { type: 'plugin-installer.open' })
  })

  it('keeps bottom activity actions compact and professional', () => {
    assert.deepEqual(
      sidebarActivityItems.map((item) => item.id),
      ['search', 'monitor', 'docs', 'settings'],
    )
  })

  it('opens the guide book from the docs activity item', () => {
    const docs = sidebarActivityItems.find((item) => item.id === 'docs')

    assert.equal(docs?.label, 'Guide Book')
    assert.deepEqual(docs?.intent, { type: 'guide-book.open' })
  })

  it('keeps media assets out of navigation metadata', () => {
    const source = readFileSync(new URL('../appSidebarNavigation.ts', import.meta.url), 'utf8')

    assert.doesNotMatch(source, /\.(gif|png|jpe?g|webp)['"]/)
  })

  it('returns the active sidebar width token for expanded and collapsed states', () => {
    assert.equal(sidebarWidthForState(false), 'var(--sailor-sidebar-expanded)')
    assert.equal(sidebarWidthForState(true), 'var(--sailor-sidebar-width)')
  })

  it('uses a wider expanded sidebar token for the suite layout', () => {
    assert.equal(sidebarWidthForState(false, { expandedPx: 288 }), '288px')
  })

  it('keeps topbar and sidebar separators from crossing each other', () => {
    assert.deepEqual(sidebarChromeLayout, {
      topbarHasBottomBorder: true,
      sidebarSeparatorStartsBelowHeader: true,
    })
  })

  it('uses text underline active styling for main suite items', () => {
    assert.deepEqual(sidebarMainActiveStyle, {
      hidesInheritedBeforeIndicator: true,
      usesTextUnderline: true,
    })
  })

  it('uses the active page label in the sidebar header', () => {
    assert.equal(sidebarPageLabelForPath('/workflows'), 'Workflow')
    assert.equal(sidebarPageLabelForPath('/workflows/example-id'), 'Workflow')
    assert.equal(sidebarPageLabelForPath('/pages'), 'Pages')
    assert.equal(sidebarPageLabelForPath('/pages/page_1'), 'Pages')
    assert.equal(sidebarPageLabelForPath('/universe'), 'Universe')
    assert.equal(sidebarPageLabelForPath('/plugin-creator'), 'Sailor')
  })

  it('matches the reference sidebar spacing rhythm', () => {
    assert.deepEqual(sidebarReferenceSpacing, {
      headerHeightPx: 58,
      horizontalPaddingPx: 18,
      dividerInsetPx: 12,
      mainTopPaddingPx: 24,
      sectionGapPx: 30,
      sectionLabelToGridPx: 22,
      itemColumnGapPx: 58,
      itemRowGapPx: 22,
      gridColumns: 'stretch',
    })
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  sidebarChromeLayout,
  sidebarActivityItems,
  sidebarSections,
  sidebarMainUsesWoobyMenu,
  sidebarMainActiveStyle,
  sidebarProfileIcon,
  sidebarReferenceSpacing,
  sidebarWidthForState,
} from '../appSidebarNavigation.ts'

describe('app sidebar navigation', () => {
  it('groups core suite areas into apps and spaces', () => {
    const apps = sidebarSections.find((section) => section.label === 'Apps')
    const spaces = sidebarSections.find((section) => section.label === 'Spaces')

    assert.equal(apps?.items.some((item) => item.id === 'workflows'), true)
    assert.equal(spaces?.items.some((item) => item.id === 'universe'), true)
  })

  it('assigns stable color accents to visible suite apps', () => {
    const items = sidebarSections.flatMap((section) => section.items)

    assert.equal(items.find((item) => item.id === 'workflows')?.accent, 'green')
    assert.equal(items.find((item) => item.id === 'agents')?.accent, 'blue')
    assert.equal(items.find((item) => item.id === 'universe')?.accent, 'violet')
  })

  it('provides routes for each visible suite navigation item', () => {
    const items = sidebarSections.flatMap((section) => section.items)

    assert.equal(items.find((item) => item.id === 'workflows')?.route, '/workflows')
    assert.equal(items.find((item) => item.id === 'agents')?.route, '/agents')
    assert.equal(items.find((item) => item.id === 'universe')?.route, '/universe')
  })

  it('keeps bottom activity actions compact and professional', () => {
    assert.deepEqual(
      sidebarActivityItems.map((item) => item.id),
      ['search', 'monitor', 'docs', 'settings'],
    )
  })

  it('returns the active sidebar width token for expanded and collapsed states', () => {
    assert.equal(sidebarWidthForState(false), 'var(--nod8-sidebar-expanded)')
    assert.equal(sidebarWidthForState(true), 'var(--nod8-sidebar-width)')
  })

  it('uses a wider expanded sidebar token for the suite layout', () => {
    assert.equal(sidebarWidthForState(false, { expandedPx: 288 }), '288px')
  })

  it('keeps suite app links outside WoobyMenu to avoid stretched active backgrounds', () => {
    assert.equal(sidebarMainUsesWoobyMenu, false)
  })

  it('keeps topbar and sidebar separators from crossing each other', () => {
    assert.deepEqual(sidebarChromeLayout, {
      topbarHasBottomBorder: true,
      sidebarSeparatorStartsBelowHeader: true,
    })
  })

  it('uses a grip icon for the workspace profile control', () => {
    assert.equal(sidebarProfileIcon, 'grip')
  })

  it('uses text underline active styling for main suite items', () => {
    assert.deepEqual(sidebarMainActiveStyle, {
      hidesInheritedBeforeIndicator: true,
      usesTextUnderline: true,
    })
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
    })
  })
})

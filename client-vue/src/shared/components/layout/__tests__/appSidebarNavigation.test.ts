import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  sidebarActivityItems,
  sidebarSections,
  sidebarWidthForState,
} from '../appSidebarNavigation.ts'

describe('app sidebar navigation', () => {
  it('groups suite areas into apps and spaces without placeholder features', () => {
    assert.deepEqual(
      sidebarSections.map((section) => ({
        label: section.label,
        items: section.items.map((item) => item.id),
      })),
      [
        { label: 'Apps', items: ['workflows'] },
        { label: 'Spaces', items: ['universe'] },
      ],
    )
  })

  it('assigns stable color accents to visible suite apps', () => {
    const accents = sidebarSections.flatMap((section) =>
      section.items.map((item) => [item.id, item.accent]),
    )

    assert.deepEqual(accents, [
      ['workflows', 'blue'],
      ['universe', 'violet'],
    ])
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
})

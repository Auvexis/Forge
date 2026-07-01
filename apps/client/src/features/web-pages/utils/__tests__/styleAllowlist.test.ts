import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { sanitizeClassName, sanitizeCustomCss, sanitizeStyles } from '../styleAllowlist.ts'

describe('style allowlist utilities', () => {
  it('keeps allowed layout styles', () => {
    assert.deepEqual(
      sanitizeStyles({ width: '100%', padding: '24px', display: 'flex', gap: '12px' }),
      { width: '100%', padding: '24px', display: 'flex', gap: '12px' },
    )
  })

  it('removes unknown CSS properties', () => {
    assert.deepEqual(sanitizeStyles({ cursor: 'wait', color: '#fff' } as any), { color: '#fff' })
  })

  it('removes position fixed', () => {
    assert.deepEqual(sanitizeStyles({ position: 'fixed', color: '#fff' } as any), { color: '#fff' })
  })

  it('removes javascript URLs', () => {
    assert.deepEqual(sanitizeStyles({ backgroundImage: 'url(javascript:alert(1))' }), {})
  })

  it('keeps custom css free for dev-authored blocks', () => {
    assert.equal(sanitizeCustomCss('width: expression(alert(1)); color: red;'), 'width: expression(alert(1)); color: red;')
  })

  it('clamps numeric values where appropriate', () => {
    assert.deepEqual(sanitizeStyles({ opacity: 2, fontSize: '240px' }), {
      opacity: 1,
      fontSize: '120px',
    })
  })

  it('preserves safe custom class names', () => {
    assert.equal(sanitizeClassName('hero safe_1 hover:bg-blue bad<script>'), 'hero safe_1 hover:bg-blue badscript')
  })
})

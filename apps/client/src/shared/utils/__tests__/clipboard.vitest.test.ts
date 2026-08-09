import { describe, expect, it, vi } from 'vitest'
import { copyTextToClipboard } from '../clipboard'

describe('copyTextToClipboard', () => {
  it('uses navigator clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyTextToClipboard('hello')

    expect(writeText).toHaveBeenCalledWith('hello')
    vi.unstubAllGlobals()
  })

  it('falls back to document copy command when navigator clipboard fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    const textarea = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      select: vi.fn(),
    }
    const appendChild = vi.fn()
    const removeChild = vi.fn()
    const execCommand = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('HTMLElement', class HTMLElement {})
    vi.stubGlobal('document', {
      activeElement: null,
      body: { appendChild, removeChild },
      createElement: vi.fn(() => textarea),
      execCommand,
    })

    await copyTextToClipboard('{{ env.API_KEY }}')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(textarea.value).toBe('{{ env.API_KEY }}')
    expect(appendChild).toHaveBeenCalledWith(textarea)
    expect(removeChild).toHaveBeenCalledWith(textarea)
    vi.unstubAllGlobals()
  })
})

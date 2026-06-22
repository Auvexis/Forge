import type { PageBlock, PageBlockTag } from '../types/page.types.ts'

export function createBlock(tag: PageBlockTag, id = createBlockId(tag)): PageBlock {
  return {
    id,
    tag,
    props: defaultProps(tag),
    styles: {},
    children: [],
  }
}

function defaultProps(tag: PageBlockTag): PageBlock['props'] {
  if (tag === 'text') return { text: 'Text' }
  if (tag === 'button') return { text: 'Button', type: 'button' }
  if (tag === 'link') return { text: 'Link', href: '#' }
  if (tag === 'image') return { src: '', alt: '' }
  if (tag === 'audio') return { src: '', controls: true }
  if (tag === 'video') return { src: '', poster: '', controls: true }
  if (tag === 'youtube') return { url: '', videoId: '', title: 'Youtube video' }
  if (tag === 'input') return { name: 'field', type: 'text', label: 'Field' }
  if (tag === 'form') return { name: 'form' }
  return {}
}

function createBlockId(tag: PageBlockTag): string {
  return `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

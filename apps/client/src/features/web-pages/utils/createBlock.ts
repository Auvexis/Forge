import type { PageBlock, PageBlockStyles, PageBlockTag } from '../types/page.types.ts'

export function createBlock(tag: PageBlockTag, id?: string, preset?: string): PageBlock {
  return {
    id: id ?? createBlockId(tag, preset),
    tag,
    props: defaultProps(tag, preset),
    styles: defaultStyles(tag, preset),
    children: [],
  }
}

function defaultProps(tag: PageBlockTag, preset?: string): PageBlock['props'] {
  if (preset === 'heading') return { text: 'Heading' }
  if (preset === 'paragraph') return { text: 'Paragraph text' }
  if (preset === 'rich-text') return { text: 'Rich text' }
  if (preset === 'quote') return { text: 'Quote text' }
  if (preset === 'submit-button') return { text: 'Submit', type: 'submit' }
  if (preset === 'email-input') return { name: 'email', type: 'email', label: 'Email', placeholder: 'email@example.com' }
  if (preset === 'textarea') return { name: 'message', type: 'textarea', label: 'Message', placeholder: 'Write your message' }
  if (preset === 'media-image') return { src: '', alt: 'Image' }
  if (tag === 'text') return { text: 'Text' }
  if (tag === 'button') return { text: 'Button', type: 'button' }
  if (tag === 'link') return { text: 'Link', href: '#' }
  if (tag === 'image') return { src: '', alt: 'Image' }
  if (tag === 'audio') return { src: '', controls: true }
  if (tag === 'video') return { src: '', poster: '', controls: true }
  if (tag === 'youtube') return { url: '', videoId: '', title: 'Youtube video' }
  if (tag === 'input') return { name: 'field', type: 'text', label: 'Field' }
  if (tag === 'form') return { name: 'form' }
  return {}
}

function defaultStyles(tag: PageBlockTag, preset?: string): PageBlockStyles {
  if (preset === 'heading') return { fontSize: '48px', fontWeight: '700', lineHeight: '1.1', minHeight: '64px', padding: '6px 0' }
  if (preset === 'paragraph' || preset === 'rich-text') return { fontSize: '16px', lineHeight: '1.6', width: '420px', minHeight: '56px', padding: '10px 12px', backgroundColor: '#f8fafc' }
  if (preset === 'quote') return { fontSize: '24px', fontStyle: 'italic', lineHeight: '1.4', width: '420px', minHeight: '72px', padding: '14px 16px', backgroundColor: '#f8fafc' }
  if (preset === 'quick-stack') return { display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '96px', padding: '24px', backgroundColor: '#f8fafc' }
  if (preset === 'v-flex') return { display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '88px', padding: '12px', backgroundColor: '#f8fafc' }
  if (preset === 'h-flex') return { display: 'flex', flexDirection: 'row', gap: '12px', minHeight: '72px', padding: '12px', backgroundColor: '#f8fafc' }
  if (preset === 'grid') return { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', minHeight: '96px', padding: '12px', backgroundColor: '#f8fafc' }
  if (preset === 'card') return { minHeight: '120px', padding: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#ffffff' }
  if (preset === 'divider') return { width: '100%', height: '1px', backgroundColor: '#e5e7eb' }
  if (tag === 'image') return { width: '240px', height: '160px', objectFit: 'cover' }
  if (tag === 'video' || tag === 'youtube') return { width: '420px', height: '236px' }
  if (tag === 'audio') return { width: '320px', height: '40px' }
  if (tag === 'button') return { minHeight: '44px', padding: '10px 16px', backgroundColor: '#111827', color: '#ffffff', borderRadius: '6px' }
  if (tag === 'input') return { minHeight: '44px', padding: '10px 12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px' }
  if (tag === 'text' || tag === 'link') return { minHeight: '40px', padding: '8px 10px', backgroundColor: '#f8fafc' }
  if (tag === 'header' || tag === 'section' || tag === 'div' || tag === 'footer' || tag === 'form') {
    return { minHeight: '96px', padding: '16px', backgroundColor: '#f8fafc' }
  }
  return {}
}

function createBlockId(tag: PageBlockTag, preset?: string): string {
  const prefix = preset ? preset.replace(/[^a-zA-Z0-9_-]/g, '_') : tag
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

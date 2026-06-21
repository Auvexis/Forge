<template>
  <aside class="web-page-toolbox" aria-label="HTML element toolbox">
    <label class="web-page-toolbox__search">
      <LucideIcon name="search" :size="14" />
      <input v-model="query" type="search" placeholder="Search elements" />
    </label>

    <section
      v-for="section in visibleSections"
      :key="section.id"
      class="web-page-toolbox__section"
    >
      <button
        type="button"
        class="web-page-toolbox__section-title"
        @click="toggleSection(section.id)"
      >
        <LucideIcon :name="collapsedSections.includes(section.id) ? 'chevron-right' : 'chevron-down'" :size="12" />
        <span>{{ section.label }}</span>
      </button>

      <div v-if="!collapsedSections.includes(section.id)" class="web-page-toolbox__grid">
        <button
          v-for="item in section.items"
          :key="item.id"
          type="button"
          class="web-page-toolbox__item"
          draggable="true"
          :title="item.label"
          @dragstart="onDragStart($event, item)"
        >
          <span class="web-page-toolbox__item-icon">
            <LucideIcon :name="item.icon" :size="24" :stroke-width="1.8" />
          </span>
          <span class="web-page-toolbox__item-label">{{ item.label }}</span>
        </button>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlockTag } from '../types/page.types.ts'

interface ToolboxItem {
  id: string
  label: string
  icon: string
  tag: PageBlockTag
}

interface ToolboxSection {
  id: string
  label: string
  items: ToolboxItem[]
}

const query = ref('')
const collapsedSections = ref<string[]>([])

const sections: ToolboxSection[] = [
  {
    id: 'recent',
    label: 'Recently used',
    items: [
      { id: 'text-input', label: 'Text Input', icon: 'text-cursor-input', tag: 'input' },
      { id: 'heading', label: 'Heading', icon: 'heading', tag: 'text' },
      { id: 'image', label: 'Image', icon: 'image', tag: 'image' },
      { id: 'button', label: 'Button', icon: 'square-mouse-pointer', tag: 'button' },
    ],
  },
  {
    id: 'text',
    label: 'Text',
    items: [
      { id: 'paragraph', label: 'Paragraph', icon: 'pilcrow', tag: 'text' },
      { id: 'rich-text', label: 'Rich Text', icon: 'type', tag: 'text' },
      { id: 'quote', label: 'Quote', icon: 'quote', tag: 'text' },
      { id: 'link', label: 'Link', icon: 'link', tag: 'link' },
    ],
  },
  {
    id: 'structure',
    label: 'Structure',
    items: [
      { id: 'section', label: 'Section', icon: 'panel-top', tag: 'section' },
      { id: 'container', label: 'Container', icon: 'square', tag: 'div' },
      { id: 'quick-stack', label: 'Quick Stack', icon: 'layers-3', tag: 'div' },
      { id: 'v-flex', label: 'V Flex', icon: 'rows-3', tag: 'div' },
      { id: 'h-flex', label: 'H Flex', icon: 'columns-3', tag: 'div' },
      { id: 'grid', label: 'Grid', icon: 'grid-2x2', tag: 'div' },
    ],
  },
  {
    id: 'form',
    label: 'Form',
    items: [
      { id: 'form', label: 'Form', icon: 'clipboard-list', tag: 'form' },
      { id: 'email-input', label: 'Email Input', icon: 'mail', tag: 'input' },
      { id: 'textarea', label: 'Textarea', icon: 'text', tag: 'input' },
      { id: 'submit-button', label: 'Submit Button', icon: 'send', tag: 'button' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      { id: 'media-image', label: 'Image', icon: 'image', tag: 'image' },
      { id: 'video', label: 'Video', icon: 'clapperboard', tag: 'div' },
      { id: 'youtube', label: 'Youtube', icon: 'youtube', tag: 'div' },
      { id: 'audio', label: 'Audio', icon: 'music', tag: 'div' },
    ],
  },
  {
    id: 'interactive',
    label: 'Interactive',
    items: [
      { id: 'button-link', label: 'Button', icon: 'mouse-pointer-click', tag: 'button' },
      { id: 'nav-link', label: 'Nav Link', icon: 'navigation', tag: 'link' },
      { id: 'card', label: 'Card', icon: 'panel-top-open', tag: 'div' },
      { id: 'divider', label: 'Divider', icon: 'minus', tag: 'div' },
    ],
  },
]

const visibleSections = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return sections

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(term)),
    }))
    .filter((section) => section.items.length > 0)
})

function toggleSection(sectionId: string) {
  collapsedSections.value = collapsedSections.value.includes(sectionId)
    ? collapsedSections.value.filter((id) => id !== sectionId)
    : [...collapsedSections.value, sectionId]
}

function onDragStart(event: DragEvent, item: ToolboxItem) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ tag: item.tag, preset: item.id }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
  setDragPreview(event, item.label)
}

function setDragPreview(event: DragEvent, label: string) {
  if (!event.dataTransfer) return
  const preview = document.createElement('div')
  preview.className = 'web-page-drag-preview'
  preview.textContent = label
  document.body.appendChild(preview)
  event.dataTransfer.setDragImage(preview, 16, 16)
  window.setTimeout(() => preview.remove(), 0)
}
</script>

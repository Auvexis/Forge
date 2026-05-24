<template>
  <div class="web-page-floating-add-toolbar" aria-label="Add elements">
    <BaseButton
      v-for="tool in tools"
      :key="tool.tag"
      draggable="true"
      variant="ghost"
      size="icon"
      :icon-left="tool.icon"
      :title="tool.label"
      @dragstart="onDragStart($event, tool.tag)"
    />
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { PageBlockTag } from '../types/page.types.ts'

const tools: Array<{ tag: PageBlockTag; icon: string; label: string }> = [
  { tag: 'header', icon: 'panel-top', label: 'Header' },
  { tag: 'section', icon: 'layout-template', label: 'Section' },
  { tag: 'div', icon: 'box', label: 'Div' },
  { tag: 'text', icon: 'type', label: 'Text' },
  { tag: 'button', icon: 'square-mouse-pointer', label: 'Button' },
  { tag: 'input', icon: 'text-cursor-input', label: 'Input' },
  { tag: 'form', icon: 'clipboard-list', label: 'Form' },
  { tag: 'image', icon: 'image', label: 'Image' },
  { tag: 'link', icon: 'link', label: 'Link' },
  { tag: 'footer', icon: 'panel-bottom', label: 'Footer' },
]

function onDragStart(event: DragEvent, tag: PageBlockTag) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ tag }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <nav class="web-page-tree" role="tree">
    <template v-if="pages.length">
      <div class="web-page-tree__section">
        <span>Pages</span>
        <button type="button" class="web-page-tree__section-action" title="Add page" @click="$emit('add-page')">
          <LucideIcon name="plus" :size="14" />
        </button>
      </div>
      <div v-for="page in pages" :key="page.id" class="web-page-tree__node web-page-tree__node--page">
        <div
          class="web-page-tree__item web-page-tree__item--page"
          :class="{ 'web-page-tree__item--selected': page.id === activePageId }"
          role="treeitem"
          @click="$emit('select-page', page.id)"
        >
          <button type="button" class="web-page-tree__collapse" @click.stop="togglePage(page.id)">
            <LucideIcon :name="isPageExpanded(page.id) ? 'chevron-down' : 'chevron-right'" :size="14" />
          </button>
          <span class="web-page-tree__icon">
            <LucideIcon name="file" :size="14" />
          </span>
          <span class="web-page-tree__main">
            <span class="web-page-tree__name">{{ page.title }}</span>
          </span>
          <span class="web-page-tree__action-menu" @click.stop>
            <AppDropdownMenu position="bottom-end" :offset="4">
              <template #trigger>
                <button type="button" class="web-page-tree__row-action">
                  <LucideIcon name="ellipsis" :size="14" />
                </button>
              </template>
              <AppDropdownItem label="Duplicate" icon="copy" @click="$emit('duplicate-page', page.id)" />
              <AppDropdownItem label="Delete" icon="trash-2" danger @click="$emit('delete-page', page.id)" />
            </AppDropdownMenu>
          </span>
        </div>
        <div v-if="page.id === activePageId && isPageExpanded(page.id) && blocks.length > 0" class="web-page-tree__children" role="group">
          <div class="web-page-tree__section web-page-tree__section--nested">
            <span>Layers</span>
            <LucideIcon name="list-filter" :size="14" />
          </div>
          <BlockTreePanel
            :blocks="blocks"
            :selected-block-id="selectedBlockId"
            @select="$emit('select', $event)"
            @add-page="$emit('add-page')"
            @delete-block="$emit('delete-block', $event)"
            @duplicate-block="$emit('duplicate-block', $event)"
            @move-block="$emit('move-block', $event)"
          />
        </div>
      </div>
    </template>

    <div v-for="block in pages.length ? [] : blocks" :key="block.id" class="web-page-tree__node">
      <div
        class="web-page-tree__item"
        :class="{ 'web-page-tree__item--selected': block.id === selectedBlockId }"
        draggable="true"
        role="treeitem"
        @dragstart="onDragStart($event, block.id)"
        @dragover.prevent="onDragOver($event)"
        @drop.prevent="onDrop($event, block)"
        @click="$emit('select', block.id)"
      >
        <button
          type="button"
          class="web-page-tree__collapse"
          :disabled="blockChildCount(block) === 0"
          @click.stop="editorStore.toggleBlockCollapsed(block.id)"
        >
          <LucideIcon :name="editorStore.isBlockCollapsed(block.id) ? 'chevron-right' : 'chevron-down'" :size="14" />
        </button>
        <span class="web-page-tree__icon">
          <LucideIcon :name="iconFor(block)" :size="15" />
        </span>
        <span class="web-page-tree__main">
          <span class="web-page-tree__name">{{ blockDisplayName(block) }}</span>
          <input
            v-if="editingBlockId === block.id"
            v-model="draftBlockId"
            class="web-page-tree__id-input"
            autofocus
            @click.stop
            @mousedown.stop
            @keydown.stop
            @keydown.enter.prevent="commitBlockId(block.id)"
            @keydown.esc.prevent="cancelBlockIdEdit"
            @blur="commitBlockId(block.id)"
          />
          <button
            v-else
            type="button"
            class="web-page-tree__id"
            title="Double click to edit ID"
            @mousedown.stop
            @click.stop="$emit('select', block.id)"
            @dblclick.stop="startBlockIdEdit(block.id)"
          >
            {{ block.id }}
          </button>
        </span>
        <span class="web-page-tree__status" aria-hidden="true"></span>
        <span class="web-page-tree__action-menu" @click.stop>
          <AppDropdownMenu position="bottom-end" :offset="4">
            <template #trigger>
              <button type="button" class="web-page-tree__row-action">
                <LucideIcon name="ellipsis" :size="14" />
              </button>
            </template>
            <AppDropdownItem label="Duplicate" icon="copy" @click="$emit('duplicate-block', block.id)" />
            <AppDropdownItem label="Delete" icon="trash-2" danger @click="$emit('delete-block', block.id)" />
          </AppDropdownMenu>
        </span>
      </div>
      <div
        v-if="block.children?.length && !editorStore.isBlockCollapsed(block.id)"
        class="web-page-tree__children"
        role="group"
      >
        <BlockTreePanel
          :blocks="block.children"
          :selected-block-id="selectedBlockId"
          @select="$emit('select', $event)"
          @add-page="$emit('add-page')"
          @delete-block="$emit('delete-block', $event)"
          @duplicate-block="$emit('duplicate-block', $event)"
          @move-block="$emit('move-block', $event)"
        />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import { ref, watch } from 'vue'
import type { PageBlock, SailorPageSummary } from '../types/page.types.ts'
import { blockChildCount, blockDisplayName, type InsertPosition } from '../utils/blockTree.ts'
import { resolveBlockDropIntent } from '../utils/dropIntent.ts'
import { usePageEditorStore } from '../stores/page-editor.store.ts'

const props = withDefaults(defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
  pages?: SailorPageSummary[]
  activePageId?: string
}>(), {
  pages: () => [],
  activePageId: undefined,
})

const editorStore = usePageEditorStore()
const collapsedPageIds = ref<Record<string, boolean>>({})
const editingBlockId = ref<string | null>(null)
const draftBlockId = ref('')

const emit = defineEmits<{
  'add-page': []
  select: [blockId: string]
  'select-page': [pageId: string]
  'delete-page': [pageId: string]
  'duplicate-page': [pageId: string]
  'delete-block': [blockId: string]
  'duplicate-block': [blockId: string]
  'move-block': [payload: { targetId: string; position: InsertPosition; draggedId: string }]
}>()

watch(
  () => [props.activePageId, props.pages.length] as const,
  ([activePageId]) => {
    if (activePageId && collapsedPageIds.value[activePageId] === undefined) {
      collapsedPageIds.value = { ...collapsedPageIds.value, [activePageId]: false }
    }
  },
  { immediate: true },
)

function isPageExpanded(pageId: string) {
  return !collapsedPageIds.value[pageId]
}

function togglePage(pageId: string) {
  collapsedPageIds.value = {
    ...collapsedPageIds.value,
    [pageId]: !collapsedPageIds.value[pageId],
  }
}

function startBlockIdEdit(blockId: string) {
  editingBlockId.value = blockId
  draftBlockId.value = blockId
}

function cancelBlockIdEdit() {
  editingBlockId.value = null
  draftBlockId.value = ''
}

function commitBlockId(blockId: string) {
  const nextId = normalizeDraftBlockId(draftBlockId.value)
  if (nextId && nextId !== blockId) {
    editorStore.renameBlockId(blockId, nextId)
  }
  cancelBlockIdEdit()
}

function normalizeDraftBlockId(value: string) {
  return value.trim().replace(/\s+/g, '_')
}

function onDragStart(event: DragEvent, blockId: string) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ blockId }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  setDragPreview(event, blockId)
}

function onDragOver(event: DragEvent) {
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function onDrop(event: DragEvent, block: PageBlock) {
  const raw = event.dataTransfer?.getData('application/x-sailor-page-block')
  if (!raw) return

  const parsed = JSON.parse(raw) as { blockId?: string }
  if (!parsed.blockId) return

  emit('move-block', { targetId: block.id, position: dropPosition(event, block), draggedId: parsed.blockId })
}

function dropPosition(event: DragEvent, block: PageBlock): InsertPosition {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return resolveBlockDropIntent({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
    isContainer: isContainer(block),
  }).position
}

function iconFor(block: PageBlock): string {
  if (block.tag === 'image') return 'image'
  if (block.tag === 'form') return 'clipboard-list'
  if (block.tag === 'button') return 'square-mouse-pointer'
  if (block.tag === 'input') return 'text-cursor-input'
  if (block.tag === 'link') return 'link'
  if (block.tag === 'text') return 'type'
  return 'hash'
}

function isContainer(block: PageBlock): boolean {
  return ['header', 'section', 'div', 'footer', 'form'].includes(block.tag)
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

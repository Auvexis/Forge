<template>
  <div class="web-page-explorer">
    <div class="web-page-explorer__tabs">
      <BaseSegmentedSelect
        v-model="activeTab"
        aria-label="Explorer view"
        :options="explorerTabs"
      />
    </div>

    <div class="web-page-explorer__content">
      <PageToolboxPanel v-if="activeTab === 'toolbox'" @add-page="$emit('add-page')" />

      <BlockTreePanel
        v-else-if="activeTab === 'tree'"
        :pages="pages"
        :active-page-id="activePageId"
        :blocks="blocks"
        :selected-block-id="selectedBlockId"
        :selected-block-ids="selectedBlockIds"
        @add-page="$emit('add-page')"
        @select-page="$emit('select-page', $event)"
        @select="$emit('select', $event)"
        @delete-page="$emit('delete-page', $event)"
        @duplicate-page="$emit('duplicate-page', $event)"
        @delete-block="$emit('delete-block', $event)"
        @duplicate-block="$emit('duplicate-block', $event)"
        @move-block="$emit('move-block', $event)"
      />

      <SiteAssetsPanel
        v-else-if="activeTab === 'assets'"
        :site="site"
        @upload-asset="$emit('upload-asset', $event)"
        @delete-file="$emit('delete-file', $event)"
      />

      <SiteFilesPanel
        v-else
        :site="site"
        :pages="pages"
        @open-file="$emit('open-file', $event)"
        @create-file="$emit('create-file', $event)"
        @create-folder="$emit('create-folder', $event)"
        @upload-asset="$emit('upload-asset', $event)"
        @delete-file="$emit('delete-file', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseSegmentedSelect, { type BaseSegmentedSelectOption } from '@/shared/components/base/BaseSegmentedSelect.vue'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { PageBlock, FabricPageSummary, FabricSite, SiteFile } from '../types/page.types.ts'
import BlockTreePanel from './BlockTreePanel.vue'
import PageToolboxPanel from './PageToolboxPanel.vue'
import SiteAssetsPanel from './SiteAssetsPanel.vue'
import SiteFilesPanel from './SiteFilesPanel.vue'

defineProps<{
  site: FabricSite | null
  pages: FabricPageSummary[]
  activePageId?: string
  blocks: PageBlock[]
  selectedBlockId: string | null
  selectedBlockIds?: string[]
}>()

defineEmits<{
  'add-page': []
  select: [blockId: string]
  'select-page': [pageId: string]
  'delete-page': [pageId: string]
  'duplicate-page': [pageId: string]
  'delete-block': [blockId: string]
  'duplicate-block': [blockId: string]
  'move-block': [payload: { targetId: string; position: InsertPosition; draggedId: string }]
  'open-file': [file: SiteFile]
  'create-file': [path: string]
  'create-folder': [path: string]
  'upload-asset': [file: File]
  'delete-file': [path: string]
}>()

type PageExplorerTab = 'toolbox' | 'tree' | 'assets' | 'code'

const activeTab = ref<PageExplorerTab>('toolbox')
const explorerTabs: BaseSegmentedSelectOption[] = [
  { value: 'toolbox', label: 'ToolBox', icon: 'blocks' },
  { value: 'tree', label: 'Tree', icon: 'list-tree' },
  { value: 'assets', label: 'Assets', icon: 'image' },
  { value: 'code', label: 'Code', icon: 'code-2' },
]
</script>

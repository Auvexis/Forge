<template>
  <div class="web-page-tree__node">
    <div class="web-page-tree__item" role="treeitem" @click="selectItem">
      <button
        type="button"
        class="web-page-tree__collapse"
        :disabled="item.children.length === 0"
        @click.stop="$emit('toggle', item.id)"
      >
        <LucideIcon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
      </button>

      <span class="web-page-tree__icon" :style="item.accent ? { color: item.accent } : undefined">
        <LucideIcon :name="item.icon" :size="15" />
      </span>

      <span class="web-page-tree__main">
        <span class="web-page-tree__name">{{ item.label }}</span>
        <span class="web-page-tree__id">{{ item.detail }}</span>
      </span>

      <span class="web-page-tree__status" aria-hidden="true"></span>
      <span class="web-page-tree__action-menu" @click.stop>
        <AppDropdownMenu position="bottom-end" :offset="4">
          <template #trigger>
            <button type="button" class="web-page-tree__row-action">
              <LucideIcon name="ellipsis" :size="14" />
            </button>
          </template>
          <AppDropdownItem
            :label="item.componentId ? 'Select Component' : 'Select Node'"
            :icon="item.componentId ? 'component' : 'mouse-pointer-2'"
            :disabled="!item.componentId && !item.nodeId"
            @click="selectItem"
          />
        </AppDropdownMenu>
      </span>
    </div>

    <div v-if="item.children.length && isExpanded" class="web-page-tree__children" role="group">
      <BlueprintComponentsTreeItem
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :expanded="expanded"
        @toggle="$emit('toggle', $event)"
        @select-node="$emit('selectNode', $event)"
        @select-component="$emit('selectComponent', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import type { BlueprintComponentsTreeItemModel } from './blueprintComponentsTree.types.ts'

const props = defineProps<{
  item: BlueprintComponentsTreeItemModel
  expanded: Record<string, boolean>
}>()

const emit = defineEmits<{
  toggle: [itemId: string]
  selectNode: [nodeId: string]
  selectComponent: [componentId: string]
}>()

const isExpanded = computed(() => props.expanded[props.item.id] !== false)

function selectItem() {
  if (props.item.componentId) {
    emit('selectComponent', props.item.componentId)
    return
  }
  if (props.item.nodeId) emit('selectNode', props.item.nodeId)
}
</script>

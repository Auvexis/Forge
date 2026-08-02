<template>
  <div class="web-page-tree__node">
    <div
      class="web-page-tree__item"
      :class="{ 'web-page-tree__item--selected': selectedItemIds.includes(item.id) }"
      role="treeitem"
      @click="$emit('select', item)"
    >
      <button
        type="button"
        class="web-page-tree__collapse"
        :disabled="children.length === 0"
        @click.stop="$emit('toggle', item.id)"
      >
        <LucideIcon :name="collapsedItemIds[item.id] ? 'chevron-right' : 'chevron-down'" :size="14" />
      </button>
      <span class="web-page-tree__icon" :style="item.accent ? { color: item.accent } : undefined">
        <LucideIcon :name="item.icon" :size="15" />
      </span>
      <span class="web-page-tree__main">
        <input
          v-if="editingField === 'name'"
          v-model="draftValue"
          class="web-page-tree__name-input"
          autofocus
          @click.stop
          @mousedown.stop
          @keydown.stop
          @keydown.enter.prevent="commitEdit"
          @keydown.esc.prevent="cancelEdit"
          @blur="commitEdit"
        />
        <span
          v-else
          class="web-page-tree__name"
          title="Double click to edit label"
          @mousedown.stop
          @click.stop="$emit('select', item)"
          @dblclick.stop="startEdit('name')"
        >
          {{ item.name }}
        </span>
        <input
          v-if="editingField === 'treeId'"
          v-model="draftValue"
          class="web-page-tree__id-input"
          autofocus
          @click.stop
          @mousedown.stop
          @keydown.stop
          @keydown.enter.prevent="commitEdit"
          @keydown.esc.prevent="cancelEdit"
          @blur="commitEdit"
        />
        <button
          v-else
          type="button"
          class="web-page-tree__id"
          title="Double click to edit ID"
          @mousedown.stop
          @click.stop="$emit('select', item)"
          @dblclick.stop="startEdit('treeId')"
        >
          {{ item.treeId ?? item.id }}
        </button>
      </span>
      <span class="web-page-tree__status" aria-hidden="true"></span>
      <span class="web-page-tree__action-menu" @click.stop>
        <BaseDropdownMenu position="bottom-end" :offset="4">
          <template #trigger>
            <button type="button" class="web-page-tree__row-action">
              <LucideIcon name="ellipsis" :size="14" />
            </button>
          </template>
          <BaseDropdownItem
            v-for="action in actions"
            :key="action.id"
            :label="action.label"
            :icon="action.icon"
            :danger="action.danger"
            :disabled="action.disabled"
            @click="$emit('action', { actionId: action.id, item })"
          />
        </BaseDropdownMenu>
      </span>
    </div>

    <div v-if="children.length && !collapsedItemIds[item.id]" class="web-page-tree__children" role="group">
      <BaseWebPageTreeNode
        v-for="child in children"
        :key="child.id"
        :item="child"
        :collapsed-item-ids="collapsedItemIds"
        :selected-item-ids="selectedItemIds"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @action="$emit('action', $event)"
        @rename="$emit('rename', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseDropdownMenu from '@/shared/components/base/dropdown/BaseDropdownMenu.vue'
import BaseDropdownItem from '@/shared/components/base/dropdown/BaseDropdownItem.vue'
import type { BaseWebPageTreeItem } from './BaseWebPageTree.vue'

const props = defineProps<{
  item: BaseWebPageTreeItem
  collapsedItemIds: Record<string, boolean>
  selectedItemIds: string[]
}>()

const emit = defineEmits<{
  toggle: [itemId: string]
  select: [item: BaseWebPageTreeItem]
  action: [payload: { actionId: string; item: BaseWebPageTreeItem }]
  rename: [payload: { item: BaseWebPageTreeItem; field: 'name' | 'treeId'; value: string }]
}>()

const editingField = ref<'name' | 'treeId' | null>(null)
const draftValue = ref('')
const children = computed(() => props.item.children ?? [])
const actions = computed(() => props.item.actions ?? [])

function startEdit(field: 'name' | 'treeId') {
  if (field === 'name' && props.item.editableName === false) return
  if (field === 'treeId' && props.item.editableTreeId === false) return
  editingField.value = field
  draftValue.value = field === 'name' ? props.item.name : props.item.treeId ?? props.item.id
}

function cancelEdit() {
  editingField.value = null
  draftValue.value = ''
}

function commitEdit() {
  const field = editingField.value
  const value = draftValue.value.trim()
  if (field && value) {
    emit('rename', { item: props.item, field, value })
  }
  cancelEdit()
}
</script>

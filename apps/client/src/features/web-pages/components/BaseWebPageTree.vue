<template>
  <nav class="web-page-tree" role="tree">
    <template v-for="section in sections" :key="section.id">
      <div v-if="section.items.length || section.alwaysVisible" class="web-page-tree__section">
        <span>{{ section.label }}</span>
        <button
          v-if="section.action"
          type="button"
          class="web-page-tree__section-action"
          :title="section.action.label"
          @click="$emit('sectionAction', section.action.id)"
        >
          <LucideIcon :name="section.action.icon" :size="14" />
        </button>
        <LucideIcon v-else-if="section.icon" :name="section.icon" :size="14" />
      </div>

      <BaseWebPageTreeNode
        v-for="item in section.items"
        :key="item.id"
        :item="item"
        :collapsed-item-ids="collapsedItemIds"
        :selected-item-ids="selectedItemIds"
        @toggle="toggleItem"
        @select="$emit('select', $event)"
        @action="$emit('action', $event)"
      />
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, resolveComponent, type PropType } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'

export interface BaseWebPageTreeAction {
  id: string
  label: string
  icon: string
  danger?: boolean
  disabled?: boolean
}

export interface BaseWebPageTreeItem {
  id: string
  name: string
  treeId?: string
  icon: string
  accent?: string
  children?: BaseWebPageTreeItem[]
  actions?: BaseWebPageTreeAction[]
  data?: Record<string, unknown>
}

export interface BaseWebPageTreeSection {
  id: string
  label: string
  icon?: string
  alwaysVisible?: boolean
  action?: BaseWebPageTreeAction
  items: BaseWebPageTreeItem[]
}

defineProps<{
  sections: BaseWebPageTreeSection[]
  selectedItemIds?: string[]
}>()

defineEmits<{
  select: [item: BaseWebPageTreeItem]
  action: [payload: { actionId: string; item: BaseWebPageTreeItem }]
  sectionAction: [actionId: string]
}>()

const collapsedItemIds = ref<Record<string, boolean>>({})

function toggleItem(itemId: string) {
  collapsedItemIds.value = {
    ...collapsedItemIds.value,
    [itemId]: !collapsedItemIds.value[itemId],
  }
}

const BaseWebPageTreeNode = defineComponent({
  name: 'BaseWebPageTreeNode',
  props: {
    item: {
      type: Object as PropType<BaseWebPageTreeItem>,
      required: true,
    },
    collapsedItemIds: {
      type: Object as PropType<Record<string, boolean>>,
      required: true,
    },
    selectedItemIds: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
  },
  emits: {
    toggle: (_itemId: string) => true,
    select: (_item: BaseWebPageTreeItem) => true,
    action: (_payload: { actionId: string; item: BaseWebPageTreeItem }) => true,
  },
  setup(props, { emit }) {
    const children = computed(() => props.item.children ?? [])
    const actions = computed(() => props.item.actions ?? [])
    const isCollapsed = computed(() => Boolean(props.collapsedItemIds[props.item.id]))
    const isSelected = computed(() => props.selectedItemIds.includes(props.item.id))

    function selectItem() {
      emit('select', props.item)
    }

    return () => h('div', { class: 'web-page-tree__node' }, [
      h('div', {
        class: [
          'web-page-tree__item',
          { 'web-page-tree__item--selected': isSelected.value },
        ],
        role: 'treeitem',
        onClick: selectItem,
      }, [
        h('button', {
          type: 'button',
          class: 'web-page-tree__collapse',
          disabled: children.value.length === 0,
          onClick: (event: MouseEvent) => {
            event.stopPropagation()
            emit('toggle', props.item.id)
          },
        }, [
          h(LucideIcon, {
            name: isCollapsed.value ? 'chevron-right' : 'chevron-down',
            size: 14,
          }),
        ]),
        h('span', {
          class: 'web-page-tree__icon',
          style: props.item.accent ? { color: props.item.accent } : undefined,
        }, [
          h(LucideIcon, { name: props.item.icon, size: 15 }),
        ]),
        h('span', { class: 'web-page-tree__main' }, [
          h('span', { class: 'web-page-tree__name' }, props.item.name),
          h('button', {
            type: 'button',
            class: 'web-page-tree__id',
            title: props.item.treeId,
            onMousedown: (event: MouseEvent) => event.stopPropagation(),
            onClick: (event: MouseEvent) => {
              event.stopPropagation()
              selectItem()
            },
          }, props.item.treeId ?? props.item.id),
        ]),
        h('span', { class: 'web-page-tree__status', 'aria-hidden': 'true' }),
        h('span', {
          class: 'web-page-tree__action-menu',
          onClick: (event: MouseEvent) => event.stopPropagation(),
        }, [
          h(AppDropdownMenu, { position: 'bottom-end', offset: 4 }, {
            trigger: () => h('button', {
              type: 'button',
              class: 'web-page-tree__row-action',
            }, [
              h(LucideIcon, { name: 'ellipsis', size: 14 }),
            ]),
            default: () => actions.value.map((action) =>
              h(AppDropdownItem, {
                label: action.label,
                icon: action.icon,
                danger: action.danger,
                disabled: action.disabled,
                onClick: () => emit('action', { actionId: action.id, item: props.item }),
              }),
            ),
          }),
        ]),
      ]),
      children.value.length && !isCollapsed.value
        ? h('div', { class: 'web-page-tree__children', role: 'group' }, children.value.map((child) =>
            h(resolveComponent('BaseWebPageTreeNode'), {
              key: child.id,
              item: child,
              collapsedItemIds: props.collapsedItemIds,
              selectedItemIds: props.selectedItemIds,
              onToggle: (itemId: string) => emit('toggle', itemId),
              onSelect: (item: BaseWebPageTreeItem) => emit('select', item),
              onAction: (payload: { actionId: string; item: BaseWebPageTreeItem }) => emit('action', payload),
            }),
          ))
        : null,
    ])
  },
})
</script>

<style scoped>
.web-page-tree__item {
  position: relative;
  display: grid;
  grid-template-columns: 14px 16px minmax(0, 1fr) 4px 20px;
  align-items: center;
  gap: var(--fabric-space-1);
  min-height: 28px;
  padding: 0 var(--fabric-space-1);
  border-radius: 0;
  color: var(--fabric-text-primary);
  text-align: left;
  cursor: grab;
}

.web-page-tree__item--drop-inside {
  background: color-mix(in srgb, var(--web-page-selected-color, #3b82f6) 10%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--web-page-selected-color, #3b82f6) 40%, transparent);
}

.web-page-tree__drop-indicator {
  position: absolute;
  right: var(--fabric-space-1);
  left: var(--fabric-space-1);
  z-index: 1;
  pointer-events: none;
}

.web-page-tree__drop-indicator--before,
.web-page-tree__drop-indicator--after {
  height: 2px;
  border-radius: 999px;
  background: var(--web-page-selected-color, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--web-page-selected-color, #3b82f6) 14%, transparent);
}

.web-page-tree__drop-indicator--before {
  top: -1px;
}

.web-page-tree__drop-indicator--after {
  bottom: -1px;
}

.web-page-tree__drop-indicator--inside {
  inset: 3px var(--fabric-space-1);
  border: 1px solid color-mix(in srgb, var(--web-page-selected-color, #3b82f6) 58%, transparent);
  border-radius: var(--fabric-radius-sm);
  background: color-mix(in srgb, var(--web-page-selected-color, #3b82f6) 8%, transparent);
}

.web-page-tree__item:hover {
  background: var(--fabric-bg-elevated);
}

.web-page-tree__item--page {
  grid-template-columns: 14px 16px minmax(0, 1fr) 20px;
  margin-bottom: var(--fabric-space-1);
  cursor: pointer;
}

.web-page-tree__item--selected {
  background: var(--fabric-bg-muted);
  box-shadow: inset 0 0 0 1px var(--fabric-border-strong);
}

.web-page-tree__node {
  position: relative;
}

.web-page-tree__node::before {
  position: absolute;
  top: 14px;
  left: calc(-1 * var(--web-page-tree-indent) + 2px);
  width: calc(var(--web-page-tree-indent) - 5px);
  height: 1px;
  background: color-mix(in srgb, var(--fabric-text-muted) 42%, transparent);
  content: "";
  pointer-events: none;
}

.web-page-tree > .web-page-tree__node::before,
.web-page-tree__node--page::before {
  display: none;
}

.web-page-tree__depth-guide {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--fabric-space-1);
  width: 1px;
  background: color-mix(in srgb, var(--fabric-text-muted) 35%, transparent);
}

.web-page-tree__children {
  position: relative;
  padding-left: var(--web-page-tree-indent);
  margin-left: var(--fabric-space-1);
}

.web-page-tree__children::before {
  position: absolute;
  top: -2px;
  bottom: 12px;
  left: 2px;
  width: 1px;
  background: color-mix(in srgb, var(--fabric-text-muted) 38%, transparent);
  content: "";
  pointer-events: none;
}

.web-page-tree__tag,
.web-page-tree__id,
.web-page-tree__id-input {
  overflow: hidden;
  color: var(--fabric-text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-page-tree__id,
.web-page-tree__id-input {
  min-width: 0;
  height: 20px;
  padding: 0 var(--fabric-space-1);
  border: 1px solid transparent;
  border-radius: var(--fabric-radius-sm);
  background: transparent;
}

.web-page-tree__id:hover,
.web-page-tree__id-input {
  border-color: var(--fabric-border);
  background: var(--fabric-bg-surface);
}

.web-page-tree__main {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(44px, 0.8fr);
  align-items: center;
  gap: var(--fabric-space-1);
  min-width: 0;
}

.web-page-tree__name {
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-page-tree__collapse,
.web-page-tree__row-action {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: var(--fabric-radius-sm);
  background: transparent;
  color: var(--fabric-text-secondary);
}

.web-page-tree__row-action:hover {
  color: var(--fabric-text-primary);
}

.web-page-tree__action-menu .app-popover-trigger:hover {
  background: transparent !important;
}

.web-page-tree__action-menu {
  margin-right: var(--fabric-space-1);
}

.web-page-tree__collapse:disabled {
  opacity: 0;
}

.web-page-tree__icon,
.web-page-tree__status {
  display: inline-grid;
  place-items: center;
  color: var(--fabric-text-secondary);
}

.web-page-tree__status {
  width: 4px;
  height: 4px;
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-text-secondary);
}

.web-page-tree__section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  margin-top: var(--fabric-space-2);
  padding: 0 var(--fabric-space-2);
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
}

.web-page-tree__section--nested {
  margin-top: var(--fabric-space-3);
}

.web-page-tree__section-action {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-text-secondary);
}

.web-page-tree__section-action:hover {
  background: var(--fabric-bg-elevated);
  color: var(--fabric-text-primary);
}
</style>

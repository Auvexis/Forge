<script setup lang="ts">
import { ref } from 'vue'
import type { ExecutionRunTreeNode } from './executionRunTree.types.ts'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineOptions({ name: 'ExecutionNodeTree' })
const props = withDefaults(
  defineProps<{
    nodes: ExecutionRunTreeNode[]
    selectedNodeId?: string | null
    depth?: number
  }>(),
  { selectedNodeId: null, depth: 0 },
)
const emit = defineEmits<{ (event: 'select', nodeId: string): void }>()
const collapsedIds = ref(new Set<string>())

function activate(node: ExecutionRunTreeNode) {
  emit('select', node.nodeId)
  if (!node.children.length) return
  const next = new Set(collapsedIds.value)
  if (next.has(node.nodeId)) next.delete(node.nodeId)
  else next.add(node.nodeId)
  collapsedIds.value = next
}
</script>

<template>
  <div class="execution-node-tree" :class="{ 'execution-node-tree--nested': props.depth > 0 }">
    <div
      v-for="(node, index) in props.nodes"
      :key="node.id"
      class="execution-node-tree__branch"
      :class="{
        'execution-node-tree__branch--first': index === 0,
        'execution-node-tree__branch--has-next': index < props.nodes.length - 1,
      }"
    >
      <BaseButton
        class="execution-node-tree__row"
        :class="{
          'execution-node-tree__row--active': node.nodeId === props.selectedNodeId,
          'execution-node-tree__row--leaf': !node.children.length,
          [`execution-node-tree__row--${node.status}`]: true,
          'execution-node-tree__row--error': node.kind === 'error',
        }"
        variant="ghost"
        type="button"
        @click="activate(node)"
      >
        <LucideIcon
          v-if="node.children.length"
          name="chevron-right"
          :size="14"
          class="execution-node-tree__chevron"
          :class="{ 'is-open': !collapsedIds.has(node.nodeId) }"
        />
        <span v-if="node.avatar" class="execution-node-tree__avatar" aria-hidden="true">
          {{ node.avatar }}
        </span>
        <LucideIcon
          v-else
          :name="node.icon"
          :size="20"
          class="execution-node-tree__icon"
          :style="{ color: node.iconColor }"
        />
        <span class="execution-node-tree__name">{{ node.name }}</span>
        <code v-if="node.durationMs !== null">{{ node.durationMs }}ms</code>
        <span v-else-if="node.kind === 'error'" class="execution-node-tree__error-label">Failed</span>
      </BaseButton>

      <Transition name="execution-node-tree-children">
        <ExecutionNodeTree
          v-if="node.children.length && !collapsedIds.has(node.nodeId)"
          :nodes="node.children"
          :selected-node-id="props.selectedNodeId"
          :depth="props.depth + 1"
          @select="emit('select', $event)"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.execution-node-tree {
  display: grid;
  width: max-content;
  min-width: 100%;
  gap: var(--fabric-space-2);
}

.execution-node-tree--nested {
  position: relative;
  margin-left: calc(var(--fabric-space-4) + 7px);
  padding-left: var(--fabric-space-3);
}

.execution-node-tree__branch {
  position: relative;
  display: grid;
  gap: var(--fabric-space-2);
}

.execution-node-tree--nested > .execution-node-tree__branch::before {
  content: '';
  position: absolute;
  top: 18px;
  left: calc(-1 * var(--fabric-space-3));
  width: calc(var(--fabric-space-3) + var(--fabric-space-2));
  border-top: 1px solid var(--fabric-border-strong);
}

.execution-node-tree--nested > .execution-node-tree__branch::after {
  content: '';
  position: absolute;
  top: 0;
  left: calc(-1 * var(--fabric-space-3));
  height: 18px;
  border-left: 1px solid var(--fabric-border-strong);
}

.execution-node-tree--nested > .execution-node-tree__branch--first::after {
  top: calc(-1 * var(--fabric-space-2));
  height: calc(18px + var(--fabric-space-2));
}

.execution-node-tree--nested > .execution-node-tree__branch--has-next::after {
  bottom: calc(-1 * var(--fabric-space-2));
  height: auto;
}

.execution-node-tree__row {
  width: 280px;
  min-height: 36px;
  margin-left: var(--fabric-space-2);
  padding: var(--fabric-space-2);
  border-radius: var(--fabric-radius-sm);
}
.execution-node-tree__row :deep(.base-button__label) {
  width: 100%;
  display: grid;
  grid-template-columns: 14px 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--fabric-space-2);
  text-align: left;
}
.execution-node-tree__row--leaf :deep(.base-button__label) {
  grid-template-columns: 24px minmax(0, 1fr) auto;
}
.execution-node-tree__row--active {
  background-color: var(--fabric-button-ghost-active);
}
.execution-node-tree__row--success {
  border-left: 2px solid var(--fabric-status-success-border);
}
.execution-node-tree__row--failed,
.execution-node-tree__row--error {
  border-left: 2px solid var(--fabric-status-error-border);
}
.execution-node-tree__row--failed .execution-node-tree__name,
.execution-node-tree__row--error .execution-node-tree__name {
  color: var(--fabric-status-error-text);
}
.execution-node-tree__row--error {
  background-color: color-mix(in srgb, var(--fabric-status-error-bg) 58%, transparent);
}
.execution-node-tree__row--running,
.execution-node-tree__row--retrying,
.execution-node-tree__row--waiting {
  border-left: 2px solid var(--fabric-border-brand);
}
.execution-node-tree__chevron {
  color: var(--fabric-text-muted);
  transition: transform var(--fabric-duration-base) var(--fabric-ease-standard);
}
.execution-node-tree__chevron.is-open {
  transform: rotate(90deg);
}
.execution-node-tree__icon {
  flex: 0 0 auto;
}
.execution-node-tree__avatar {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  font-size: 18px;
  line-height: 1;
}
.execution-node-tree__name {
  min-width: 0;
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.execution-node-tree__row code {
  color: var(--fabric-text-muted);
  font-family: var(--fabric-font-mono);
  font-size: 9px;
}
.execution-node-tree__error-label {
  color: var(--fabric-status-error-text);
  font-family: var(--fabric-font-mono);
  font-size: 9px;
}
.execution-node-tree-children-enter-active,
.execution-node-tree-children-leave-active {
  overflow: hidden;
  transition:
    opacity var(--fabric-duration-base) var(--fabric-ease-standard),
    transform var(--fabric-duration-base) var(--fabric-ease-standard);
}
.execution-node-tree-children-enter-from,
.execution-node-tree-children-leave-to {
  opacity: 0;
  transform: translateY(calc(-1 * var(--fabric-space-2)));
}
</style>

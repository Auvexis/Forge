<template>
  <div class="web-page-blueprint-toolbox">
    <div class="web-page-blueprint-toolbox__header">
      <BaseSegmentedSelect
        v-model="activeTab"
        :options="tabs"
        aria-label="Blueprint toolbox sections"
      />
    </div>

    <div class="web-page-blueprint-toolbox__main">
      <template v-if="activeTab === 'utilities'">
        <section
          v-for="group in utilityGroups"
          :key="group.category"
          class="web-page-blueprint-toolbox__group"
        >
          <header>
            <span>{{ group.category }}</span>
            <small>{{ group.items.length }}</small>
          </header>

          <button
            v-for="item in group.items"
            :key="item.type"
            class="web-page-blueprint-toolbox__item"
            type="button"
            @click="$emit('addUtilityNode', item.type)"
          >
            <span class="web-page-blueprint-toolbox__icon" :style="{ color: item.accent }">
              <LucideIcon :name="item.icon" :size="15" />
            </span>
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </button>
        </section>
      </template>

      <template v-else>
        <BlueprintComponentsTree
          :components="components"
          :groups="blueprintGroups"
          :nodes="nodes"
          :blocks="blocks"
          :selected-node-id="selectedNodeId"
          @select-component="$emit('selectComponent', $event)"
          @select-node="$emit('selectNode', $event)"
          @rename-group="(groupId, name) => $emit('renameGroup', groupId, name)"
          @rename-group-id="(groupId, nextGroupId) => $emit('renameGroupId', groupId, nextGroupId)"
          @rename-component="(componentId, name) => $emit('renameComponent', componentId, name)"
          @rename-node-label="(nodeId, label) => $emit('renameNodeLabel', nodeId, label)"
          @rename-node-id="(nodeId, nextNodeId) => $emit('renameNodeId', nodeId, nextNodeId)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseSegmentedSelect, { type BaseSegmentedSelectOption } from '@/shared/components/base/BaseSegmentedSelect.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlock } from '../../types/page.types.ts'
import type {
  PageBlueprintComponent,
  PageBlueprintGroup,
  PageBlueprintNode,
  PageBlueprintUtilityNodeType,
} from '../pageBlueprintSchema.ts'
import { pageBlueprintNodeDefinitionsByCategory } from '../pageBlueprintNodeRegistry.ts'
import BlueprintComponentsTree from './BlueprintComponentsTree.vue'

defineProps<{
  components: PageBlueprintComponent[]
  blueprintGroups: PageBlueprintGroup[]
  nodes: PageBlueprintNode[]
  blocks: PageBlock[]
  selectedNodeId?: string | null
}>()

defineEmits<{
  addUtilityNode: [type: PageBlueprintUtilityNodeType]
  selectComponent: [componentId: string]
  selectNode: [nodeId: string]
  renameGroup: [groupId: string, name: string]
  renameGroupId: [groupId: string, nextGroupId: string]
  renameComponent: [componentId: string, name: string]
  renameNodeLabel: [nodeId: string, label: string]
  renameNodeId: [nodeId: string, nextNodeId: string]
}>()

const activeTab = ref<'utilities' | 'components'>('utilities')
const utilityGroups = pageBlueprintNodeDefinitionsByCategory()
const tabs = computed<BaseSegmentedSelectOption[]>(() => [
  { value: 'utilities', label: 'Utilities', icon: 'blocks' },
  { value: 'components', label: 'Components', icon: 'component' },
])
</script>

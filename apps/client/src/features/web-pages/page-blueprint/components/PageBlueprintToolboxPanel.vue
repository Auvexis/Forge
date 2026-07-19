<template>
  <div class="web-page-blueprint-toolbox">
    <BaseSegmentedSelect
      v-model="activeTab"
      :options="tabs"
      aria-label="Blueprint toolbox sections"
    />

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
        @create-component-from-root="$emit('createComponentFromRoot')"
        @select-component="$emit('selectComponent', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseSegmentedSelect, { type BaseSegmentedSelectOption } from '@/shared/components/base/BaseSegmentedSelect.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlueprintComponent, PageBlueprintGroup, PageBlueprintUtilityNodeType } from '../pageBlueprintSchema.ts'
import { pageBlueprintNodeDefinitionsByCategory } from '../pageBlueprintNodeRegistry.ts'
import BlueprintComponentsTree from './BlueprintComponentsTree.vue'

const props = defineProps<{
  components: PageBlueprintComponent[]
  blueprintGroups: PageBlueprintGroup[]
}>()

defineEmits<{
  addUtilityNode: [type: PageBlueprintUtilityNodeType]
  createComponentFromRoot: []
  selectComponent: [componentId: string]
}>()

const activeTab = ref<'utilities' | 'components'>('utilities')
const utilityGroups = pageBlueprintNodeDefinitionsByCategory()
const tabs = computed<BaseSegmentedSelectOption[]>(() => [
  { value: 'utilities', label: `Utilities ${utilityGroups.reduce((sum, group) => sum + group.items.length, 0)}`, icon: 'blocks' },
  { value: 'components', label: `Components ${props.components.length + props.blueprintGroups.length}`, icon: 'component' },
])
</script>

<template>
  <nav class="web-page-blueprint-components-tree" role="tree">
    <button
      class="web-page-blueprint-components-tree__item web-page-blueprint-components-tree__item--action"
      type="button"
      @click="$emit('createComponentFromRoot')"
    >
      <span class="web-page-blueprint-components-tree__icon">
        <LucideIcon name="component" :size="14" />
      </span>
      <span class="web-page-blueprint-components-tree__main">
        <strong>Create From Root</strong>
        <small>Selected node or root element</small>
      </span>
    </button>

    <section v-if="groups.length" class="web-page-blueprint-components-tree__section">
      <span>Groups</span>
      <small>{{ groups.length }}</small>
    </section>
    <button
      v-for="group in groups"
      :key="group.id"
      class="web-page-blueprint-components-tree__item"
      type="button"
      role="treeitem"
    >
      <span class="web-page-blueprint-components-tree__icon" :style="{ color: group.color ?? '#8b6fd6' }">
        <LucideIcon name="group" :size="14" />
      </span>
      <span class="web-page-blueprint-components-tree__main">
        <strong>{{ group.name }}</strong>
        <small>{{ group.nodeIds.length }} nodes</small>
      </span>
    </button>

    <section v-if="components.length" class="web-page-blueprint-components-tree__section">
      <span>Components</span>
      <small>{{ components.length }}</small>
    </section>
    <button
      v-for="component in components"
      :key="component.id"
      class="web-page-blueprint-components-tree__item"
      type="button"
      role="treeitem"
      @click="$emit('selectComponent', component.id)"
    >
      <span class="web-page-blueprint-components-tree__icon">
        <LucideIcon name="component" :size="14" />
      </span>
      <span class="web-page-blueprint-components-tree__main">
        <strong>{{ component.name }}</strong>
        <small>{{ component.nodeIds.length }} nodes / {{ component.props.length }} props</small>
      </span>
    </button>

    <p v-if="components.length === 0 && groups.length === 0" class="web-page-blueprint-toolbox__empty">
      No page components or groups.
    </p>
  </nav>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlueprintComponent, PageBlueprintGroup } from '../pageBlueprintSchema.ts'

defineProps<{
  components: PageBlueprintComponent[]
  groups: PageBlueprintGroup[]
}>()

defineEmits<{
  createComponentFromRoot: []
  selectComponent: [componentId: string]
}>()
</script>

<template>
  <nav class="web-page-tree web-page-blueprint-components-tree" role="tree">
    <button
      class="web-page-tree__item web-page-blueprint-components-tree__action"
      type="button"
      @click="$emit('createComponentFromRoot')"
    >
      <span class="web-page-tree__collapse" aria-hidden="true">
        <LucideIcon name="plus" :size="14" />
      </span>
      <span class="web-page-tree__icon">
        <LucideIcon name="component" :size="14" />
      </span>
      <span class="web-page-tree__main">
        <span class="web-page-tree__name">Create From Root</span>
        <span class="web-page-tree__id">Selected node or root element</span>
      </span>
      <span class="web-page-tree__status" aria-hidden="true"></span>
    </button>

    <section v-if="groups.length" class="web-page-tree__section web-page-tree__section--nested">
      <span>Groups</span>
      <small>{{ groups.length }}</small>
    </section>
    <div v-for="group in groups" :key="group.id" class="web-page-tree__node">
      <button class="web-page-tree__item" type="button" role="treeitem">
        <span class="web-page-tree__collapse" aria-hidden="true">
          <LucideIcon name="minus" :size="14" />
        </span>
        <span class="web-page-tree__icon" :style="{ color: group.color ?? '#8b6fd6' }">
          <LucideIcon name="group" :size="15" />
        </span>
        <span class="web-page-tree__main">
          <span class="web-page-tree__name">{{ group.name }}</span>
          <span class="web-page-tree__id">{{ group.nodeIds.length }} nodes</span>
        </span>
        <span class="web-page-tree__status" aria-hidden="true"></span>
      </button>
    </div>

    <section v-if="components.length" class="web-page-tree__section web-page-tree__section--nested">
      <span>Components</span>
      <small>{{ components.length }}</small>
    </section>
    <div v-for="component in components" :key="component.id" class="web-page-tree__node">
      <button
        class="web-page-tree__item"
        type="button"
        role="treeitem"
        @click="$emit('selectComponent', component.id)"
      >
        <span class="web-page-tree__collapse" aria-hidden="true">
          <LucideIcon name="minus" :size="14" />
        </span>
        <span class="web-page-tree__icon">
          <LucideIcon name="component" :size="15" />
        </span>
        <span class="web-page-tree__main">
          <span class="web-page-tree__name">{{ component.name }}</span>
          <span class="web-page-tree__id">{{ component.nodeIds.length }} nodes / {{ component.props.length }} props</span>
        </span>
        <span class="web-page-tree__status" aria-hidden="true"></span>
      </button>
    </div>

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

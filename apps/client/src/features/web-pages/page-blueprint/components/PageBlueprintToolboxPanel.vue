<template>
  <div class="web-page-blueprint-toolbox">
    <nav class="web-page-blueprint-toolbox__tabs" aria-label="Blueprint toolbox sections">
      <button
        class="web-page-blueprint-toolbox__tab"
        :class="{ 'is-active': activeTab === 'utilities' }"
        type="button"
        @click="activeTab = 'utilities'"
      >
        Utilities
      </button>
      <button
        class="web-page-blueprint-toolbox__tab"
        :class="{ 'is-active': activeTab === 'components' }"
        type="button"
        @click="activeTab = 'components'"
      >
        Components
      </button>
    </nav>

    <template v-if="activeTab === 'utilities'">
      <section
        v-for="group in groups"
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
      <section class="web-page-blueprint-toolbox__group">
        <header>
          <span>Page Components</span>
          <small>{{ components.length }}</small>
        </header>

        <button
          class="web-page-blueprint-toolbox__item"
          type="button"
          @click="$emit('createComponentFromRoot')"
        >
          <span class="web-page-blueprint-toolbox__icon">
            <LucideIcon name="component" :size="15" />
          </span>
          <span>
            <strong>Create From Root</strong>
            <small>Use the selected root element or node selection.</small>
          </span>
        </button>

        <button
          v-for="component in components"
          :key="component.id"
          class="web-page-blueprint-toolbox__item"
          type="button"
          @click="$emit('selectComponent', component.id)"
        >
          <span class="web-page-blueprint-toolbox__icon">
            <LucideIcon name="component" :size="15" />
          </span>
          <span>
            <strong>{{ component.name }}</strong>
            <small>{{ component.nodeIds.length }} nodes / {{ component.props.length }} props</small>
          </span>
        </button>

        <p v-if="components.length === 0" class="web-page-blueprint-toolbox__empty">
          No page components.
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlueprintComponent, PageBlueprintUtilityNodeType } from '../pageBlueprintSchema.ts'
import { pageBlueprintNodeDefinitionsByCategory } from '../pageBlueprintNodeRegistry.ts'

defineProps<{
  components: PageBlueprintComponent[]
}>()

defineEmits<{
  addUtilityNode: [type: PageBlueprintUtilityNodeType]
  createComponentFromRoot: []
  selectComponent: [componentId: string]
}>()

const activeTab = ref<'utilities' | 'components'>('utilities')
const groups = pageBlueprintNodeDefinitionsByCategory()
</script>

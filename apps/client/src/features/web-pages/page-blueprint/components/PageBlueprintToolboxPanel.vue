<template>
  <div class="web-page-blueprint-toolbox">
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
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlueprintUtilityNodeType } from '../pageBlueprintSchema.ts'
import { pageBlueprintNodeDefinitionsByCategory } from '../pageBlueprintNodeRegistry.ts'

defineEmits<{
  addUtilityNode: [type: PageBlueprintUtilityNodeType]
}>()

const groups = pageBlueprintNodeDefinitionsByCategory()
</script>

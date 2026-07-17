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
import { pageBlueprintNodeDefinitionsByCategory } from '../pageBlueprintNodeRegistry.ts'

const groups = pageBlueprintNodeDefinitionsByCategory()
</script>

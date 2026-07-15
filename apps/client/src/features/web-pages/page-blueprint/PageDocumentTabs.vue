<template>
  <nav class="web-page-document-tabs" aria-label="Pages documents">
    <span
      v-for="tab in tabs"
      :key="tab.id"
      class="web-page-document-tabs__tab"
      :class="{ 'web-page-document-tabs__tab--active': tab.id === activeTabId }"
    >
      <button class="web-page-document-tabs__main" type="button" @click="$emit('activate', tab.id)">
        <LucideIcon :name="tab.icon" :size="13" />
        <span>{{ tab.label }}</span>
        <small v-if="tab.detail">{{ tab.detail }}</small>
      </button>
      <button
        v-if="tab.closable"
        class="web-page-document-tabs__close"
        type="button"
        title="Close document"
        @click.stop="$emit('close', tab.id)"
      >
        <LucideIcon name="x" :size="12" />
      </button>
    </span>
  </nav>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlueprintDocumentTab } from './pageBlueprint.types.ts'

defineProps<{
  tabs: PageBlueprintDocumentTab[]
  activeTabId: string
}>()

defineEmits<{
  activate: [tabId: string]
  close: [tabId: string]
}>()
</script>

<template>
  <BaseModal :is-open="isOpen" max-width="920px" height="70vh" @close="$emit('close')">
    <section class="web-page-switcher">
      <header class="web-page-switcher__header">
        <h3>Switch page</h3>
        <BaseButton variant="outline" icon-left="x" @click="$emit('close')" />
      </header>
      <div class="web-page-switcher__grid">
        <button
          v-for="page in pages"
          :key="page.id"
          type="button"
          class="web-page-switcher__card"
          :class="{ 'web-page-switcher__card--active': page.id === activePageId }"
          @click="$emit('select', page.id)"
        >
          <span class="web-page-switcher__preview">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span class="web-page-switcher__title">{{ page.title }}</span>
          <span class="web-page-switcher__slug">/{{ page.slug }}</span>
        </button>
      </div>
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import type { SailorPageSummary } from '../types/page.types.ts'

defineProps<{
  isOpen: boolean
  pages: SailorPageSummary[]
  activePageId?: string | null
}>()

defineEmits<{
  close: []
  select: [pageId: string]
}>()
</script>

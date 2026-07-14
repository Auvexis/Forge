<template>
  <div class="web-page-project-topbar">
    <button
      class="web-page-project-topbar__trigger"
      :class="{ 'web-page-project-topbar__trigger--open': isOpen }"
      type="button"
      @click="emit('open')"
    >
      <span>{{ activeProject?.name ?? 'Pages' }}</span>
      <LucideIcon class="web-page-project-topbar__chevron" name="chevron-down" :size="13" />
    </button>

    <span class="web-page-project-topbar__status">
      <LucideIcon
        class="web-page-project-topbar__status-icon"
        :class="{ 'web-page-project-topbar__status-icon--spin': saveState === 'saving' }"
        :name="saveStatusIcon"
        :size="19"
      />
      {{ saveStatusLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FabricSite } from '../types/page.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  activeProject?: FabricSite | null
  projects: FabricSite[]
  isOpen?: boolean
  isDirty?: boolean
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'select-project', projectId: string): void
}>()

const saveState = computed<'saving' | 'dirty' | 'saved'>(() => {
  if (props.isSaving) return 'saving'
  if (props.isDirty) return 'dirty'
  return 'saved'
})

const saveStatusLabel = computed(() => {
  if (saveState.value === 'saving') return 'Saving pages...'
  if (saveState.value === 'dirty') return 'Unsaved changes'
  return 'Saved'
})

const saveStatusIcon = computed(() => {
  if (saveState.value === 'saving') return 'loader-circle'
  if (saveState.value === 'dirty') return 'cloud-alert'
  return 'cloud-check'
})
</script>

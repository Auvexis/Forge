<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseWorkspaceTab from './BaseWorkspaceTab.vue'
import BaseWorkspaceWindow from './BaseWorkspaceWindow.vue'

const props = withDefaults(defineProps<{
  open: boolean
  workspaceId: string
  title: string
  modalMaxWidth?: string
  modalHeight?: string
  windowWidth?: number
  windowHeight?: number
  desktopExternal?: boolean
}>(), {
  modalMaxWidth: '1600px',
  modalHeight: '85vh',
  windowWidth: 1180,
  windowHeight: 780,
  desktopExternal: true,
})

const emit = defineEmits<{
  (event: 'close'): void
}>()

const externalOpenFailed = ref(false)
const useWorkspaceWindow = computed(
  () => props.desktopExternal && window.fabricDesktop?.isDesktop === true && !externalOpenFailed.value,
)

watch(
  () => props.open,
  (open) => {
    if (!open) externalOpenFailed.value = false
  },
)
</script>

<template>
  <BaseWorkspaceWindow
    v-if="useWorkspaceWindow"
    :open="open"
    :workspace-id="workspaceId"
    :title="title"
    :width="windowWidth"
    :height="windowHeight"
    @closed="emit('close')"
    @open-failed="externalOpenFailed = true"
  >
    <template #tabs>
      <slot name="tabs">
        <BaseWorkspaceTab :title="title" active @close="emit('close')" />
      </slot>
    </template>
    <slot />
  </BaseWorkspaceWindow>

  <BaseModal
    v-else
    :is-open="open"
    :max-width="modalMaxWidth"
    :height="modalHeight"
    @close="emit('close')"
  >
    <slot />
  </BaseModal>
</template>

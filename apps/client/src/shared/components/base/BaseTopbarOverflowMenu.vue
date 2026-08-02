<template>
  <BaseDropdownMenu
    ref="rootMenuRef"
    class="base-topbar-overflow-menu"
    position="bottom-start"
    :offset="2"
    allow-overflow
    @close="activeGroupId = null"
  >
    <template #trigger>
      <button class="base-topbar-overflow-menu__trigger" type="button" aria-label="Route menu">
        <LucideIcon name="menu" :size="17" />
      </button>
    </template>

    <div class="base-topbar-overflow-menu__groups" @click.stop @touchstart.stop>
      <div
        v-for="group in groups"
        :key="group.id"
        class="base-topbar-overflow-menu__group"
        @mouseenter="activeGroupId = group.id"
        @focusin="activeGroupId = group.id"
      >
        <button
          class="base-topbar-overflow-menu__group-trigger"
          type="button"
          @click.stop="activeGroupId = group.id"
        >
          <span>{{ group.label }}</span>
          <LucideIcon name="chevron-right" :size="14" />
        </button>

        <BaseTopbarOverflowSubmenu
          v-if="activeGroupId === group.id"
          :items="group.items"
          @command="handleItemClick"
        />
      </div>
    </div>
  </BaseDropdownMenu>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import BaseDropdownMenu from '@/shared/components/base/dropdown/BaseDropdownMenu.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseTopbarOverflowSubmenu from './BaseTopbarOverflowSubmenu.vue'

export interface BaseTopbarOverflowMenuItem {
  id: string
  label: string
  icon?: string
  hint?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
}

export interface BaseTopbarOverflowMenuGroup {
  id: string
  label: string
  items: BaseTopbarOverflowMenuItem[]
}

defineProps<{
  groups: BaseTopbarOverflowMenuGroup[]
}>()

const emit = defineEmits<{
  command: [id: string]
}>()

const rootMenuRef = ref<InstanceType<typeof BaseDropdownMenu> | null>(null)
const activeGroupId = ref<string | null>(null)
let compactMenuMedia: MediaQueryList | null = null

function handleItemClick(id: string) {
  rootMenuRef.value?.close()
  emit('command', id)
}

function closeWhenExpanded(event: MediaQueryListEvent | MediaQueryList) {
  if (event.matches) return
  rootMenuRef.value?.close()
  activeGroupId.value = null
}

onMounted(() => {
  compactMenuMedia = window.matchMedia('(max-width: 1350px)')
  compactMenuMedia.addEventListener('change', closeWhenExpanded)
})

onUnmounted(() => {
  compactMenuMedia?.removeEventListener('change', closeWhenExpanded)
})
</script>

<style scoped>
.base-topbar-overflow-menu {
  display: none;
  height: 100%;
  -webkit-app-region: no-drag;
}

.base-topbar-overflow-menu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: var(--fabric-base-topbar-button-radius);
  background: transparent;
  color: var(--fabric-base-topbar-button-topbar-search-text);
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-topbar-overflow-menu__trigger:hover {
  background: var(--fabric-base-topbar-button-topbar-search-hover-bg);
  color: var(--fabric-base-topbar-button-topbar-search-hover-text);
}

.base-topbar-overflow-menu__groups {
  position: relative;
  display: flex;
  min-width: 184px;
  flex-direction: column;
  gap: 2px;
}

.base-topbar-overflow-menu__group {
  position: relative;
}

.base-topbar-overflow-menu__group-trigger {
  display: flex;
  width: 100%;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-4);
  padding: 5px 8px;
  border: 0;
  border-radius: var(--fabric-app-dropdown-item-radius);
  background: transparent;
  color: var(--fabric-app-dropdown-item-text-primary);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.base-topbar-overflow-menu__group-trigger:hover,
.base-topbar-overflow-menu__group:focus-within .base-topbar-overflow-menu__group-trigger {
  background: var(--fabric-app-dropdown-item-button-ghost-hover);
  color: var(--fabric-app-dropdown-item-button-ghost-hover-text);
}

@media (max-width: 1350px) {
  .base-topbar-overflow-menu {
    display: inline-flex;
  }
}
</style>

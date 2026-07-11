<template>
  <header class="app-topbar">
    <img :src="logoSrc" alt="Fabric" class="app-topbar__logo" />
    <button class="app-topbar__search" type="button" @click="$emit('open-command-palette')">
      <LucideIcon name="search" :size="16" />
      <span>Search workflows, commands, plugins...</span>
      <kbd>Ctrl K</kbd>
    </button>
    <div class="app-topbar__actions">
      <NotificationTrigger />
    </div>
  </header>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useTheme } from '@/shared/composables/useTheme'
import NotificationTrigger from '@/shared/components/feedback/NotificationTrigger.vue'

defineEmits<{
  (e: 'open-command-palette'): void
}>()

const { logoSrc } = useTheme()
</script>

<style scoped>
.app-topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 0 var(--fabric-space-5);
  border-bottom: 1px solid var(--fabric-topbar-border);
  background: var(--fabric-topbar-bg);
  flex-shrink: 0;
}

.app-topbar__logo {
  position: absolute;
  left: var(--fabric-space-5);
  height: 22px;
  width: auto;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.app-topbar__search {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-3);
  width: min(620px, 100%);
  height: 34px;
  padding: 0 var(--fabric-space-3);
  border: 1px solid var(--fabric-topbar-search-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-topbar-search-text);
  background: var(--fabric-topbar-search-bg);
  cursor: pointer;
  transition:
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard),
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.app-topbar__search:hover {
  color: var(--fabric-topbar-search-hover-text);
  border-color: var(--fabric-topbar-search-border);
  background: var(--fabric-topbar-search-hover-bg);
}

.app-topbar__search span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: var(--fabric-text-sm);
}

.app-topbar__search kbd {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid var(--fabric-topbar-search-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-topbar-search-text);
  background: var(--fabric-topbar-kbd-bg);
  font-family: var(--fabric-font-mono);
  font-size: 10px;
}

.app-topbar__actions {
  position: absolute;
  right: var(--fabric-space-5);
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

@media (max-width: 640px) {
  .app-topbar {
    padding: 0 var(--fabric-space-3);
  }

  .app-topbar__logo {
    left: var(--fabric-space-3);
  }

  .app-topbar__actions {
    right: var(--fabric-space-3);
  }

  .app-topbar__search kbd {
    display: none;
  }
}
</style>

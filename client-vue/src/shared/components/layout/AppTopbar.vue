<template>
  <header class="app-topbar">
    <img :src="logoSrc" alt="Sailor" class="app-topbar__logo" />
    <button class="app-topbar__search" type="button" @click="$emit('open-command-palette')">
      <LucideIcon name="search" :size="16" />
      <span>Search workflows, commands, plugins...</span>
      <kbd>Ctrl K</kbd>
    </button>
  </header>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useTheme } from '@/shared/composables/useTheme'

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
  padding: 0 var(--sailor-space-5);
  border-bottom: 1px solid var(--sailor-topbar-border);
  background: var(--sailor-topbar-bg);
  flex-shrink: 0;
}

.app-topbar__logo {
  position: absolute;
  left: var(--sailor-space-5);
  height: 22px;
  width: auto;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.app-topbar__search {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-3);
  width: min(620px, 100%);
  height: 34px;
  padding: 0 var(--sailor-space-3);
  border: 1px solid var(--sailor-topbar-search-border);
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-topbar-search-text);
  background: var(--sailor-topbar-search-bg);
  cursor: pointer;
  transition:
    border-color var(--sailor-duration-fast) var(--sailor-ease-standard),
    color var(--sailor-duration-fast) var(--sailor-ease-standard),
    background-color var(--sailor-duration-fast) var(--sailor-ease-standard);
}

.app-topbar__search:hover {
  color: var(--sailor-topbar-search-hover-text);
  border-color: var(--sailor-topbar-search-border);
  background: var(--sailor-topbar-search-hover-bg);
}

.app-topbar__search span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: var(--sailor-text-sm);
}

.app-topbar__search kbd {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid var(--sailor-topbar-search-border);
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-topbar-search-text);
  background: var(--sailor-topbar-kbd-bg);
  font-family: var(--sailor-font-mono);
  font-size: 10px;
}

@media (max-width: 640px) {
  .app-topbar {
    padding: 0 var(--sailor-space-3);
  }

  .app-topbar__logo {
    left: var(--sailor-space-3);
  }

  .app-topbar__search kbd {
    display: none;
  }
}
</style>

<template>
  <AppDropdownMenu title="Plugins" position="bottom-start" max-height="360px">
    <template #trigger>
      <button type="button" class="plugin-creator-plugin-dropdown__trigger" aria-label="Plugin selector">
        <FolderOpen :size="15" />
        <span class="plugin-creator-plugin-dropdown__text">
          <strong>{{ activePluginTitle }}</strong>
          <small>{{ activePluginHandle }}</small>
        </span>
        <ChevronDown :size="14" />
      </button>
    </template>

    <AppDropdownItem
      v-for="blueprint in blueprints"
      :key="blueprint.id"
      :label="blueprint.metadata.name"
      :hint="blueprint.metadata.handle"
      :icon="blueprint.id === activeBlueprint?.id ? 'Check' : 'FolderOpen'"
      :disabled="blueprint.id === activeBlueprint?.id"
      @click="emit('openPlugin', blueprint.id)"
    />
    <AppDropdownItem v-if="blueprints.length === 0" label="No saved plugins" icon="FolderOpen" disabled />
  </AppDropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown, FolderOpen } from 'lucide-vue-next'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

const props = withDefaults(
  defineProps<{
    activeBlueprint?: PluginBlueprint | null
    blueprints?: PluginBlueprint[]
  }>(),
  {
    activeBlueprint: null,
    blueprints: () => [],
  },
)

const emit = defineEmits<{
  openPlugin: [blueprintId: string]
}>()

const activePluginTitle = computed(() => props.activeBlueprint?.metadata.name ?? 'No plugin')
const activePluginHandle = computed(() =>
  props.activeBlueprint ? props.activeBlueprint.metadata.handle : 'Create or open one',
)
</script>

<style scoped>
.plugin-creator-plugin-dropdown__trigger {
  min-width: 190px;
  max-width: min(280px, calc(100vw - 112px));
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--sailor-border);
  border-radius: 6px;
  background: var(--sailor-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
}

.plugin-creator-plugin-dropdown__text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}

.plugin-creator-plugin-dropdown__text strong,
.plugin-creator-plugin-dropdown__text small {
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-creator-plugin-dropdown__text strong {
  font-size: 12px;
  font-weight: 750;
}

.plugin-creator-plugin-dropdown__text small {
  margin-top: 2px;
  color: var(--sailor-text-secondary);
  font-size: 10px;
  font-weight: 650;
}
</style>

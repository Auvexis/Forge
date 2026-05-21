<template>
  <AppDropdownMenu title="Releases" position="bottom-start" max-height="380px">
    <template #trigger>
      <button type="button" class="plugin-creator-release-dropdown__trigger" aria-label="Release selector">
        <History :size="15" />
        <span class="plugin-creator-release-dropdown__text">
          <strong>Releases</strong>
          <small>{{ releaseSummary }}</small>
        </span>
        <ChevronDown :size="14" />
      </button>
    </template>

    <AppDropdownItem
      label="Version History"
      icon="History"
      :disabled="!activeBlueprint"
      @click="emit('openReleaseHistory')"
    />
    <AppDropdownDivider />
    <AppDropdownItem
      v-for="release in releases"
      :key="release.id"
      :label="`Release ${release.version}`"
      :hint="formatDate(release.createdAt)"
      icon="Rocket"
      disabled
    />
    <AppDropdownItem v-if="releases.length === 0" label="No releases yet" icon="Rocket" disabled />
    <AppDropdownDivider />
    <AppDropdownItem
      v-for="snapshot in snapshots"
      :key="snapshot.id"
      :label="`Rollback to ${snapshot.version}`"
      :hint="`${snapshot.reason} · ${formatDate(snapshot.createdAt)}`"
      icon="RotateCcw"
      :disabled="!activeBlueprint"
      @click="emit('rollback', snapshot.id)"
    />
    <AppDropdownItem v-if="snapshots.length === 0" label="No snapshots yet" icon="RotateCcw" disabled />
  </AppDropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown, History } from 'lucide-vue-next'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import type {
  PluginBlueprint,
  PluginCreatorVersionsResult,
} from '@/core/types/plugin-creator.types'

const props = withDefaults(
  defineProps<{
    activeBlueprint?: PluginBlueprint | null
    versions?: PluginCreatorVersionsResult | null
  }>(),
  {
    activeBlueprint: null,
    versions: null,
  },
)

const emit = defineEmits<{
  openReleaseHistory: []
  rollback: [snapshotId: string]
}>()

const releases = computed(() => [...(props.versions?.releases ?? [])].reverse())
const snapshots = computed(() => [...(props.versions?.snapshots ?? [])].reverse())
const releaseSummary = computed(() => {
  if (!props.activeBlueprint) return 'No plugin selected'
  return `${releases.value.length} releases · ${snapshots.value.length} snapshots`
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<style scoped>
.plugin-creator-release-dropdown__trigger {
  min-width: 150px;
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

.plugin-creator-release-dropdown__text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}

.plugin-creator-release-dropdown__text strong,
.plugin-creator-release-dropdown__text small {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-creator-release-dropdown__text strong {
  font-size: 12px;
  font-weight: 750;
}

.plugin-creator-release-dropdown__text small {
  margin-top: 2px;
  color: var(--sailor-text-secondary);
  font-size: 10px;
  font-weight: 650;
}
</style>

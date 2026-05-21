<template>
  <section class="plugin-creator-version-panel" aria-label="Plugin Creator Version History">
    <header>
      <h2>Version History</h2>
      <button type="button" :disabled="isLoading" @click="emit('load')">
        {{ isLoading ? 'Loading' : 'Refresh' }}
      </button>
    </header>

    <div class="plugin-creator-version-panel__group">
      <h3>Snapshots</h3>
      <p v-if="snapshotCount === 0">No snapshots yet.</p>
      <article v-for="snapshot in versions?.snapshots ?? []" :key="snapshot.id">
        <div>
          <strong>{{ snapshot.version }}</strong>
          <span>{{ snapshot.reason }} · {{ formatDate(snapshot.createdAt) }}</span>
        </div>
        <button type="button" @click="emit('rollback', snapshot.id)">Rollback</button>
      </article>
    </div>

    <div class="plugin-creator-version-panel__group">
      <h3>Releases</h3>
      <p v-if="releaseCount === 0">No releases yet.</p>
      <article v-for="release in versions?.releases ?? []" :key="release.id">
        <div>
          <strong>{{ release.version }}</strong>
          <span>{{ formatDate(release.createdAt) }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PluginCreatorVersionsResult } from '../../../core/types/plugin-creator.types.ts'

const props = withDefaults(
  defineProps<{
    versions?: PluginCreatorVersionsResult | null
    isLoading?: boolean
  }>(),
  {
    versions: null,
    isLoading: false,
  },
)

const emit = defineEmits<{
  load: []
  rollback: [snapshotId: string]
}>()

const snapshotCount = computed(() => props.versions?.snapshots.length ?? 0)
const releaseCount = computed(() => props.versions?.releases.length ?? 0)

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}
</script>

<style scoped>
.plugin-creator-version-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--sailor-border-subtle);
  background: var(--sailor-bg-base);
}

.plugin-creator-version-panel header,
.plugin-creator-version-panel article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plugin-creator-version-panel h2,
.plugin-creator-version-panel h3,
.plugin-creator-version-panel p {
  margin: 0;
}

.plugin-creator-version-panel h2 {
  color: var(--sailor-text-primary);
  font-size: 13px;
}

.plugin-creator-version-panel h3 {
  color: var(--sailor-text-secondary);
  font-size: 12px;
}

.plugin-creator-version-panel__group {
  display: grid;
  gap: 8px;
}

.plugin-creator-version-panel article {
  padding: 8px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
}

.plugin-creator-version-panel strong,
.plugin-creator-version-panel span {
  display: block;
}

.plugin-creator-version-panel strong {
  color: var(--sailor-text-primary);
  font-size: 13px;
}

.plugin-creator-version-panel span,
.plugin-creator-version-panel p {
  color: var(--sailor-text-secondary);
  font-size: 12px;
}

.plugin-creator-version-panel button {
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.plugin-creator-version-panel button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

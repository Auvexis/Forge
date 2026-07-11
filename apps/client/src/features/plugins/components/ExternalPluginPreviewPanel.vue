<template>
  <aside class="preview-panel">
    <header class="preview-panel__header">
      <h2>Preview</h2>
      <span v-if="preview" class="preview-panel__status" :class="`is-${preview.status}`">
        {{ preview.status }}
      </span>
    </header>

    <div v-if="preview?.manifest" class="preview-panel__content">
      <div class="preview-plugin">
        <div class="preview-plugin__icon">{{ preview.manifest.metadata.icon || 'P' }}</div>
        <div>
          <h3>{{ preview.manifest.metadata.name }}</h3>
          <p>{{ preview.manifest.metadata.description }}</p>
        </div>
      </div>

      <dl class="preview-meta">
        <div>
          <dt>ID</dt>
          <dd>{{ preview.manifest.metadata.id }}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{{ preview.manifest.metadata.version }}</dd>
        </div>
        <div>
          <dt>Author</dt>
          <dd>{{ preview.manifest.metadata.author }}</dd>
        </div>
        <div>
          <dt>Auth</dt>
          <dd>{{ preview.authType || 'runtime' }}</dd>
        </div>
      </dl>

      <section class="preview-section">
        <h4>Methods</h4>
        <ul>
          <li v-for="method in preview.methodNames" :key="method">{{ method }}</li>
        </ul>
      </section>

      <section class="preview-section">
        <h4>Triggers</h4>
        <ul v-if="preview.triggerNames.length">
          <li v-for="trigger in preview.triggerNames" :key="trigger">{{ trigger }}</li>
        </ul>
        <span v-else>Nenhum trigger</span>
      </section>

      <section v-if="preview.warnings.length" class="preview-section is-warning">
        <h4>Warnings</h4>
        <ul>
          <li v-for="warning in preview.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </section>

      <section v-if="preview.errors.length" class="preview-section is-error">
        <h4>Errors</h4>
        <ul>
          <li v-for="error in preview.errors" :key="error">{{ error }}</li>
        </ul>
      </section>
    </div>

    <div v-else class="preview-panel__empty">Sem preview</div>
  </aside>
</template>

<script setup lang="ts">
import type { ExternalPluginPreview } from '@/core/types/plugin.types'

defineProps<{
  preview: ExternalPluginPreview | null
}>()
</script>

<style scoped>
.preview-panel {
  min-width: 320px;
  border-left: 1px solid var(--fabric-border);
  background: var(--fabric-bg-surface);
}

.preview-panel__header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--fabric-space-4);
  border-bottom: 1px solid var(--fabric-border);
}

.preview-panel__header h2,
.preview-plugin h3,
.preview-section h4 {
  margin: 0;
}

.preview-panel__header h2 {
  font-size: var(--fabric-text-base);
}

.preview-panel__status {
  font-size: var(--fabric-text-xs);
  color: var(--fabric-text-success);
}

.preview-panel__content {
  display: grid;
  gap: var(--fabric-space-4);
  padding: var(--fabric-space-4);
}

.preview-plugin {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: var(--fabric-space-3);
}

.preview-plugin__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-elevated);
}

.preview-plugin h3 {
  font-size: var(--fabric-text-lg);
  font-weight: var(--fabric-font-semibold);
}

.preview-plugin p,
.preview-section span,
.preview-panel__empty {
  margin: 4px 0 0;
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-sm);
  line-height: var(--fabric-leading-normal);
}

.preview-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--fabric-space-3);
  margin: 0;
}

.preview-meta div {
  min-width: 0;
}

.preview-meta dt {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.preview-meta dd {
  margin: 3px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fabric-text-sm);
}

.preview-section {
  display: grid;
  gap: var(--fabric-space-2);
}

.preview-section h4 {
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-medium);
}

.preview-section ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.preview-section li {
  padding: 7px var(--fabric-space-2);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-base);
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
}

.is-warning li {
  color: var(--fabric-text-warning);
}

.is-error li {
  color: var(--fabric-text-error);
}

.preview-panel__empty {
  padding: var(--fabric-space-4);
}
</style>

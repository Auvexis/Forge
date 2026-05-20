<template>
  <header class="plugin-creator-header">
    <div class="plugin-creator-header__left">
      <PluginCreatorCommandMenu />
      <div>
        <p class="plugin-creator-header__label">Plugin Creator</p>
        <h1>{{ title }}</h1>
      </div>
    </div>

    <div class="plugin-creator-header__actions">
      <button type="button" class="plugin-creator-header__button" @click="emit('run')">
        <Play :size="15" />
        Run
      </button>
      <button type="button" class="plugin-creator-header__button" @click="emit('save')">
        <Save :size="15" />
        Save
      </button>
      <button
        type="button"
        class="plugin-creator-header__button plugin-creator-header__button--primary"
        @click="emit('publish')"
      >
        <Rocket :size="15" />
        Publish
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Play, Rocket, Save } from 'lucide-vue-next'
import PluginCreatorCommandMenu from './PluginCreatorCommandMenu.vue'

withDefaults(
  defineProps<{
    title?: string
  }>(),
  {
    title: 'Low-code plugin workspace',
  },
)

const emit = defineEmits<{
  run: []
  save: []
  publish: []
}>()
</script>

<style scoped>
.plugin-creator-header {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--sailor-border);
  background: var(--sailor-surface);
}

.plugin-creator-header__left,
.plugin-creator-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.plugin-creator-header__label {
  margin: 0 0 4px;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--sailor-text-secondary);
}

.plugin-creator-header h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--sailor-text-primary);
}

.plugin-creator-header__button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid var(--sailor-border);
  border-radius: 6px;
  background: var(--sailor-surface);
  color: var(--sailor-text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.plugin-creator-header__button--primary {
  border-color: #246bfe;
  background: #246bfe;
  color: #ffffff;
}

@media (max-width: 760px) {
  .plugin-creator-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .plugin-creator-header__actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>

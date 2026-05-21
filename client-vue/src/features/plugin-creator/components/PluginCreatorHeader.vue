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
      <button
        type="button"
        class="plugin-creator-header__icon-button"
        title="Settings"
        aria-label="Settings"
        @click="emit('settings')"
      >
        <Settings :size="15" />
      </button>
      <button
        type="button"
        class="plugin-creator-header__icon-button"
        title="History"
        aria-label="History"
        @click="emit('versions')"
      >
        <History :size="15" />
      </button>
      <button type="button" class="plugin-creator-header__button" @click="emit('run')">
        <Play :size="15" />
        Run
      </button>
      <button
        type="button"
        class="plugin-creator-header__button plugin-creator-header__button--save"
        :disabled="isSaving || !isDirty"
        @click="emit('save')"
      >
        <span
          class="plugin-creator-save-dot"
          :class="{
            'plugin-creator-save-dot--dirty': isDirty,
            'plugin-creator-save-dot--saving': isSaving,
          }"
        />
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
import { History, Play, Rocket, Settings } from 'lucide-vue-next'
import PluginCreatorCommandMenu from './PluginCreatorCommandMenu.vue'

withDefaults(
  defineProps<{
    title?: string
    isDirty?: boolean
    isSaving?: boolean
  }>(),
  {
    title: 'Low-code plugin workspace',
    isDirty: false,
    isSaving: false,
  },
)

const emit = defineEmits<{
  settings: []
  versions: []
  run: []
  save: []
  publish: []
}>()
</script>

<style scoped>
.plugin-creator-header {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--sailor-border-subtle);
  background: var(--sailor-bg-base);
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
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: transparent;
  color: var(--sailor-text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.plugin-creator-header__icon-button {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
}

.plugin-creator-header__icon-button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.plugin-creator-header__button--primary {
  border-color: rgba(0, 214, 143, 0.35);
  background: rgba(0, 214, 143, 0.16);
  color: var(--sailor-accent);
}

.plugin-creator-header__button:hover {
  background: var(--sailor-bg-elevated);
}

.plugin-creator-header__button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.plugin-creator-header__button--save {
  position: relative;
}

.plugin-creator-save-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 1px solid var(--sailor-border-subtle);
  background: transparent;
}

.plugin-creator-save-dot--dirty {
  border-color: rgba(245, 158, 11, 0.6);
  background: var(--sailor-amber-500, #f59e0b);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16);
}

.plugin-creator-save-dot--saving {
  border-color: rgba(0, 214, 143, 0.56);
  background: var(--sailor-accent);
  animation: plugin-creator-save-pulse 1s ease-in-out infinite;
}

@keyframes plugin-creator-save-pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

.plugin-creator-header__button--primary:hover {
  background: rgba(0, 214, 143, 0.22);
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

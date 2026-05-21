<template>
  <section class="plugin-creator-plugin-settings">
    <h3>Plugin metadata</h3>
    <div class="plugin-creator-plugin-settings__grid">
      <BaseInput
        :model-value="blueprint?.metadata.name ?? ''"
        label="Plugin name"
        placeholder="My API"
        @update:model-value="updateMetadata('name', String($event))"
      />
      <BaseInput
        :model-value="blueprint?.metadata.handle ?? ''"
        label="Plugin handle"
        placeholder="my-api"
        @update:model-value="updateMetadata('handle', String($event))"
      />
      <BaseInput
        :model-value="blueprint?.metadata.version ?? ''"
        label="Plugin version"
        placeholder="0.1.0"
        @update:model-value="updateMetadata('version', String($event))"
      />
      <BaseSelect
        :model-value="blueprint?.metadata.category ?? 'Custom'"
        :options="categoryOptions"
        label="Category"
        @update:model-value="updateMetadata('category', String($event))"
      />
      <BaseInput
        :model-value="blueprint?.metadata.author ?? ''"
        label="Author"
        placeholder="Sailor"
        @update:model-value="updateMetadata('author', String($event))"
      />
      <BaseInput
        :model-value="blueprint?.metadata.repository ?? ''"
        label="Repository"
        placeholder="https://github.com/acme/plugin"
        @update:model-value="updateMetadata('repository', String($event))"
      />
      <BaseInput
        :model-value="blueprint?.metadata.homepage ?? ''"
        label="Homepage"
        placeholder="https://acme.dev"
        @update:model-value="updateMetadata('homepage', String($event))"
      />
      <BaseInput
        :model-value="blueprint?.metadata.docsUrl ?? ''"
        label="Docs URL"
        placeholder="https://docs.acme.dev/plugin"
        @update:model-value="updateMetadata('docsUrl', String($event))"
      />
      <BaseInput
        :model-value="tagsValue"
        label="Tags"
        placeholder="crm, sales"
        @update:model-value="updateTags(String($event))"
      />
    </div>

    <div class="plugin-creator-plugin-settings__grid">
      <div class="plugin-creator-icon-field">
        <BaseInput
          :model-value="blueprint?.icons.icon ?? ''"
          type="url"
          label="Icon"
          placeholder="https://example.com/icon.svg"
          @update:model-value="updateIcons('icon', String($event))"
        />
        <span class="plugin-creator-icon-preview">
          <img v-if="blueprint?.icons.icon" :src="blueprint.icons.icon" alt="" />
        </span>
      </div>
      <div class="plugin-creator-icon-field">
        <BaseInput
          :model-value="blueprint?.icons.iconDark ?? ''"
          type="url"
          label="Dark icon"
          placeholder="https://example.com/icon-dark.svg"
          @update:model-value="updateIcons('iconDark', String($event))"
        />
        <span class="plugin-creator-icon-preview">
          <img v-if="blueprint?.icons.iconDark" :src="blueprint.icons.iconDark" alt="" />
        </span>
      </div>
      <div class="plugin-creator-icon-field">
        <BaseInput
          :model-value="blueprint?.icons.iconLight ?? ''"
          type="url"
          label="Light icon"
          placeholder="https://example.com/icon-light.svg"
          @update:model-value="updateIcons('iconLight', String($event))"
        />
        <span class="plugin-creator-icon-preview">
          <img v-if="blueprint?.icons.iconLight" :src="blueprint.icons.iconLight" alt="" />
        </span>
      </div>
    </div>

    <BaseTextarea
      :model-value="blueprint?.metadata.description ?? ''"
      label="Description"
      :rows="5"
      @update:model-value="updateMetadata('description', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import type {
  PluginBlueprint,
  PluginBlueprintIcons,
  PluginBlueprintMetadata,
} from '@/core/types/plugin-creator.types'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
}>()

const emit = defineEmits<{
  updateMetadata: [payload: Partial<PluginBlueprintMetadata>]
  updateIcons: [payload: Partial<PluginBlueprintIcons>]
}>()

const categoryOptions = [
  'Custom',
  'AI',
  'Communication',
  'Database',
  'Development',
  'Google',
  'Productivity',
  'Utilities',
].map((category) => ({ label: category, value: category }))
const tagsValue = computed(() => props.blueprint?.metadata.tags?.join(', ') ?? '')

function updateMetadata(field: keyof PluginBlueprintMetadata, value: string) {
  emit('updateMetadata', { [field]: value.trim() || undefined })
}

function updateIcons(field: keyof PluginBlueprintIcons, value: string) {
  emit('updateIcons', { [field]: value.trim() || undefined })
}

function updateTags(value: string) {
  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  emit('updateMetadata', { tags: tags.length ? tags : undefined })
}
</script>

<style scoped>
.plugin-creator-plugin-settings {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.plugin-creator-plugin-settings h3 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: 14px;
}

.plugin-creator-plugin-settings__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.plugin-creator-icon-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: end;
  gap: 8px;
}

.plugin-creator-icon-preview {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
}

.plugin-creator-icon-preview img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
</style>

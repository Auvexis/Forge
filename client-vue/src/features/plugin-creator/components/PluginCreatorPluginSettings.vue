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

    <div class="plugin-creator-plugin-settings__icon-grid">
      <div v-for="field in iconFields" :key="field.slot" class="plugin-creator-icon-field">
        <span class="plugin-creator-icon-preview">
          <img v-if="iconPreview(field.slot)" :src="iconPreview(field.slot)" alt="" />
        </span>
        <div class="plugin-creator-icon-field__body">
          <label>
            {{ field.label }}
            <input type="file" accept=".svg,.png,.webp,.jpg,.jpeg,image/*" @change="uploadIcon(field.slot, $event)" />
          </label>
          <BaseInput
            :model-value="blueprint?.icons[field.slot] ?? ''"
            type="text"
            :label="`${field.label} URL`"
            placeholder="https://example.com/icon.svg"
            @update:model-value="updateIcons(field.slot, String($event))"
          />
          <BaseButton type="button" variant="ghost" size="sm" @click="removeIcon(field.slot)">Remove</BaseButton>
        </div>
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
import { computed, reactive } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import type {
  PluginBlueprint,
  PluginBlueprintIconSlot,
  PluginBlueprintIcons,
  PluginBlueprintMetadata,
} from '@/core/types/plugin-creator.types'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
}>()

const emit = defineEmits<{
  updateMetadata: [payload: Partial<PluginBlueprintMetadata>]
  updateIcons: [payload: Partial<PluginBlueprintIcons>]
  uploadIcon: [slot: PluginBlueprintIconSlot, file: File]
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
const localPreviews = reactive<Partial<Record<PluginBlueprintIconSlot, string>>>({})
const iconFields: Array<{ slot: PluginBlueprintIconSlot; label: string }> = [
  { slot: 'icon', label: 'Icon' },
  { slot: 'iconDark', label: 'Dark icon' },
  { slot: 'iconLight', label: 'Light icon' },
]

function updateMetadata(field: keyof PluginBlueprintMetadata, value: string) {
  emit('updateMetadata', { [field]: value.trim() || undefined })
}

function updateIcons(field: keyof PluginBlueprintIcons, value: string) {
  emit('updateIcons', { [field]: value.trim() || undefined })
}

function uploadIcon(slot: PluginBlueprintIconSlot, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (localPreviews[slot]) URL.revokeObjectURL(localPreviews[slot])
  localPreviews[slot] = URL.createObjectURL(file)
  emit('uploadIcon', slot, file)
  input.value = ''
}

function removeIcon(slot: PluginBlueprintIconSlot) {
  if (localPreviews[slot]) URL.revokeObjectURL(localPreviews[slot])
  delete localPreviews[slot]
  emit('updateIcons', { [slot]: undefined })
}

function iconPreview(slot: PluginBlueprintIconSlot) {
  return localPreviews[slot] ?? props.blueprint?.icons[slot] ?? ''
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

.plugin-creator-plugin-settings__icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.plugin-creator-icon-field {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
}

.plugin-creator-icon-field__body {
  display: grid;
  gap: 8px;
}

.plugin-creator-icon-field__body label {
  display: grid;
  gap: 6px;
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 650;
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

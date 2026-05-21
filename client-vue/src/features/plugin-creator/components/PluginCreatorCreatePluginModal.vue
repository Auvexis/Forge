<template>
  <BaseModal :is-open="isOpen" max-width="560px" height="auto" @close="emit('close')">
    <form class="plugin-creator-create-modal" @submit.prevent="submit">
      <header class="plugin-creator-create-modal__header">
        <div>
          <p>Plugin Creator</p>
          <h2>New plugin</h2>
        </div>
        <button type="button" aria-label="Close modal" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div class="plugin-creator-create-modal__body">
        <div class="plugin-creator-create-modal__grid">
          <BaseInput
            v-model="form.name"
            label="Name"
            placeholder="My API"
            required
            @update:model-value="syncHandleFromName(String($event))"
          />
          <BaseInput
            v-model="form.handle"
            label="Handle"
            placeholder="my-api"
            required
            :error="handleError"
            @update:model-value="handleTouched = true"
          />
        </div>

        <BaseTextarea
          v-model="form.description"
          label="Description"
          placeholder="Low-code API plugin"
          :rows="3"
        />

        <div class="plugin-creator-create-modal__grid">
          <div class="plugin-creator-icon-field">
            <BaseInput v-model="form.icon" type="url" label="Icon" placeholder="https://example.com/icon.svg" />
            <span class="plugin-creator-icon-preview">
              <img v-if="form.icon" :src="form.icon" alt="" />
            </span>
          </div>
          <div class="plugin-creator-icon-field">
            <BaseInput
              v-model="form.iconDark"
              type="url"
              label="Dark icon"
              placeholder="https://example.com/icon-dark.svg"
            />
            <span class="plugin-creator-icon-preview">
              <img v-if="form.iconDark" :src="form.iconDark" alt="" />
            </span>
          </div>
          <div class="plugin-creator-icon-field">
            <BaseInput
              v-model="form.iconLight"
              type="url"
              label="Light icon"
              placeholder="https://example.com/icon-light.svg"
            />
            <span class="plugin-creator-icon-preview">
              <img v-if="form.iconLight" :src="form.iconLight" alt="" />
            </span>
          </div>
        </div>
      </div>

      <footer class="plugin-creator-create-modal__footer">
        <BaseButton type="button" variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton type="submit" variant="primary" :disabled="!canSubmit">Create plugin</BaseButton>
      </footer>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import type { CreatePluginBlueprintPayload } from '@/core/types/plugin-creator.types'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    existingHandles?: string[]
  }>(),
  {
    existingHandles: () => [],
  },
)

const emit = defineEmits<{
  close: []
  create: [payload: CreatePluginBlueprintPayload]
}>()

const form = reactive({
  name: '',
  handle: '',
  description: '',
  icon: '',
  iconDark: '',
  iconLight: '',
})
const handleTouched = ref(false)

const normalizedHandle = computed(() => slugifyPluginHandle(form.handle))
const handleError = computed(() => {
  if (!form.handle.trim()) return ''
  if (form.handle !== normalizedHandle.value) return 'Use lowercase letters, numbers and hyphens'
  if (props.existingHandles.includes(form.handle)) return 'Handle already exists'
  return ''
})
const canSubmit = computed(
  () => form.name.trim().length > 0 && form.handle.trim().length > 0 && !handleError.value,
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return
    Object.assign(form, {
      name: '',
      handle: '',
      description: 'Low-code API plugin',
      icon: '',
      iconDark: '',
      iconLight: '',
    })
    handleTouched.value = false
  },
)

function syncHandleFromName(value: string) {
  if (handleTouched.value) return
  form.handle = uniquePluginHandle(value)
}

function submit() {
  if (!canSubmit.value) return
  emit('create', {
    handle: form.handle.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    icon: cleanOptional(form.icon),
    iconDark: cleanOptional(form.iconDark),
    iconLight: cleanOptional(form.iconLight),
    includeDefaultMethod: false,
  })
}

function cleanOptional(value: string) {
  return value.trim() || undefined
}

function uniquePluginHandle(name: string) {
  const baseHandle = slugifyPluginHandle(name) || `plugin-${Date.now().toString(36)}`
  if (!props.existingHandles.includes(baseHandle)) return baseHandle

  let index = 2
  while (props.existingHandles.includes(`${baseHandle}-${index}`)) {
    index += 1
  }
  return `${baseHandle}-${index}`
}

function slugifyPluginHandle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
</script>

<style scoped>
.plugin-creator-create-modal {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.plugin-creator-create-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--sailor-border-subtle);
}

.plugin-creator-create-modal__header p,
.plugin-creator-create-modal__header h2 {
  margin: 0;
}

.plugin-creator-create-modal__header p {
  color: var(--sailor-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.plugin-creator-create-modal__header h2 {
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.2;
}

.plugin-creator-create-modal__header button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
}

.plugin-creator-create-modal__header button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.plugin-creator-create-modal__body {
  display: grid;
  gap: 14px;
  padding: 16px 18px;
}

.plugin-creator-create-modal__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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

.plugin-creator-create-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--sailor-border-subtle);
}
</style>

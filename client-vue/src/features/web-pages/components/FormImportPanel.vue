<template>
  <div class="web-page-inspector">
    <BaseInput
      v-model="reference"
      label="Form link or id"
      placeholder="/forms/contact"
      @keyup.enter="loadForm"
    />
    <BaseButton variant="secondary" icon-left="search" :loading="isLoading" @click="loadForm">
      Load
    </BaseButton>
    <p v-if="definition" class="web-page-import-preview">
      {{ definition.title }} · {{ definition.fields.length }} fields
    </p>
    <p v-if="error" class="web-page-import-error">{{ error }}</p>
    <BaseButton
      v-if="definition"
      variant="primary"
      icon-left="plus"
      @click="confirmImport"
    >
      Insert form
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { workflowsApi, type FormDefinition } from '@/core/api/workflows.api.ts'
import type { PageBlock } from '../types/page.types.ts'
import { formSchemaToBlocks, parseFormReference } from '../utils/formSchemaToBlocks.ts'

const emit = defineEmits<{ insert: [block: PageBlock] }>()

const reference = ref('')
const definition = ref<FormDefinition | null>(null)
const error = ref('')
const isLoading = ref(false)

async function loadForm() {
  error.value = ''
  definition.value = null
  isLoading.value = true
  try {
    const parsed = parseFormReference(reference.value)
    // Supported references include /forms-test/:formId and /p/:profileId/forms/:formId.
    definition.value = await workflowsApi.getFormDefinition(
      parsed.formId,
      parsed.mode ?? 'prod',
      parsed.profileId,
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load form'
  } finally {
    isLoading.value = false
  }
}

function confirmImport() {
  if (!definition.value) return
  emit('insert', formSchemaToBlocks(definition.value))
}
</script>

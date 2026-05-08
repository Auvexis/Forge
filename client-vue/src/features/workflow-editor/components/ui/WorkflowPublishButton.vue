<template>
  <div class="publish-btn-wrapper">
    <!-- Published state → Unpublish -->
    <BaseButton
      v-if="isPublished"
      id="workflow-unpublish-btn"
      class="publish-btn publish-btn--published"
      size="sm"
      variant="ghost"
      :disabled="disabled || loading"
      :loading="loading"
      @click="handleUnpublish"
      title="Running in production — click to unpublish"
    >
      <template #left>
        <span class="publish-btn__dot" />
      </template>
      <span class="publish-btn__label">{{ loading ? 'Unpublishing…' : 'Published' }}</span>
      <template #right>
        <ChevronDownIcon :size="12" class="publish-btn__chevron" />
      </template>
    </BaseButton>

    <!-- Draft / Unpublished state → Publish -->
    <BaseButton
      v-else
      id="workflow-publish-btn"
      class="publish-btn"
      :class="{
        'publish-btn--draft': isDraft,
        'publish-btn--unpublished': !isDraft,
      }"
      size="sm"
      variant="ghost"
      :disabled="disabled || loading"
      :loading="loading"
      @click="handlePublish"
      :title="isDraft ? 'Publish this draft to production' : 'Re-publish to production'"
    >
      <template #left>
        <RocketIcon :size="13" />
      </template>
      <span class="publish-btn__label">{{ loading ? 'Publishing…' : isDraft ? 'Publish' : 'Re-publish' }}</span>
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RocketIcon, ChevronDownIcon } from 'lucide-vue-next'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'
import type { WorkflowItem } from '@/core/types/workflow.types'

const props = defineProps<{
  workflow: WorkflowItem
  disabled?: boolean
}>()

const emit = defineEmits<{
  updated: [workflow: WorkflowItem]
}>()

const toast = useToast()
const loading = ref(false)

const isDraft = computed(() => props.workflow.metadata.isDraft)
const isPublished = computed(() => props.workflow.metadata.isActive && !props.workflow.metadata.isDraft)

async function handlePublish() {
  loading.value = true
  try {
    const updated = await workflowsApi.publish(props.workflow.metadata.id)
    emit('updated', updated)
    toast.success(`"${updated.metadata.name}" is now live in production`)
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to publish workflow')
  } finally {
    loading.value = false
  }
}

async function handleUnpublish() {
  loading.value = true
  try {
    const updated = await workflowsApi.unpublish(props.workflow.metadata.id)
    emit('updated', updated)
    toast.success(`"${updated.metadata.name}" removed from production`)
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to unpublish workflow')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.publish-btn-wrapper {
  display: flex;
  align-items: center;
}

.publish-btn {
  /* Using base button, overriding colors */
  border: 1px solid transparent;
}

/* Draft state — neutral/accent */
.publish-btn--draft {
  background-color: var(--nod8-button-publish-draft-bg) !important;
  color: var(--nod8-button-publish-draft-text) !important;
}

.publish-btn--draft:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* Unpublished (was published before) — orange */
.publish-btn--unpublished {
  background-color: var(--nod8-button-publish-unpub-bg) !important;
  color: var(--nod8-button-publish-unpub-text) !important;
  border-color: var(--nod8-button-publish-unpub-border) !important;
}

.publish-btn--unpublished:hover:not(:disabled) {
  background-color: var(--nod8-button-publish-unpub-hover-bg) !important;
}

/* Published state — green pill with live dot */
.publish-btn--published {
  background-color: var(--nod8-button-publish-live-bg) !important;
  color: var(--nod8-button-publish-live-text) !important;
  border-color: var(--nod8-button-publish-live-border) !important;
}

.publish-btn--published:hover:not(:disabled) {
  background-color: var(--nod8-button-publish-live-hover-bg) !important;
  color: var(--nod8-button-publish-live-hover-text) !important;
  border-color: var(--nod8-button-publish-live-hover-border) !important;
}

.publish-btn--published:hover:not(:disabled) .publish-btn__dot {
  background: var(--nod8-button-publish-live-hover-text);
}

/* Live dot */
.publish-btn__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--nod8-green-400);
  animation: pulse-dot 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.75); }
}

.publish-btn__chevron {
  opacity: 0.6;
  margin-left: 2px;
}

.publish-btn__label {
  line-height: 1;
}
</style>

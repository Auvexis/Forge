<template>
  <div class="publish-btn-wrapper">
    <!-- Published state → Unpublish -->
    <button
      v-if="isPublished"
      id="workflow-unpublish-btn"
      class="publish-btn publish-btn--published"
      :class="{ 'publish-btn--loading': loading }"
      :disabled="loading"
      @click="handleUnpublish"
      title="Running in production — click to unpublish"
    >
      <span class="publish-btn__dot" />
      <span class="publish-btn__label">{{ loading ? 'Unpublishing…' : 'Published' }}</span>
      <ChevronDownIcon :size="12" class="publish-btn__chevron" />
    </button>

    <!-- Draft / Unpublished state → Publish -->
    <button
      v-else
      id="workflow-publish-btn"
      class="publish-btn"
      :class="{
        'publish-btn--draft': isDraft,
        'publish-btn--unpublished': !isDraft,
        'publish-btn--loading': loading,
      }"
      :disabled="loading"
      @click="handlePublish"
      :title="isDraft ? 'Publish this draft to production' : 'Re-publish to production'"
    >
      <RocketIcon :size="13" />
      <span class="publish-btn__label">{{ loading ? 'Publishing…' : isDraft ? 'Publish' : 'Re-publish' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RocketIcon, ChevronDownIcon } from 'lucide-vue-next'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'
import type { WorkflowItem } from '@/core/types/workflow.types'

const props = defineProps<{
  workflow: WorkflowItem
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
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--nod8-radius-md);
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  cursor: pointer;
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  white-space: nowrap;
}

/* Draft state — neutral/accent */
.publish-btn--draft {
  background: var(--nod8-accent);
  color: #fff;
}

.publish-btn--draft:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* Unpublished (was published before) — orange */
.publish-btn--unpublished {
  background: color-mix(in srgb, #f97316 15%, transparent);
  color: #f97316;
  border: 1px solid color-mix(in srgb, #f97316 30%, transparent);
}

.publish-btn--unpublished:hover:not(:disabled) {
  background: color-mix(in srgb, #f97316 25%, transparent);
}

/* Published state — green pill with live dot */
.publish-btn--published {
  background: color-mix(in srgb, var(--nod8-green-400) 15%, transparent);
  color: var(--nod8-green-400);
  border: 1px solid color-mix(in srgb, var(--nod8-green-400) 30%, transparent);
  padding-right: 8px;
}

.publish-btn--published:hover:not(:disabled) {
  background: color-mix(in srgb, #ef4444 15%, transparent);
  color: #ef4444;
  border-color: color-mix(in srgb, #ef4444 30%, transparent);
}

.publish-btn--published:hover:not(:disabled) .publish-btn__dot {
  background: #ef4444;
}

/* Loading state */
.publish-btn--loading {
  opacity: 0.6;
  cursor: not-allowed;
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

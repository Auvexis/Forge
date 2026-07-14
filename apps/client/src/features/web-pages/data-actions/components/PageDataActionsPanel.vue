<template>
  <section class="web-page-data-actions">
    <header class="web-page-data-actions__header">
      <div>
        <strong>Data / Actions</strong>
        <span>{{ actionCountLabel }}</span>
      </div>
      <BaseButton
        variant="ghost"
        size="icon"
        icon-left="refresh-cw"
        title="Refresh actions"
        :loading="store.isLoading"
        @click="store.loadAvailableActions()"
      />
    </header>

    <p v-if="store.error" class="web-page-data-actions__error">{{ store.error }}</p>

    <div v-if="!store.hasActions && !store.isLoading" class="web-page-data-actions__empty">
      Publish a workflow with manual, form, or webhook triggers to use it as a Page Action.
    </div>

    <div v-else class="web-page-data-actions__body">
      <section class="web-page-data-actions__list" aria-label="Available workflow actions">
        <article
          v-for="workflow in store.workflows"
          :key="workflow.id"
          class="web-page-data-actions__workflow"
        >
          <h4>{{ workflow.name }}</h4>
          <button
            v-for="action in workflow.actions"
            :key="action.id"
            type="button"
            class="web-page-data-actions__action"
            :class="{ 'web-page-data-actions__action--active': action.id === store.selectedAction?.triggerId }"
            @click="store.selectTrigger(action)"
          >
            <LucideIcon :name="action.icon || 'workflow'" :size="14" />
            <span>{{ action.name }}</span>
            <small>{{ action.type }}</small>
          </button>
        </article>
      </section>

      <section v-if="store.selectedAction" class="web-page-data-actions__details">
        <header>
          <strong>{{ store.selectedAction.name }}</strong>
          <span>{{ store.selectedAction.workflowName }}</span>
        </header>

        <div class="web-page-data-actions__fields">
          <h5>Inputs</h5>
          <div v-if="store.selectedAction.inputs.length === 0" class="web-page-data-actions__hint">
            This trigger has no declared inputs.
          </div>
          <label
            v-for="field in store.selectedAction.inputs"
            :key="field.key"
            class="web-page-data-actions__field"
          >
            <span>
              {{ field.label }}
              <small v-if="field.required">required</small>
            </span>
            <input
              :value="String(store.draftInput[field.key] ?? '')"
              :type="field.type === 'number' ? 'number' : 'text'"
              @input="store.updateInput(field.key, readInputValue($event, field.type))"
            />
          </label>
        </div>

        <BaseButton
          variant="primary"
          size="sm"
          icon-left="play"
          :loading="store.status === 'running'"
          @click="store.runSelectedAction()"
        >
          Test Run
        </BaseButton>

        <pre v-if="store.lastRunResult" class="web-page-data-actions__result">{{ formattedResult }}</pre>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { usePageActionsStore } from '../stores/page-actions.store'
import type { PageActionInputField } from '@/core/page-actions'

const store = usePageActionsStore()

const actionCountLabel = computed(() => {
  const count = store.workflows.reduce((total, workflow) => total + workflow.actions.length, 0)
  return count === 1 ? '1 action' : `${count} actions`
})

const formattedResult = computed(() => JSON.stringify(store.lastRunResult, null, 2))

function readInputValue(event: Event, type: PageActionInputField['type']) {
  const value = (event.target as HTMLInputElement).value
  if (type === 'number') return Number(value)
  if (type === 'boolean') return value === 'true'
  return value
}

onMounted(() => {
  if (store.workflows.length === 0) void store.loadAvailableActions()
})
</script>

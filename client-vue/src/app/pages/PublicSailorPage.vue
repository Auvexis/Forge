<template>
  <main class="public-sailor-page">
    <div v-if="error" class="public-sailor-page__error">{{ error }}</div>
    <div ref="htmlRoot" v-else v-html="html"></div>
    <div v-if="runtimeError" class="public-sailor-page__error">{{ runtimeError }}</div>
    <div v-if="executionId" class="public-sailor-page__status">
      Accepted: {{ executionId }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { API_BASE_URL } from '@/core/constants/app'
import { ENDPOINTS } from '@/core/api/endpoints.ts'
import { pagesApi } from '@/core/api/pages.api.ts'

const route = useRoute()
const html = ref('')
const error = ref('')
const runtimeError = ref('')
const executionId = ref('')
const pendingActionId = ref<string | null>(null)
const htmlRoot = ref<HTMLElement | null>(null)

onMounted(async () => {
  await loadPublishedHtml()
  await nextTick()
  attachRuntimeActions()
})

onBeforeUnmount(() => {
  htmlRoot.value?.removeEventListener('submit', handleSubmit)
  htmlRoot.value?.removeEventListener('click', handleClick)
})

async function loadPublishedHtml() {
  try {
    const slug = String(route.params.slug ?? '')
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.PUBLISHED_PAGE(slug)}`)
    if (!response.ok) throw new Error('Page not found')
    html.value = await response.text()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load page'
  }
}

function attachRuntimeActions() {
  htmlRoot.value?.addEventListener('submit', handleSubmit)
  htmlRoot.value?.addEventListener('click', handleClick)
}

async function handleSubmit(event: Event) {
  const form = event.target as HTMLFormElement
  const actionId = form.dataset.sailorActionId
  if (!actionId) return
  event.preventDefault()
  const payload = Object.fromEntries(new FormData(form).entries())
  await submitAction(actionId, payload)
}

async function handleClick(event: Event) {
  const target = event.target as HTMLElement
  const actionElement = target.closest('[data-sailor-action-id]') as HTMLElement | null
  if (!actionElement || actionElement.tagName.toLowerCase() === 'form') return
  const actionId = actionElement.dataset.sailorActionId
  if (!actionId) return
  event.preventDefault()
  if (actionElement.dataset.sailorActionType === 'openUrl') {
    window.open(actionElement.getAttribute('href') ?? '#', '_blank', 'noopener')
    return
  }
  await submitAction(actionId, {})
}

async function submitAction(actionId: string, payload: Record<string, unknown>) {
  runtimeError.value = ''
  executionId.value = ''
  pendingActionId.value = actionId
  try {
    const slug = String(route.params.slug ?? '')
    const result = await pagesApi.submitPageAction(slug, actionId, payload)
    executionId.value = result.executionId
  } catch (err) {
    runtimeError.value = err instanceof Error ? err.message : 'Action failed'
  } finally {
    pendingActionId.value = null
  }
}
</script>

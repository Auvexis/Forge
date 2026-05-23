<template>
  <main class="public-sailor-page">
    <div v-if="error" class="public-sailor-page__error">{{ error }}</div>
    <div v-else v-html="html"></div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { API_BASE_URL } from '@/core/constants/app'
import { ENDPOINTS } from '@/core/api/endpoints.ts'

const route = useRoute()
const html = ref('')
const error = ref('')

onMounted(loadPublishedHtml)

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
</script>

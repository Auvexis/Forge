<template>
  <section class="web-pages-list">
    <div class="web-pages-list__header">
      <BaseInput
        v-model="searchQuery"
        label="Search"
        placeholder="Search sites"
        icon-left="search"
      />
      <BaseButton variant="primary" icon-left="plus" @click="isCreateModalOpen = true">
        New site
      </BaseButton>
    </div>

    <div class="web-pages-list__grid">
      <article v-for="page in filteredPages" :key="page.id" class="web-pages-list__card">
        <button type="button" class="web-pages-list__preview" @click="openPage(page.id)">
          <span />
          <span />
          <span />
        </button>

        <div class="web-pages-list__card-body">
          <strong>{{ page.title }}</strong>
          <small>/p/{{ page.slug }}</small>
        </div>

        <div class="web-pages-list__card-actions">
          <BaseButton variant="ghost" size="sm" icon-left="external-link" @click="openPage(page.id)">
            Open
          </BaseButton>
          <BaseButton
            variant="danger"
            size="icon"
            icon-left="trash-2"
            title="Delete"
            @click="deletePage(page.id)"
          />
        </div>
      </article>

      <p v-if="!filteredPages.length && !pagesStore.isLoading" class="web-pages-list__empty">
        No pages found.
      </p>
    </div>

    <PageCreateSiteModal
      :is-open="isCreateModalOpen"
      :loading="pagesStore.isSaving"
      @close="isCreateModalOpen = false"
      @create="createPage"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { usePagesStore } from '../stores/pages.store.ts'
import PageCreateSiteModal from './PageCreateSiteModal.vue'

const router = useRouter()
const pagesStore = usePagesStore()
const searchQuery = ref('')
const isCreateModalOpen = ref(false)

const filteredPages = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return pagesStore.pages
  return pagesStore.pages.filter((page) =>
    `${page.title} ${page.slug}`.toLowerCase().includes(query),
  )
})

onMounted(() => {
  void pagesStore.listPages()
})

async function createPage(title: string) {
  const pageTitle = title.trim() || 'Untitled page'
  const page = await pagesStore.createPage({ title: pageTitle })
  isCreateModalOpen.value = false
  await router.push(`/pages/${page.id}`)
}

async function openPage(pageId: string) {
  await pagesStore.openPage(pageId)
  await router.push(`/pages/${pageId}`)
}

async function deletePage(pageId: string) {
  await pagesStore.deletePage(pageId)
}
</script>

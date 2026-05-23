<template>
  <section class="web-pages-list">
    <AppPanel
      :is-open="true"
      title="Pages"
      position="left"
      width="lg"
      :show-close="false"
    >
      <div class="web-pages-list__toolbar">
        <BaseInput
          v-model="title"
          label="Title"
          placeholder="New page"
          @keyup.enter="createPage"
        />
        <BaseButton
          variant="primary"
          icon-left="plus"
          :loading="pagesStore.isSaving"
          @click="createPage"
        >
          Create
        </BaseButton>
      </div>

      <div class="web-pages-list__items">
        <button
          v-for="page in pagesStore.pages"
          :key="page.id"
          class="web-pages-list__item"
          type="button"
          @click="openPage(page.id)"
        >
          <span class="web-pages-list__item-main">
            <strong>{{ page.title }}</strong>
            <small>/p/{{ page.slug }}</small>
          </span>
          <BaseButton
            variant="danger"
            size="icon"
            icon-left="trash-2"
            title="Delete"
            @click.stop="deletePage(page.id)"
          />
        </button>

        <p v-if="!pagesStore.pages.length && !pagesStore.isLoading" class="web-pages-list__empty">
          No pages yet.
        </p>
      </div>
    </AppPanel>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { usePagesStore } from '../stores/pages.store.ts'

const router = useRouter()
const pagesStore = usePagesStore()
const title = ref('Untitled page')

onMounted(() => {
  void pagesStore.listPages()
})

async function createPage() {
  const pageTitle = title.value.trim() || 'Untitled page'
  const page = await pagesStore.createPage({ title: pageTitle })
  title.value = 'Untitled page'
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

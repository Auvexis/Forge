<template>
  <BaseModal :is-open="isOpen" max-width="520px" height="auto" @close="$emit('close')">
    <form class="web-page-create-modal" @submit.prevent="submit">
      <header class="web-page-create-modal__header">
        <h3>Create site</h3>
        <BaseButton variant="ghost" size="icon" icon-left="x" type="button" @click="$emit('close')" />
      </header>

      <div class="web-page-create-modal__body">
        <BaseInput v-model="title" label="Name" placeholder="Landing page" />
      </div>

      <footer class="web-page-create-modal__footer">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" icon-left="plus" :loading="loading" type="submit">
          Create
        </BaseButton>
      </footer>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'

const props = defineProps<{
  isOpen: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [title: string]
}>()

const title = ref('Untitled page')

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) title.value = 'Untitled page'
  },
)

function submit() {
  emit('create', title.value.trim() || 'Untitled page')
}
</script>

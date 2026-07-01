<template>
  <div class="web-page-toolbar">
    <BaseButton variant="secondary" icon-left="copy" @click="$emit('duplicate')">
      Duplicate
    </BaseButton>
    <BaseButton variant="danger" icon-left="trash-2" @click="$emit('delete')">
      Delete
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'

defineEmits<{
  delete: []
  duplicate: []
}>()
</script>

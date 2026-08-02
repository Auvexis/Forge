<template>
  <BaseDropdownMenu title="Page actions" position="bottom-end">
    <template #trigger>
      <BaseButton variant="outline" icon-left="ellipsis" />
    </template>

    <BaseDropdownItem label="Switch page" icon="files" @click="$emit('switch-page')" />
    <BaseDropdownDivider />
    <BaseDropdownItem label="Rename page" icon="pencil" @click="$emit('rename-page')" />
    <BaseDropdownItem label="Duplicate page" icon="copy" @click="$emit('duplicate-page')" />
    <BaseDropdownDivider />
    <BaseDropdownItem label="Delete page" icon="trash-2" danger @click="$emit('delete-page')" />
  </BaseDropdownMenu>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseDropdownMenu from '@/shared/components/base/dropdown/BaseDropdownMenu.vue'
import BaseDropdownItem from '@/shared/components/base/dropdown/BaseDropdownItem.vue'
import BaseDropdownDivider from '@/shared/components/base/dropdown/BaseDropdownDivider.vue'

defineEmits<{
  'switch-page': []
  'rename-page': []
  'duplicate-page': []
  'delete-page': []
}>()
</script>

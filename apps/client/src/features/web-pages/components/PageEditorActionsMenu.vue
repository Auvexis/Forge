<template>
  <AppDropdownMenu title="Page actions" position="bottom-end">
    <template #trigger>
      <BaseButton variant="outline" icon-left="ellipsis" />
    </template>

    <AppDropdownItem label="Switch page" icon="files" @click="$emit('switch-page')" />
    <AppDropdownDivider />
    <AppDropdownItem label="Rename page" icon="pencil" @click="$emit('rename-page')" />
    <AppDropdownItem label="Duplicate page" icon="copy" @click="$emit('duplicate-page')" />
    <AppDropdownDivider />
    <AppDropdownItem label="Delete page" icon="trash-2" danger @click="$emit('delete-page')" />
  </AppDropdownMenu>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'

defineEmits<{
  'switch-page': []
  'rename-page': []
  'duplicate-page': []
  'delete-page': []
}>()
</script>

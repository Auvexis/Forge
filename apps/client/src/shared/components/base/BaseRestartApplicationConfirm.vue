<template></template>

<script setup lang="ts">
import { useConfirm } from '@/shared/composables/useConfirm'
import { useToast } from '@/shared/composables/useToast'

const { confirm } = useConfirm()
const toast = useToast()

async function requestRestart(message = 'Fabric needs to restart to apply this system change.') {
  const restartNow = await confirm({
    title: 'Restart Application',
    message,
    confirmText: 'Restart now',
    cancelText: 'Later',
    variant: 'warning',
  })

  if (!restartNow) return false

  if (window.fabricDesktop?.isDesktop) {
    await window.fabricDesktop.restart()
  } else {
    toast.info('Restart Fabric', 'Restart the Fabric process or Docker container to apply this change.')
  }

  return true
}

defineExpose({ requestRestart })
</script>

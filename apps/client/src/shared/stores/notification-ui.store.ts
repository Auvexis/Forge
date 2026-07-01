import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useNotificationUiStore = defineStore('notification-ui', () => {
  const isOpen = ref(false)
  const detailNotificationId = ref<string | null>(null)

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    detailNotificationId.value = null
  }

  function toggle() {
    if (isOpen.value) close()
    else open()
  }

  function showDetail(notificationId: string) {
    detailNotificationId.value = notificationId
  }

  function backToList() {
    detailNotificationId.value = null
  }

  return {
    isOpen,
    detailNotificationId,
    open,
    close,
    toggle,
    showDetail,
    backToList,
  }
})

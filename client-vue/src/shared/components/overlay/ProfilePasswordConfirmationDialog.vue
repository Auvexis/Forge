<template>
  <AppDialog
    :model-value="modelValue"
    :title="`Unlock ${profile.name}`"
    description="Enter this profile's password to continue."
    max-width="sm"
    layer="top"
    backdrop="modal"
    @close="cancel"
  >
    <form class="profile-password-dialog__form" @submit.prevent="confirm">
      <BaseInput
        v-model="password"
        type="password"
        label="Password"
        autocomplete="current-password"
        autofocus
        :error="error"
        :disabled="isVerifying"
      />

      <div class="profile-password-dialog__actions">
        <BaseButton type="button" variant="secondary" :disabled="isVerifying" @click="cancel">
          Cancel
        </BaseButton>
        <BaseButton type="submit" variant="primary" :loading="isVerifying">
          Confirm
        </BaseButton>
      </div>
    </form>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ProfileSummary } from '@/core/api/profiles.api'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { useProfileStore } from '@/shared/stores/profile.store'
import AppDialog from './AppDialog.vue'

const props = defineProps<{
  modelValue: boolean
  profile: ProfileSummary
}>()

const emit = defineEmits<{
  confirmed: [password: string]
  cancel: []
}>()

const profileStore = useProfileStore()
const password = ref('')
const error = ref('')
const isVerifying = ref(false)
let verificationAttempt = 0

watch(
  () => props.modelValue,
  () => clearSensitiveState(),
)

function clearSensitiveState() {
  verificationAttempt += 1
  password.value = ''
  error.value = ''
}

function cancel() {
  clearSensitiveState()
  isVerifying.value = false
  profileStore.clearError()
  emit('cancel')
}

async function confirm() {
  const submittedPassword = password.value
  if (!submittedPassword || isVerifying.value) return

  const attempt = ++verificationAttempt
  error.value = ''
  isVerifying.value = true

  try {
    const result = await profileStore.verifyPassword(props.profile.id, submittedPassword)
    if (attempt !== verificationAttempt || !props.modelValue) return
    if (!result.valid) {
      error.value = 'Invalid password'
      return
    }

    isVerifying.value = false
    clearSensitiveState()
    emit('confirmed', submittedPassword)
  } catch {
    if (attempt !== verificationAttempt || !props.modelValue) return
    profileStore.clearError()
    error.value = 'Could not verify password'
  } finally {
    if (attempt === verificationAttempt) isVerifying.value = false
  }
}
</script>

<style scoped>
.profile-password-dialog__form {
  display: grid;
  gap: var(--sailor-space-5);
}

.profile-password-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sailor-space-3);
}
</style>

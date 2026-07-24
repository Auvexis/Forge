<template>
  <BaseModal :is-open="modelValue" max-width="560px" height="auto" @close="closeModal">
    <section
      class="profile-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-settings-title"
    >
      <header class="profile-settings-modal__header">
        <div>
          <h2 id="profile-settings-title">Profile settings</h2>
          <p>Edit the active profile identity and local access protection.</p>
        </div>
        <button
          type="button"
          class="profile-settings-modal__close"
          aria-label="Close"
          @click="closeModal"
        >
          <LucideIcon name="x" :size="18" />
        </button>
      </header>

      <div class="profile-settings-modal__body">
        <form class="profile-settings" @submit.prevent="saveProfile">
          <div class="profile-settings__identity">
            <span class="profile-settings__avatar">{{ draft.avatarEmoji }}</span>
            <div>
              <h3>{{ profileStore.currentProfile?.name ?? 'Profile' }}</h3>
              <p>{{ passwordState }}</p>
            </div>
          </div>

          <ProfileAvatarPicker v-model="draft.avatarEmoji" />

          <BaseInput v-model="draft.name" label="Name" required placeholder="Profile name" />
          <BaseInput
            v-model="draft.email"
            label="Email"
            type="email"
            placeholder="Email optional"
          />

          <div class="profile-settings__password-field">
            <BaseInput
              v-if="!profileStore.currentProfile?.passwordProtected"
              v-model="newPasswordDraft"
              type="password"
              label="New password"
              placeholder="Optional password"
              hint="Leave empty to keep password disabled."
            />
            <template v-else>
              <BaseInput
                v-model="currentPasswordDraft"
                type="password"
                label="Current password"
                placeholder="Confirm current password"
              />
              <BaseInput
                v-model="newPasswordDraft"
                type="password"
                label="New password"
                placeholder="New password"
                hint="Required only when changing password."
              />
            </template>
          </div>

          <p v-if="error" class="profile-settings__error">{{ error }}</p>

          <div class="profile-settings__actions">
            <BaseButton type="button" variant="secondary" @click="closeModal">Cancel</BaseButton>
            <BaseButton type="submit" variant="primary" :loading="isSaving"
              >Save profile</BaseButton
            >
          </div>
        </form>
      </div>
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useProfileStore } from '@/shared/stores/profile.store'
import { buildProfileSettingsPayload, profilePasswordStateLabel } from '../profileSettingsForm'
import ProfileAvatarPicker from './ProfileAvatarPicker.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const profileStore = useProfileStore()
const draft = reactive({ name: '', avatarEmoji: '⛵', email: '' })
const currentPasswordDraft = ref('')
const newPasswordDraft = ref('')
const error = ref<string | null>(null)
const isSaving = ref(false)

const passwordState = computed(() =>
  profilePasswordStateLabel(profileStore.currentProfile?.passwordProtected ?? false),
)

function closeModal() {
  emit('update:modelValue', false)
}

watch(
  () => [props.modelValue, profileStore.currentProfile] as const,
  () => {
    if (!props.modelValue || !profileStore.currentProfile) return
    draft.name = profileStore.currentProfile.name
    draft.avatarEmoji = profileStore.currentProfile.avatarEmoji
    draft.email = profileStore.currentProfile.email ?? ''
    currentPasswordDraft.value = ''
    newPasswordDraft.value = ''
    error.value = null
  },
  { immediate: true },
)

async function saveProfile() {
  const profile = profileStore.currentProfile
  if (!profile) return
  if (!draft.name.trim()) {
    error.value = 'Name is required'
    return
  }
  const currentPassword = currentPasswordDraft.value
  const newPassword = newPasswordDraft.value.trim()

  isSaving.value = true
  error.value = null
  try {
    if (newPassword) {
      if (profile.passwordProtected) {
        if (!currentPassword) {
          error.value = 'Current password is required to change password'
          return
        }

        const result = await profileStore.verifyPassword(profile.id, currentPassword)
        if (!result.valid) {
          error.value = 'Current password is invalid'
          return
        }
      }
    } else if (currentPassword) {
      error.value = 'New password is required to change password'
      return
    }

    await profileStore.updateProfile(profile.id, buildProfileSettingsPayload(draft))
    if (newPassword) await profileStore.setPassword(profile.id, newPassword)

    closeModal()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not save profile'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.profile-settings-modal {
  display: flex;
  max-height: min(82vh, 760px);
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.profile-settings-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--fabric-space-4);
  padding: var(--fabric-space-5) var(--fabric-space-6);
  border-bottom: 1px solid var(--fabric-profile-settings-panel-border);
  flex-shrink: 0;
}

.profile-settings-modal__header h2 {
  margin: 0;
  color: var(--fabric-profile-settings-panel-text-primary);
  font-size: var(--fabric-text-lg);
  font-weight: var(--fabric-font-semibold);
}

.profile-settings-modal__header p {
  margin: var(--fabric-space-1) 0 0;
  color: var(--fabric-profile-settings-panel-text-secondary);
  font-size: var(--fabric-text-sm);
  line-height: var(--fabric-leading-normal);
}

.profile-settings-modal__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  margin: -4px -8px 0 0;
  border: 0;
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-profile-settings-panel-text-secondary);
  background: transparent;
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.profile-settings-modal__close:hover {
  color: var(--fabric-profile-settings-panel-text-primary);
  background: var(--fabric-profile-settings-panel-bg-muted);
}

.profile-settings-modal__body {
  min-height: 0;
  padding: var(--fabric-space-6);
  overflow-y: auto;
}

.profile-settings {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-4);
}

.profile-settings__identity {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: var(--fabric-space-3);
}

.profile-settings__avatar {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid var(--fabric-profile-settings-panel-border);
  background: var(--fabric-profile-settings-panel-bg-muted);
  font-size: 26px;
  line-height: 1;
}

.profile-settings h3 {
  margin: 0;
  color: var(--fabric-profile-settings-panel-text-primary);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
}

.profile-settings p {
  margin: 2px 0 0;
  color: var(--fabric-profile-settings-panel-text-muted);
  font-size: var(--fabric-text-xs);
}

.profile-settings__error {
  color: var(--fabric-profile-settings-panel-text-error);
}

.profile-settings__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--fabric-space-2);
}

.profile-settings__password-field {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-4);
}
</style>

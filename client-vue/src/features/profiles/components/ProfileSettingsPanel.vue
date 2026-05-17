<template>
  <AppDialog
    :model-value="modelValue"
    title="Profile settings"
    description="Edit the active profile identity and local access protection."
    max-width="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
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
      <BaseInput v-model="draft.email" label="Email" type="email" placeholder="Email optional" />

      <p v-if="error" class="profile-settings__error">{{ error }}</p>

      <div class="profile-settings__actions">
        <BaseButton type="button" variant="secondary" @click="emit('update:modelValue', false)">
          Cancel
        </BaseButton>
        <BaseButton type="submit" variant="primary" :loading="isSaving">Save profile</BaseButton>
      </div>
    </form>

    <section class="profile-settings__password" aria-label="Password protection">
      <div>
        <h3>Password protection</h3>
        <p>{{ passwordState }}</p>
      </div>

      <form v-if="!profileStore.currentProfile?.passwordProtected" class="profile-settings__password-form" @submit.prevent="setPassword">
        <BaseInput
          v-model="passwordDraft"
          type="password"
          label="New password"
          placeholder="Password"
        />
        <BaseButton type="submit" variant="secondary" :loading="isSavingPassword">Set password</BaseButton>
      </form>

      <BaseButton
        v-else
        type="button"
        variant="danger"
        :loading="isSavingPassword"
        @click="removePassword"
      >
        Remove password
      </BaseButton>
    </section>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppDialog from '@/shared/components/overlay/AppDialog.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
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
const passwordDraft = ref('')
const error = ref<string | null>(null)
const isSaving = ref(false)
const isSavingPassword = ref(false)

const passwordState = computed(() =>
  profilePasswordStateLabel(profileStore.currentProfile?.passwordProtected ?? false),
)

watch(
  () => [props.modelValue, profileStore.currentProfile] as const,
  () => {
    if (!props.modelValue || !profileStore.currentProfile) return
    draft.name = profileStore.currentProfile.name
    draft.avatarEmoji = profileStore.currentProfile.avatarEmoji
    draft.email = profileStore.currentProfile.email ?? ''
    passwordDraft.value = ''
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

  isSaving.value = true
  error.value = null
  try {
    await profileStore.updateProfile(profile.id, buildProfileSettingsPayload(draft))
    emit('update:modelValue', false)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not save profile'
  } finally {
    isSaving.value = false
  }
}

async function setPassword() {
  const profile = profileStore.currentProfile
  if (!profile || !passwordDraft.value) return

  isSavingPassword.value = true
  error.value = null
  try {
    await profileStore.setPassword(profile.id, passwordDraft.value)
    passwordDraft.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not set password'
  } finally {
    isSavingPassword.value = false
  }
}

async function removePassword() {
  const profile = profileStore.currentProfile
  if (!profile) return

  isSavingPassword.value = true
  error.value = null
  try {
    await profileStore.removePassword(profile.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not remove password'
  } finally {
    isSavingPassword.value = false
  }
}
</script>

<style scoped>
.profile-settings {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-4);
}

.profile-settings__identity {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: var(--sailor-space-3);
}

.profile-settings__avatar {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid var(--sailor-border);
  background: var(--sailor-bg-muted);
  font-size: 26px;
  line-height: 1;
}

.profile-settings h3,
.profile-settings__password h3 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-semibold);
}

.profile-settings p,
.profile-settings__password p {
  margin: 2px 0 0;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.profile-settings__error {
  color: var(--sailor-text-error);
}

.profile-settings__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sailor-space-2);
}

.profile-settings__password {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sailor-space-4);
  padding-top: var(--sailor-space-5);
  margin-top: var(--sailor-space-5);
  border-top: 1px solid var(--sailor-border);
}

.profile-settings__password-form {
  display: flex;
  align-items: flex-end;
  gap: var(--sailor-space-2);
}

@media (max-width: 560px) {
  .profile-settings__password,
  .profile-settings__password-form {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

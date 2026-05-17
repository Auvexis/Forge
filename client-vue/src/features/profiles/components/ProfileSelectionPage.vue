<template>
  <main class="profile-entry" data-testid="profile-selection-page">
    <section class="profile-entry__panel" aria-labelledby="profile-entry-title">
      <header class="profile-entry__header">
        <p class="profile-entry__eyebrow">Sailor</p>
        <h1 id="profile-entry-title">Quem esta navegando?</h1>
      </header>

      <p v-if="profileStore.error" class="profile-entry__error">{{ profileStore.error }}</p>

      <form v-if="mode === 'password' && selectedProfile" class="profile-entry__form" @submit.prevent="submitPassword">
        <button type="button" class="profile-entry__back" aria-label="Voltar" @click="resetMode">
          <LucideIcon name="arrow-left" :size="18" />
        </button>
        <div class="profile-entry__avatar profile-entry__avatar--large">{{ selectedProfile.avatarEmoji }}</div>
        <h2>{{ selectedProfile.name }}</h2>
        <input
          v-model="password"
          class="profile-entry__input"
          type="password"
          autocomplete="current-password"
          placeholder="Senha"
          aria-label="Senha do perfil"
        />
        <p v-if="passwordError" class="profile-entry__error">{{ passwordError }}</p>
        <BaseButton type="submit" variant="primary" :loading="profileStore.isSwitching" icon-right="arrow-right">
          Entrar
        </BaseButton>
      </form>

      <form v-else-if="mode === 'create'" class="profile-entry__form" @submit.prevent="createProfile">
        <button type="button" class="profile-entry__back" aria-label="Voltar" @click="resetMode">
          <LucideIcon name="arrow-left" :size="18" />
        </button>
        <ProfileAvatarPicker v-model="draft.avatarEmoji" />
        <input
          v-model="draft.name"
          class="profile-entry__input"
          type="text"
          autocomplete="name"
          placeholder="Nome"
          aria-label="Nome do perfil"
        />
        <input
          v-model="draft.email"
          class="profile-entry__input"
          type="email"
          autocomplete="email"
          placeholder="Email opcional"
          aria-label="Email opcional"
        />
        <p v-if="formError" class="profile-entry__error">{{ formError }}</p>
        <BaseButton type="submit" variant="primary" :loading="isCreating" icon-right="plus">
          Criar
        </BaseButton>
      </form>

      <form v-else-if="mode === 'delete' && selectedProfile" class="profile-entry__form" @submit.prevent="deleteProfile">
        <button type="button" class="profile-entry__back" aria-label="Voltar" @click="resetMode">
          <LucideIcon name="arrow-left" :size="18" />
        </button>
        <div class="profile-entry__avatar profile-entry__avatar--large">{{ selectedProfile.avatarEmoji }}</div>
        <h2>Excluir {{ selectedProfile.name }}</h2>
        <input
          v-model="deleteConfirmation"
          class="profile-entry__input"
          type="text"
          autocomplete="off"
          placeholder="DELETE"
          aria-label="Digite DELETE para confirmar"
        />
        <p v-if="deleteError" class="profile-entry__error">{{ deleteError }}</p>
        <BaseButton type="submit" variant="danger" iconLeft="trash-2" :disabled="deleteConfirmation !== 'DELETE'">
          Excluir
        </BaseButton>
      </form>

      <div v-else class="profile-entry__grid" :aria-busy="profileStore.isLoading">
        <button
          v-for="profile in profileStore.sortedProfiles"
          :key="profile.id"
          type="button"
          class="profile-entry__profile"
          @click="selectProfile(profile)"
        >
          <span class="profile-entry__avatar">{{ profile.avatarEmoji }}</span>
          <span class="profile-entry__name">{{ profile.name }}</span>
          <span v-if="profile.passwordProtected" class="profile-entry__lock">
            <LucideIcon name="lock-keyhole" :size="14" />
          </span>
          <button
            v-if="profileStore.currentProfile?.id !== profile.id"
            type="button"
            class="profile-entry__delete"
            aria-label="Excluir perfil"
            @click.stop="confirmDelete(profile)"
          >
            <LucideIcon name="trash-2" :size="15" />
          </button>
        </button>

        <button type="button" class="profile-entry__profile profile-entry__profile--create" @click="openCreate">
          <span class="profile-entry__avatar profile-entry__avatar--new">
            <LucideIcon name="plus" :size="30" />
          </span>
          <span class="profile-entry__name">Novo perfil</span>
        </button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useProfileStore } from '@/shared/stores/profile.store'
import type { ProfileSummary } from '@/core/api/profiles.api'
import ProfileAvatarPicker from './ProfileAvatarPicker.vue'
import { DEFAULT_PROFILE_AVATAR, pickDefaultProfileAvatar } from '../profileSelectionOptions'

const emit = defineEmits<{
  entered: []
}>()

const profileStore = useProfileStore()
const mode = ref<'list' | 'password' | 'create' | 'delete'>('list')
const selectedProfile = ref<ProfileSummary | null>(null)
const password = ref('')
const passwordError = ref<string | null>(null)
const formError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const deleteConfirmation = ref('')
const isCreating = ref(false)
const draft = reactive<{ name: string; avatarEmoji: string; email: string }>({
  name: '',
  avatarEmoji: DEFAULT_PROFILE_AVATAR,
  email: '',
})

onMounted(async () => {
  await profileStore.loadProfiles()
})

async function selectProfile(profile: ProfileSummary) {
  selectedProfile.value = profile
  passwordError.value = null
  password.value = ''

  if (profile.passwordProtected) {
    mode.value = 'password'
    return
  }

  await profileStore.switchProfile(profile.id)
  emit('entered')
}

async function submitPassword() {
  if (!selectedProfile.value) return
  passwordError.value = null

  try {
    await profileStore.switchProfile(selectedProfile.value.id, password.value)
    emit('entered')
  } catch {
    profileStore.clearError()
    passwordError.value = 'Senha invalida'
  }
}

function openCreate() {
  const nextIndex = profileStore.profiles.length
  draft.name = ''
  draft.avatarEmoji = pickDefaultProfileAvatar(nextIndex)
  draft.email = ''
  formError.value = null
  mode.value = 'create'
}

async function createProfile() {
  const name = draft.name.trim()
  if (!name) {
    formError.value = 'Nome obrigatorio'
    return
  }

  isCreating.value = true
  formError.value = null
  try {
    await profileStore.createProfile({
      name,
      avatarEmoji: draft.avatarEmoji,
      email: draft.email.trim() || null,
    })
    resetMode()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Nao foi possivel criar'
  } finally {
    isCreating.value = false
  }
}

function confirmDelete(profile: ProfileSummary) {
  selectedProfile.value = profile
  deleteConfirmation.value = ''
  deleteError.value = null
  mode.value = 'delete'
}

async function deleteProfile() {
  if (!selectedProfile.value) return
  if (deleteConfirmation.value !== 'DELETE') {
    deleteError.value = 'Digite DELETE'
    return
  }

  try {
    await profileStore.deleteProfile(selectedProfile.value.id)
    resetMode()
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Nao foi possivel excluir'
  }
}

function resetMode() {
  mode.value = 'list'
  selectedProfile.value = null
  password.value = ''
  passwordError.value = null
  formError.value = null
  deleteError.value = null
  deleteConfirmation.value = ''
}
</script>

<style scoped>
.profile-entry {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(24px, 5vw, 72px);
  color: var(--sailor-text-primary);
  background:
    radial-gradient(circle at 18% 12%, rgba(249, 115, 22, 0.16), transparent 32%),
    radial-gradient(circle at 82% 86%, rgba(20, 184, 166, 0.14), transparent 34%),
    linear-gradient(135deg, #0e0e0e 0%, #161616 54%, #111827 100%);
}

.profile-entry__panel {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.profile-entry__header {
  text-align: center;
}

.profile-entry__eyebrow {
  margin: 0 0 8px;
  color: var(--sailor-text-brand);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.profile-entry__header h1,
.profile-entry__form h2 {
  margin: 0;
  font-size: clamp(28px, 4vw, 46px);
  font-weight: 600;
  letter-spacing: 0;
}

.profile-entry__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
  gap: 18px;
}

.profile-entry__profile {
  position: relative;
  min-height: 172px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 18px;
  border-radius: 8px;
  border: 1px solid var(--sailor-border);
  background: rgba(255, 255, 255, 0.045);
  color: var(--sailor-text-primary);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.profile-entry__profile:hover {
  transform: translateY(-2px);
  border-color: var(--sailor-border-strong);
  background: rgba(255, 255, 255, 0.075);
}

.profile-entry__avatar {
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 1px solid var(--sailor-border-strong);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03));
  font-size: 42px;
}

.profile-entry__avatar--large {
  width: 104px;
  height: 104px;
  font-size: 54px;
}

.profile-entry__avatar--new {
  color: var(--sailor-text-secondary);
  font-size: 24px;
}

.profile-entry__name {
  max-width: 100%;
  color: var(--sailor-text-primary);
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
  text-align: center;
}

.profile-entry__lock,
.profile-entry__delete,
.profile-entry__back {
  display: inline-grid;
  place-items: center;
}

.profile-entry__lock {
  position: absolute;
  top: 12px;
  left: 12px;
  color: var(--sailor-amber-400);
}

.profile-entry__delete,
.profile-entry__back {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--sailor-border);
  color: var(--sailor-text-secondary);
  background: rgba(0, 0, 0, 0.18);
}

.profile-entry__delete {
  position: absolute;
  top: 10px;
  right: 10px;
}

.profile-entry__delete:hover {
  color: var(--sailor-red-400);
  border-color: rgba(248, 113, 113, 0.35);
}

.profile-entry__form {
  width: min(420px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.profile-entry__back {
  align-self: flex-start;
}

.profile-entry__input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--sailor-input-border);
  background: var(--sailor-input-bg);
  color: var(--sailor-input-text);
  font: inherit;
}

.profile-entry__input:focus {
  outline: none;
  border-color: var(--sailor-input-border-focus);
}

.profile-entry__error {
  margin: 0;
  color: var(--sailor-text-error);
  font-size: 13px;
}

@media (max-width: 560px) {
  .profile-entry {
    align-items: start;
    padding: 28px 18px;
  }

  .profile-entry__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-entry__profile {
    min-height: 148px;
  }

  .profile-entry__avatar {
    width: 72px;
    height: 72px;
    font-size: 36px;
  }
}
</style>

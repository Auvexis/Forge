<template>
  <main class="pe" :class="{ 'page-exit': exiting }" data-testid="profile-selection-page">
    <Transition name="pe-fade" mode="out-in">
      <!-- ══ LIST VIEW — full screen ══════════════════════ -->
      <div v-if="mode === 'list'" class="pe__full" key="list">
        <header class="pe__top-bar">
          <img class="pe__logo" :src="logoSrc" alt="Fabric" />
        </header>

        <div class="pe__stage">
          <div class="pe__titles">
            <h1>Who's sailing?</h1>
            <p class="pe__hint">Select your profile to continue</p>
          </div>

          <p v-if="profileStore.error" class="pe__error">{{ profileStore.error }}</p>

          <div class="pe__avatars" :aria-busy="profileStore.isLoading">
            <div
              v-for="profile in profileStore.sortedProfiles"
              :key="profile.id"
              class="pe__avatar-slot"
            >
              <button
                type="button"
                class="pe__circle"
                :title="profile.name"
                @click="selectProfile(profile)"
              >
                <span class="pe__circle-emoji">{{ profile.avatarEmoji }}</span>
                <span v-if="profile.passwordProtected" class="pe__circle-lock">
                  <LucideIcon name="lock-keyhole" :size="11" />
                </span>
              </button>
              <span class="pe__avatar-name">{{ profile.name }}</span>
              <button
                v-if="canDeleteProfile(profile)"
                type="button"
                class="pe__circle-delete"
                aria-label="Delete profile"
                @click.stop="confirmDelete(profile)"
              >
                <LucideIcon name="trash-2" :size="12" />
              </button>
            </div>

            <div class="pe__avatar-slot">
              <button type="button" class="pe__circle pe__circle--add" @click="openCreate">
                <LucideIcon name="plus" :size="32" />
              </button>
              <span class="pe__avatar-name">New profile</span>
            </div>
          </div>
        </div>

        <footer class="pe__footer">
          <span>Fabric Automation Platform</span>
          <span class="pe__footer-dot">·</span>
          <span>v1.0</span>
          <span class="pe__footer-dot">·</span>
          <span>All profiles are local and isolated</span>
        </footer>
      </div>

      <!-- ══ SPLIT LAYOUT — forms ══════════════════════════ -->
      <div
        v-else
        class="pe__split"
        :class="{ 'pe__split--password': mode === 'password' }"
        key="form"
      >
        <!-- Left pane -->
        <div class="pe__pane-left">
          <header class="pe__top-bar pe__top-bar--pane">
            <img class="pe__logo" :src="logoSrc" alt="Fabric" />
          </header>

          <!-- PASSWORD -->
          <div v-if="mode === 'password' && selectedProfile" class="pe__form-wrap">
            <BaseButton
              class="pe__back"
              type="button"
              variant="ghost"
              size="icon"
              icon-left="arrow-left"
              aria-label="Back"
              @click="resetMode"
            />
            <div class="pe__circle pe__circle--static">
              <span class="pe__circle-emoji">{{ selectedProfile.avatarEmoji }}</span>
            </div>
            <div class="pe__form-titles">
              <h2>{{ selectedProfile.name }}</h2>
              <p class="pe__hint">This profile is password protected</p>
            </div>
            <form class="pe__form" @submit.prevent="submitPassword">
              <input
                v-model="password"
                class="pe__input"
                type="password"
                autocomplete="current-password"
                placeholder="Password"
                autofocus
              />
              <p v-if="passwordError" class="pe__error">{{ passwordError }}</p>
              <BaseButton
                type="submit"
                variant="primary"
                :loading="profileStore.isSwitching"
                icon-right="arrow-right"
                style="width: 100%"
                >Enter</BaseButton
              >
            </form>
          </div>

          <!-- CREATE -->
          <div v-else-if="mode === 'create'" class="pe__form-wrap">
            <BaseButton
              class="pe__back"
              type="button"
              variant="ghost"
              size="icon"
              icon-left="arrow-left"
              aria-label="Back"
              @click="resetMode"
            />
            <ProfileAvatarPicker v-model="draft.avatarEmoji" />
            <div class="pe__form-titles">
              <h2>Create profile</h2>
              <p class="pe__hint">Personalize your Fabric space</p>
            </div>
            <form class="pe__form" @submit.prevent="createProfile">
              <div class="pe__field">
                <label class="pe__label" for="c-name">Name</label>
                <input
                  id="c-name"
                  v-model="draft.name"
                  class="pe__input"
                  type="text"
                  autocomplete="name"
                  placeholder="Your name"
                  autofocus
                />
              </div>
              <div class="pe__field">
                <label class="pe__label" for="c-email"
                  >Email <span class="pe__opt">(optional)</span></label
                >
                <input
                  id="c-email"
                  v-model="draft.email"
                  class="pe__input"
                  type="email"
                  autocomplete="email"
                  placeholder="email@example.com"
                />
              </div>
              <div class="pe__field">
                <label class="pe__label" for="c-pass"
                  >Password <span class="pe__opt">(optional)</span></label
                >
                <input
                  id="c-pass"
                  v-model="draft.password"
                  class="pe__input"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Leave empty for no password"
                />
              </div>
              <Transition name="pe-expand">
                <div v-if="draft.password" class="pe__field">
                  <label class="pe__label" for="c-confirm">Confirm password</label>
                  <input
                    id="c-confirm"
                    v-model="draft.confirmPassword"
                    class="pe__input"
                    type="password"
                    autocomplete="new-password"
                    placeholder="Repeat password"
                  />
                </div>
              </Transition>
              <p v-if="formError" class="pe__error">{{ formError }}</p>
              <BaseButton
                type="submit"
                variant="primary"
                :loading="isCreating"
                icon-right="arrow-right"
                style="width: 100%"
                >Create profile</BaseButton
              >
            </form>
          </div>

          <!-- DELETE -->
          <div v-else-if="mode === 'delete' && selectedProfile" class="pe__form-wrap">
            <BaseButton
              class="pe__back"
              type="button"
              variant="ghost"
              size="icon"
              icon-left="arrow-left"
              aria-label="Back"
              @click="resetMode"
            />
            <div class="pe__circle pe__circle--static pe__circle--danger">
              <span class="pe__circle-emoji">{{ selectedProfile.avatarEmoji }}</span>
            </div>
            <div class="pe__form-titles">
              <h2>Delete profile</h2>
              <p class="pe__hint">
                Type <strong>DELETE</strong> to confirm. This action cannot be undone.
              </p>
            </div>
            <form class="pe__form" @submit.prevent="deleteProfile">
              <input
                v-model="deleteConfirmation"
                class="pe__input pe__input--mono"
                type="text"
                autocomplete="off"
                placeholder="DELETE"
              />
              <p v-if="deleteError" class="pe__error">{{ deleteError }}</p>
              <BaseButton
                type="submit"
                variant="danger"
                icon-left="trash-2"
                :disabled="deleteConfirmation !== 'DELETE'"
                style="width: 100%"
              >
                Delete {{ selectedProfile.name }}
              </BaseButton>
            </form>
          </div>
        </div>

        <!-- Right pane — preview panel -->
        <div v-if="mode !== 'password'" class="pe__pane-right" aria-hidden="true">
          <div class="pe__preview-copy">
            <span class="pe__preview-eyebrow">Fabric workspace</span>
            <h2 class="pe__preview-title">Your profile, your workflows, your rhythm.</h2>
          </div>

          <div class="pe__preview-gif-slot">
            <span>GIF preview</span>
          </div>

          <div class="pe__preview-caption">
            <p class="pe__preview-desc">
              Profiles separate credentials, preferences, and automations for each person or
              operation. Start with a clean space and build visual workflows in minutes.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useProfileStore } from '@/shared/stores/profile.store'
import type { ProfileSummary } from '@/core/api/profiles.api'
import { profilesApi } from '@/core/api/profiles.api'
import ProfileAvatarPicker from './ProfileAvatarPicker.vue'
import { DEFAULT_PROFILE_AVATAR, pickDefaultProfileAvatar } from '../profileSelectionOptions'
import { isDefaultProfile } from '../profileListRules'
import { useTheme } from '@/shared/composables/useTheme'

const emit = defineEmits<{ entered: [] }>()
const { logoSrc } = useTheme()
const profileStore = useProfileStore()
const mode = ref<'list' | 'password' | 'create' | 'delete'>('list')
const selectedProfile = ref<ProfileSummary | null>(null)
const password = ref('')
const passwordError = ref<string | null>(null)
const formError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const deleteConfirmation = ref('')
const isCreating = ref(false)
const exiting = ref(false)
const draft = reactive({
  name: '',
  avatarEmoji: DEFAULT_PROFILE_AVATAR,
  email: '',
  password: '',
  confirmPassword: '',
})

const TRANSITION_MS = 300

async function enterApp() {
  exiting.value = true
  await new Promise((r) => setTimeout(r, TRANSITION_MS))
  emit('entered')
}

onMounted(() => profileStore.loadProfiles())

async function selectProfile(profile: ProfileSummary) {
  selectedProfile.value = profile
  passwordError.value = null
  password.value = ''
  if (profile.passwordProtected) {
    mode.value = 'password'
    return
  }
  await profileStore.switchProfile(profile.id)
  await enterApp()
}

async function submitPassword() {
  if (!selectedProfile.value) return
  passwordError.value = null
  try {
    await profileStore.switchProfile(selectedProfile.value.id, password.value)
    await enterApp()
  } catch {
    profileStore.clearError()
    passwordError.value = 'Invalid password'
  }
}

function openCreate() {
  draft.name = ''
  draft.avatarEmoji = pickDefaultProfileAvatar(profileStore.profiles.length)
  draft.email = ''
  draft.password = ''
  draft.confirmPassword = ''
  formError.value = null
  mode.value = 'create'
}

async function createProfile() {
  const name = draft.name.trim()
  if (!name) {
    formError.value = 'Name is required'
    return
  }
  if (draft.password && draft.password !== draft.confirmPassword) {
    formError.value = 'Passwords do not match'
    return
  }
  isCreating.value = true
  formError.value = null
  try {
    const created = await profileStore.createProfile({
      name,
      avatarEmoji: draft.avatarEmoji,
      email: draft.email.trim() || null,
    })
    if (draft.password && created?.id) {
      await profilesApi.setPassword(created.id, draft.password)
      await profileStore.loadProfiles()
    }
    resetMode()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Could not create profile'
  } finally {
    isCreating.value = false
  }
}

function confirmDelete(profile: ProfileSummary) {
  if (!canDeleteProfile(profile)) return
  selectedProfile.value = profile
  deleteConfirmation.value = ''
  deleteError.value = null
  mode.value = 'delete'
}

async function deleteProfile() {
  if (!selectedProfile.value) return
  if (deleteConfirmation.value !== 'DELETE') {
    deleteError.value = 'Type DELETE'
    return
  }
  try {
    await profileStore.deleteProfile(selectedProfile.value.id)
    resetMode()
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Could not delete profile'
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
  draft.password = ''
  draft.confirmPassword = ''
}

function canDeleteProfile(profile: ProfileSummary) {
  return !isDefaultProfile(profile) && profileStore.currentProfile?.id !== profile.id
}
</script>

<style scoped>
/* ── Shell ─────────────────────────────────────────────── */
.pe {
  min-height: 100vh;
  color: var(--fabric-text-primary);
  background-color: var(--fabric-bg-base);
}

/* ── Full-screen list view ────────────────────────────── */
.pe__full {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 60px;
  position: relative;
}

/* ── Split layout ───────────────────────────────────── */
.pe__split {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.pe__split--password {
  grid-template-columns: 1fr;
}

.pe__pane-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 48px 80px;
  position: relative;
}

.pe__split--password .pe__pane-left {
  border-right: 0;
}

.pe__pane-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 34px;
  padding: 72px 64px;
  border-bottom-left-radius: 35px;
  border-top-left-radius: 35px;
  background: var(--fabric-bg-inverse);
  overflow: hidden;
  position: relative;
}

/* ── Top bar (logo) ──────────────────────────────────── */
.pe__top-bar {
  position: absolute;
  top: 28px;
  left: 28px;
}

.pe__top-bar--pane {
  position: absolute;
  top: 28px;
  left: 40px;
}

.pe__logo {
  height: 34px;
  width: auto;
}

/* ── Stage (list view) ─────────────────────────────────── */
.pe__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 52px;
  z-index: 1;
}

.pe__titles {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pe__titles h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.1;
}

.pe__hint {
  margin: 0;
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-sm);
}

/* ── Avatar row ────────────────────────────────────────── */
.pe__avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 36px 40px;
  justify-content: center;
  align-items: flex-start;
}

.pe__avatar-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

/* The circle button */
.pe__circle {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 2px solid var(--fabric-border);
  background: var(--fabric-bg-elevated);
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  transition:
    transform 220ms var(--fabric-ease-standard),
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.pe__circle:hover {
  transform: scale(1.06) translateY(-3px);
  border-color: var(--fabric-border-strong);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.35),
    0 0 0 4px color-mix(in srgb, var(--fabric-brand-500) 12%, transparent);
}

.pe__circle:active {
  transform: scale(0.97);
}

.pe__circle-emoji {
  font-size: 54px;
  line-height: 1;
  pointer-events: none;
}

.pe__circle--add {
  border-style: dashed;
  color: var(--fabric-text-secondary);
}
.pe__circle--add:hover {
  color: var(--fabric-text-primary);
  border-color: var(--fabric-border-strong);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.pe__circle--static {
  cursor: default;
  width: 100px;
  height: 100px;
}
.pe__circle--static:hover {
  transform: none;
  box-shadow: none;
}

.pe__circle--danger {
  border-color: color-mix(in srgb, var(--fabric-red-400) 35%, transparent);
  background: color-mix(in srgb, var(--fabric-red-400) 6%, var(--fabric-bg-surface));
}

.pe__circle-lock {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--fabric-amber-400) 15%, var(--fabric-bg-base));
  border: 1px solid color-mix(in srgb, var(--fabric-amber-400) 30%, transparent);
  color: var(--fabric-amber-400);
  display: grid;
  place-items: center;
}

.pe__avatar-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--fabric-text-primary);
  text-align: center;
  max-width: 120px;
  overflow-wrap: anywhere;
}

.pe__circle-delete {
  position: absolute;
  top: 0;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--fabric-border);
  background: var(--fabric-bg-overlay);
  color: var(--fabric-text-muted);
  display: grid;
  place-items: center;
  opacity: 0;
  transition:
    opacity 160ms ease,
    color 160ms ease,
    border-color 160ms ease;
}

.pe__avatar-slot:hover .pe__circle-delete {
  opacity: 1;
}

.pe__circle-delete:hover {
  color: var(--fabric-red-400);
  border-color: color-mix(in srgb, var(--fabric-red-400) 30%, transparent);
}

/* ── Form wrap (left pane) ─────────────────────────────── */
.pe__form-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
  width: 100%;
  max-width: 360px;
}

.pe__form-titles {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.pe__form-titles h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

/* ── Right pane preview ──────────────────────────────── */
.pe__preview-copy,
.pe__preview-caption {
  width: 100%;
  max-width: 560px;
  text-align: left;
}

.pe__preview-copy {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pe__preview-eyebrow {
  color: color-mix(in srgb, var(--fabric-text-inverse) 58%, transparent);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pe__preview-title {
  max-width: 540px;
  margin: 0;
  color: var(--fabric-text-inverse);
  font-size: clamp(34px, 4.5vw, 62px);
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 0.96;
}

.pe__preview-gif-slot {
  display: grid;
  place-items: center;
  width: min(100%, 680px);
  aspect-ratio: 16 / 9;
  border: 1px dashed color-mix(in srgb, var(--fabric-text-inverse) 26%, transparent);
  border-radius: 18px;
  color: color-mix(in srgb, var(--fabric-text-inverse) 48%, transparent);
  background: color-mix(in srgb, var(--fabric-text-inverse) 5%, transparent);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
}

.pe__preview-gif-slot span {
  display: block;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--fabric-text-inverse) 18%, transparent);
  border-radius: var(--fabric-radius-full);
  color: color-mix(in srgb, var(--fabric-text-inverse) 70%, transparent);
  background: color-mix(in srgb, var(--fabric-bg-inverse) 86%, var(--fabric-text-inverse));
  font-size: var(--fabric-text-xs);
  font-weight: 600;
}

.pe__preview-caption {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pe__preview-desc {
  margin: 0;
  color: color-mix(in srgb, var(--fabric-text-inverse) 68%, transparent);
  font-size: var(--fabric-text-base);
  line-height: var(--fabric-leading-loose);
}

/* ── Card (keep for delete/password fallback, no background) ── */
.pe__card {
  position: relative;
  width: min(400px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 1;
}

.pe__back {
  align-self: flex-start;
}

.pe__card-titles {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pe__card-titles h2 {
  margin: 0;
  font-size: var(--fabric-text-2xl);
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ── Form ──────────────────────────────────────────────── */
.pe__form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pe__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pe__label {
  font-size: var(--fabric-text-xs);
  font-weight: 600;
  color: var(--fabric-text-secondary);
}

.pe__opt {
  font-weight: 400;
  color: var(--fabric-text-muted);
}

.pe__input {
  width: 100%;
  height: 42px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid var(--fabric-input-border);
  background: var(--fabric-input-bg);
  color: var(--fabric-input-text);
  font: inherit;
  font-size: var(--fabric-text-sm);
  transition: border-color 160ms ease;
}
.pe__input::placeholder {
  color: var(--fabric-input-placeholder);
}
.pe__input:focus {
  outline: none;
  border-color: var(--fabric-input-border-focus);
}

.pe__input--mono {
  font-family: var(--fabric-font-mono);
  letter-spacing: 0.1em;
  text-align: center;
  font-size: var(--fabric-text-base);
}

.pe__error {
  margin: 0;
  color: var(--fabric-text-error);
  font-size: var(--fabric-text-xs);
  text-align: center;
}

/* ── Footer ────────────────────────────────────────────── */
.pe__footer {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fabric-text-muted);
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
}
.pe__footer-dot {
  opacity: 0.4;
}

/* ── Transitions ───────────────────────────────────────── */
.pe-fade-enter-active,
.pe-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms var(--fabric-ease-standard);
}
.pe-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.pe-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.pe-expand-enter-active,
.pe-expand-leave-active {
  transition:
    opacity 200ms ease,
    max-height 200ms ease;
  overflow: hidden;
  max-height: 72px;
}
.pe-expand-enter-from,
.pe-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 900px) {
  .pe__split {
    grid-template-columns: 1fr;
  }
  .pe__pane-right {
    display: none;
  }
  .pe__pane-left {
    align-items: center;
    padding: 100px 32px 64px;
    border-right: none;
  }
}
@media (max-width: 480px) {
  .pe__avatars {
    gap: 28px 24px;
  }
  .pe__circle {
    width: 90px;
    height: 90px;
  }
  .pe__circle-emoji {
    font-size: 44px;
  }
}
</style>

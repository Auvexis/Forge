<template>
  <div class="profile-avatar-picker">
    <section
      v-for="group in groups"
      :key="group.label"
      class="profile-avatar-picker__group"
      :aria-label="group.label"
    >
      <span class="profile-avatar-picker__label">{{ group.label }}</span>
      <div class="profile-avatar-picker__grid" role="radiogroup" :aria-label="`${group.label} avatars`">
        <button
          v-for="emoji in group.options"
          :key="`${group.label}-${emoji}`"
          type="button"
          class="profile-avatar-picker__choice"
          :class="{ 'profile-avatar-picker__choice--active': model === emoji }"
          :aria-checked="model === emoji"
          role="radio"
          @click="selectAvatar(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  buildProfileAvatarPickerGroups,
  PROFILE_AVATAR_RECENT_STORAGE_KEY,
  rememberProfileAvatar,
} from '../profileAvatarPickerOptions'

const model = defineModel<string>({ required: true })
const recentAvatars = ref<string[]>([])
const groups = computed(() => buildProfileAvatarPickerGroups(recentAvatars.value))

onMounted(() => {
  try {
    const stored = window.localStorage.getItem(PROFILE_AVATAR_RECENT_STORAGE_KEY)
    recentAvatars.value = stored ? JSON.parse(stored) : []
  } catch {
    recentAvatars.value = []
  }
})

function selectAvatar(emoji: string) {
  model.value = emoji
  recentAvatars.value = rememberProfileAvatar(recentAvatars.value, emoji)
  window.localStorage.setItem(PROFILE_AVATAR_RECENT_STORAGE_KEY, JSON.stringify(recentAvatars.value))
}
</script>

<style scoped>
.profile-avatar-picker {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-avatar-picker__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-avatar-picker__label {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-semibold);
  text-align: left;
  text-transform: uppercase;
}

.profile-avatar-picker__grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 40px));
  justify-content: center;
  gap: 8px;
}

.profile-avatar-picker__choice {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 1px solid var(--sailor-border);
  background: rgba(255, 255, 255, 0.045);
  color: var(--sailor-text-primary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.profile-avatar-picker__choice:hover {
  transform: translateY(-1px);
  border-color: var(--sailor-border-strong);
  background: rgba(255, 255, 255, 0.075);
}

.profile-avatar-picker__choice--active {
  border-color: var(--sailor-border-brand);
  background: rgba(249, 115, 22, 0.14);
}

@media (max-width: 560px) {
  .profile-avatar-picker__grid {
    grid-template-columns: repeat(4, 42px);
  }

  .profile-avatar-picker__choice {
    width: 42px;
    height: 42px;
  }
}
</style>

<template>
  <AppDropdownMenu
    class="profile-switcher"
    position="bottom-start"
    :offset="6"
    max-height="min(520px, calc(100vh - 72px))"
  >
    <template #trigger>
      <button
        class="profile-switcher__trigger"
        :class="{ 'profile-switcher__trigger--collapsed': collapsed }"
        type="button"
        :aria-label="triggerLabel"
      >
        <span class="profile-switcher__avatar" aria-hidden="true">{{ activeAvatar }}</span>
        <span v-if="!collapsed" class="profile-switcher__identity">
          <span class="profile-switcher__name">{{ activeName }}</span>
          <span v-if="profileStore.currentProfile?.email" class="profile-switcher__email">
            {{ profileStore.currentProfile.email }}
          </span>
        </span>
        <LucideIcon
          v-if="!collapsed"
          class="profile-switcher__chevron"
          name="chevrons-up-down"
          :size="14"
          stroke-width="2"
        />
      </button>
    </template>

    <div class="profile-switcher__menu">
      <div class="profile-switcher__summary">
        <span class="profile-switcher__summary-avatar" aria-hidden="true">{{ activeAvatar }}</span>
        <div class="profile-switcher__summary-text">
          <span class="profile-switcher__summary-name">{{ activeName }}</span>
          <span class="profile-switcher__summary-email">
            {{ profileStore.currentProfile?.email ?? 'No email' }}
          </span>
        </div>
      </div>

      <AppDropdownItem
        v-for="action in actions"
        :key="action.id"
        :label="action.label"
        :hint="action.hint"
        :icon="action.icon"
        :danger="action.danger"
        @click="handleAction(action.id)"
      />
    </div>
  </AppDropdownMenu>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useProfileStore } from '@/shared/stores/profile.store'
import {
  buildProfileSwitcherActions,
  profileSwitcherTriggerLabel,
  type ProfileSwitcherAction,
} from './profileSwitcherOptions'

defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'sign-out'): void
}>()

const profileStore = useProfileStore()

const activeName = computed(() => profileStore.currentProfile?.name ?? 'Profile')
const activeAvatar = computed(() => profileStore.currentProfile?.avatarEmoji ?? '⛵')
const triggerLabel = computed(() => profileSwitcherTriggerLabel(profileStore.currentProfile))
const actions = computed(() =>
  profileStore.currentProfile ? buildProfileSwitcherActions(profileStore.currentProfile) : [],
)

onMounted(() => {
  if (!profileStore.currentProfile && !profileStore.isLoading) {
    void profileStore.loadProfiles()
  }
})

function handleAction(actionId: ProfileSwitcherAction['id']) {
  if (actionId === 'switch-profile' || actionId === 'sign-out') {
    emit('sign-out')
    return
  }

  window.dispatchEvent(
    new CustomEvent('sailor:profiles:intent', {
      detail: {
        type: actionId,
        profileId: profileStore.currentProfile?.id,
      },
    }),
  )
}
</script>

<style scoped>
.profile-switcher {
  min-width: 236px;
}

.profile-switcher__trigger {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 0;
  border: 0;
  color: var(--sailor-sidebar-text);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.profile-switcher__trigger--collapsed {
  display: grid;
  grid-template-columns: 30px;
  place-items: center;
  width: 30px;
  min-height: 30px;
}

.profile-switcher__avatar,
.profile-switcher__summary-avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-button-ghost-hover);
  font-size: 17px;
  line-height: 1;
}

.profile-switcher__identity,
.profile-switcher__summary-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.profile-switcher__name,
.profile-switcher__summary-name {
  overflow: hidden;
  color: var(--sailor-sidebar-text);
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-medium);
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-switcher__email,
.profile-switcher__summary-email {
  overflow: hidden;
  color: var(--sailor-sidebar-text-muted);
  font-size: var(--sailor-text-xs);
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-switcher__chevron {
  color: var(--sailor-sidebar-text-muted);
}

.profile-switcher__menu {
  width: 236px;
}

.profile-switcher__summary {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-2) var(--sailor-space-3) var(--sailor-space-3);
  margin-bottom: var(--sailor-space-1);
  border-bottom: 1px solid var(--sailor-border);
}

.profile-switcher__summary-avatar {
  width: 34px;
  height: 34px;
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-muted);
}

.profile-switcher__summary-name {
  color: var(--sailor-text-primary);
}

.profile-switcher__summary-email {
  color: var(--sailor-text-muted);
}
</style>

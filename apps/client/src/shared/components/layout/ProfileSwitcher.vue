<template>
  <BaseDropdownMenu
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
      </button>
    </template>

    <!-- Summary header goes in #fixed so it's isolated from the item pill tracking -->
    <template #fixed>
      <div class="profile-switcher__summary">
        <span class="profile-switcher__summary-avatar" aria-hidden="true">{{ activeAvatar }}</span>
        <div class="profile-switcher__summary-text">
          <span class="profile-switcher__summary-name">{{ activeName }}</span>
          <span class="profile-switcher__summary-email">
            {{ profileStore.currentProfile?.email ?? 'No email' }}
          </span>
        </div>
      </div>
    </template>

    <BaseDropdownItem
      v-for="action in actions"
      :key="action.id"
      :label="action.label"
      :hint="action.hint"
      :icon="action.icon"
      :danger="action.danger"
      @click="handleAction(action.id)"
    />
  </BaseDropdownMenu>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import BaseDropdownItem from '@/shared/components/base/dropdown/BaseDropdownItem.vue'
import BaseDropdownMenu from '@/shared/components/base/dropdown/BaseDropdownMenu.vue'
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

  // edit-profile → open profile settings panel
  window.dispatchEvent(
    new CustomEvent('fabric:profiles:intent', {
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
  min-width: 0;
}

.profile-switcher :deep(.app-popover-trigger) {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: var(--fabric-profile-switcher-avatar-radius);
}

.profile-switcher__trigger {
  display: grid;
  grid-template-columns: 30px;
  align-items: center;
  justify-content: center;
  width: 30px;
  min-width: 0;
  min-height: 34px;
  padding: 0;
  border: 0;
  color: var(--fabric-profile-switcher-sidebar-text);
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--fabric-profile-switcher-avatar-radius);
  background: var(--fabric-profile-switcher-bg-base);
  font-size: 17px;
  line-height: 1;
  border: 1px solid var(--fabric-profile-switcher-border);
}

.profile-switcher__summary-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.profile-switcher__summary-name {
  overflow: hidden;
  color: var(--fabric-profile-switcher-sidebar-text);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-medium);
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-switcher__summary-email {
  overflow: hidden;
  color: var(--fabric-profile-switcher-sidebar-text-muted);
  font-size: var(--fabric-text-xs);
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-switcher__summary {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: var(--fabric-space-2);
  padding: var(--fabric-space-2) var(--fabric-space-3) var(--fabric-space-3);
  margin-bottom: var(--fabric-space-1);
  border-bottom: 1px solid var(--fabric-profile-switcher-border);
}

.profile-switcher__summary-avatar {
  width: 34px;
  height: 34px;
  font-size: 17px;
}

.profile-switcher__summary-name {
  color: var(--fabric-profile-switcher-text-primary);
}

.profile-switcher__summary-email {
  color: var(--fabric-profile-switcher-text-muted);
}
</style>

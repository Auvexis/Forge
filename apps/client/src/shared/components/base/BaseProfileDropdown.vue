<template>
  <AppDropdownMenu
    ref="menuRef"
    class="base-profile-dropdown"
    position="bottom-center"
    :offset="8"
    max-height="min(560px, calc(100vh - 72px))"
    @open="handleOpen"
    @close="handleClose"
  >
    <template #trigger>
      <slot name="trigger" :open="isOpen" />
    </template>

    <section class="base-profile-dropdown__identity">
      <span class="base-profile-dropdown__avatar" aria-hidden="true">{{ avatar }}</span>
      <span class="base-profile-dropdown__name">{{ profileName }}</span>
    </section>

    <section class="base-profile-dropdown__section" aria-label="Profile actions">
      <button
        class="base-profile-dropdown__item"
        type="button"
        @click="handleAction('edit-profile')"
      >
        <LucideIcon name="user-pen" :size="15" />
        <span>Edit Profile</span>
      </button>
      <button class="base-profile-dropdown__item" type="button" @click="handleAction('settings')">
        <LucideIcon name="settings" :size="15" />
        <span>Settings</span>
      </button>
    </section>

    <section class="base-profile-dropdown__section" aria-label="Auvexis account">
      <button
        v-if="auvexisAccount"
        class="base-profile-dropdown__auvexis-account"
        type="button"
        @click="handleAction('auvexis-settings')"
      >
        <span class="base-profile-dropdown__auvexis-avatar" aria-hidden="true">
          <img v-if="auvexisAvatarUrl" :src="auvexisAvatarUrl" alt="" />
          <LucideIcon v-else name="shield-check" :size="17" />
        </span>
        <span class="base-profile-dropdown__auvexis-copy">
          <span class="base-profile-dropdown__auvexis-name">{{ auvexisDisplayName }}</span>
          <span class="base-profile-dropdown__auvexis-username"
            >@{{ auvexisAccount.username }}</span
          >
        </span>
      </button>

      <button
        v-else
        class="base-profile-dropdown__connect"
        type="button"
        @click="handleAction('auvexis-settings')"
      >
        <span class="base-profile-dropdown__connect-icon" aria-hidden="true">
          <LucideIcon name="shield-plus" :size="17" />
        </span>
        <span class="base-profile-dropdown__connect-copy">
          <span>Connect Auvexis</span>
          <small>Open Settings &gt; Auvexis</small>
        </span>
      </button>
    </section>

    <section class="base-profile-dropdown__section" aria-label="Session actions">
      <button
        class="base-profile-dropdown__item"
        type="button"
        @click="handleAction('switch-profile')"
      >
        <LucideIcon name="repeat-2" :size="15" />
        <span>Switch Profile</span>
      </button>
      <button
        class="base-profile-dropdown__item base-profile-dropdown__item--danger"
        type="button"
        @click="handleAction('logout')"
      >
        <LucideIcon name="log-out" :size="15" />
        <span>Logout</span>
      </button>
    </section>
  </AppDropdownMenu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { AuvexisAccountProfile } from '@/core/api/auvexis-account.api'

type ProfileDropdownAction =
  | 'edit-profile'
  | 'settings'
  | 'auvexis-settings'
  | 'switch-profile'
  | 'logout'

const props = defineProps<{
  profileName: string
  avatar: string
  auvexisAccount?: AuvexisAccountProfile | null
}>()

const emit = defineEmits<{
  open: []
  close: []
  action: [action: ProfileDropdownAction]
}>()

const menuRef = ref<InstanceType<typeof AppDropdownMenu> | null>(null)
const isOpen = ref(false)

const auvexisAvatarUrl = computed(
  () =>
    props.auvexisAccount?.avatarUrl ||
    props.auvexisAccount?.profileImageUrl ||
    props.auvexisAccount?.pictureUrl ||
    props.auvexisAccount?.photoUrl ||
    null,
)

const auvexisDisplayName = computed(
  () => props.auvexisAccount?.displayName || props.auvexisAccount?.username || 'Auvexis profile',
)

function close() {
  menuRef.value?.close()
}

function handleOpen() {
  isOpen.value = true
  emit('open')
}

function handleClose() {
  isOpen.value = false
  emit('close')
}

function handleAction(action: ProfileDropdownAction) {
  emit('action', action)
  close()
}
</script>

<style scoped>
.base-profile-dropdown {
  width: fit-content;
  min-width: 0;
}

.base-profile-dropdown :deep(.app-popover-wrapper),
.base-profile-dropdown :deep(.app-popover-trigger) {
  width: fit-content;
  min-width: 0;
}

.base-profile-dropdown :deep(.app-dropdown-menu) {
  width: 300px;
  overflow: hidden;
  border: 1px solid var(--fabric-base-profile-dropdown-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-base-profile-dropdown-bg);
  color: var(--fabric-base-profile-dropdown-text);
  box-shadow: var(--fabric-base-profile-dropdown-shadow);
}

.base-profile-dropdown__identity,
.base-profile-dropdown__section {
  display: flex;
  flex-direction: column;
}

.base-profile-dropdown__identity {
  align-items: center;
  gap: var(--fabric-space-2);
  padding: var(--fabric-space-4) var(--fabric-space-4) var(--fabric-space-3);
  border-bottom: 1px solid var(--fabric-base-profile-dropdown-divider);
}

.base-profile-dropdown__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border: 1px solid var(--fabric-base-profile-dropdown-avatar-border);
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-base-profile-dropdown-avatar-bg);
  color: var(--fabric-base-profile-dropdown-avatar-text);
  font-size: 27px;
  line-height: 1;
}

.base-profile-dropdown__name {
  max-width: 240px;
  overflow: hidden;
  color: var(--fabric-base-profile-dropdown-text);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-profile-dropdown__section {
  gap: 2px;
  padding: var(--fabric-space-2);
  border-bottom: 1px solid var(--fabric-base-profile-dropdown-divider);
}

.base-profile-dropdown__section:last-child {
  border-bottom: 0;
}

.base-profile-dropdown__item,
.base-profile-dropdown__auvexis-account,
.base-profile-dropdown__connect {
  display: flex;
  width: 100%;
  min-width: 0;
  border: 0;
  color: var(--fabric-base-profile-dropdown-item-text);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-profile-dropdown__item {
  align-items: center;
  gap: var(--fabric-space-2);
  min-height: 34px;
  padding: 0 var(--fabric-space-2);
  border-radius: var(--fabric-radius-sm);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-medium);
}

.base-profile-dropdown__item:hover,
.base-profile-dropdown__auvexis-account:hover,
.base-profile-dropdown__connect:hover {
  color: var(--fabric-base-profile-dropdown-item-hover-text);
  background: var(--fabric-base-profile-dropdown-item-hover-bg);
}

.base-profile-dropdown__item--danger {
  color: var(--fabric-base-profile-dropdown-danger-text);
}

.base-profile-dropdown__item--danger:hover {
  color: var(--fabric-base-profile-dropdown-danger-text);
  background: var(--fabric-base-profile-dropdown-danger-bg);
}

.base-profile-dropdown__auvexis-account {
  align-items: center;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-2);
  border-radius: var(--fabric-radius-sm);
}

.base-profile-dropdown__auvexis-avatar,
.base-profile-dropdown__connect-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-base-profile-dropdown-accent-bg);
  color: var(--fabric-base-profile-dropdown-accent-text);
}

.base-profile-dropdown__auvexis-avatar {
  width: 38px;
  height: 38px;
  overflow: hidden;
}

.base-profile-dropdown__auvexis-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.base-profile-dropdown__auvexis-copy,
.base-profile-dropdown__connect-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.base-profile-dropdown__auvexis-name {
  overflow: hidden;
  color: var(--fabric-base-profile-dropdown-text);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-profile-dropdown__auvexis-username {
  overflow: hidden;
  color: var(--fabric-base-profile-dropdown-muted-text);
  font-size: var(--fabric-text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-profile-dropdown__connect {
  align-items: center;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-3);
  border: 1px solid var(--fabric-base-profile-dropdown-connect-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-base-profile-dropdown-connect-bg);
}

.base-profile-dropdown__connect-icon {
  width: 34px;
  height: 34px;
}

.base-profile-dropdown__connect-copy span {
  color: var(--fabric-base-profile-dropdown-text);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
}

.base-profile-dropdown__connect-copy small {
  color: var(--fabric-base-profile-dropdown-muted-text);
  font-size: var(--fabric-text-xs);
}
</style>

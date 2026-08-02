<template>
  <BaseDropdownMenu
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

    <section class="base-profile-dropdown__identity" aria-label="Current profile">
      <span class="base-profile-dropdown__avatar" aria-hidden="true">{{ avatar }}</span>
      <span class="base-profile-dropdown__identity-copy">
        <span class="base-profile-dropdown__eyebrow">Fabric profile</span>
        <span class="base-profile-dropdown__name">{{ profileName }}</span>
      </span>
    </section>

    <section class="base-profile-dropdown__section" aria-label="Profile actions">
      <span class="base-profile-dropdown__section-label">Profile</span>
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
      <span class="base-profile-dropdown__section-label">Auvexis</span>
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
      <span class="base-profile-dropdown__section-label">Session</span>
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
  </BaseDropdownMenu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseDropdownMenu from '@/shared/components/base/dropdown/BaseDropdownMenu.vue'
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

const menuRef = ref<InstanceType<typeof BaseDropdownMenu> | null>(null)
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

.base-profile-dropdown :deep(.base-dropdown-menu) {
  width: 284px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--fabric-base-profile-dropdown-border) 78%, transparent);
  border-radius: var(--fabric-base-profile-dropdown-radius);
  background: var(--fabric-base-profile-dropdown-bg);
  color: var(--fabric-base-profile-dropdown-text);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.26);
}

.base-profile-dropdown__identity,
.base-profile-dropdown__section {
  display: flex;
}

.base-profile-dropdown__identity {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 10px;
  border-bottom: 1px solid var(--fabric-base-profile-dropdown-divider);
}

.base-profile-dropdown__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: 1px solid var(--fabric-base-profile-dropdown-avatar-border);
  border-radius: var(--fabric-base-profile-dropdown-action-radius);
  background: var(--fabric-base-profile-dropdown-avatar-bg);
  color: var(--fabric-base-profile-dropdown-avatar-text);
  font-size: 16px;
  line-height: 1;
}

.base-profile-dropdown__identity-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.base-profile-dropdown__eyebrow,
.base-profile-dropdown__section-label {
  color: var(--fabric-base-profile-dropdown-muted-text);
  font-size: 10px;
  font-weight: var(--fabric-font-semibold);
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
}

.base-profile-dropdown__name {
  max-width: 218px;
  overflow: hidden;
  color: var(--fabric-base-profile-dropdown-text);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-profile-dropdown__section {
  flex-direction: column;
  gap: 2px;
  padding: 5px;
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
  gap: 9px;
  min-height: 30px;
  padding: 0 8px;
  border-radius: var(--fabric-base-profile-dropdown-item-radius);
  font-size: 13px;
  font-weight: var(--fabric-font-medium);
}

.base-profile-dropdown__item svg {
  color: var(--fabric-base-profile-dropdown-muted-text);
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
  gap: 9px;
  min-height: 38px;
  padding: 5px 8px;
  border-radius: var(--fabric-base-profile-dropdown-item-radius);
}

.base-profile-dropdown__auvexis-avatar,
.base-profile-dropdown__connect-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: var(--fabric-base-profile-dropdown-badge-radius);
  background: var(--fabric-base-profile-dropdown-accent-bg);
  color: var(--fabric-base-profile-dropdown-accent-text);
}

.base-profile-dropdown__auvexis-avatar {
  width: 28px;
  height: 28px;
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
  gap: 9px;
  min-height: 42px;
  padding: 6px 8px;
  border: 1px solid var(--fabric-base-profile-dropdown-connect-border);
  border-radius: var(--fabric-base-profile-dropdown-trigger-radius);
  background: var(--fabric-base-profile-dropdown-connect-bg);
}

.base-profile-dropdown__connect-icon {
  width: 28px;
  height: 28px;
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

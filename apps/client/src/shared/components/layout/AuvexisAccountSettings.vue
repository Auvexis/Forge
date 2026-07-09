<template>
  <section class="auvexis-settings">
    <div class="auvexis-settings__card">
      <div class="auvexis-settings__header">
        <div class="auvexis-settings__identity">
          <div class="auvexis-settings__icon">
            <LucideIcon name="shield-check" :size="20" />
          </div>
          <div>
            <h3 class="auvexis-settings__title">Auvexis Account</h3>
            <p class="auvexis-settings__description">
              Connect this Sailor profile to your Auvexis identity.
            </p>
          </div>
        </div>

        <BaseBadge :variant="statusBadgeVariant" size="sm" :icon="statusBadgeIcon">
          {{ statusLabel }}
        </BaseBadge>
      </div>

      <div v-if="accountStore.isLoading" class="auvexis-settings__state">
        <LucideIcon name="loader-2" :size="18" class="auvexis-settings__spin" />
        Loading Auvexis account...
      </div>

      <div v-else class="auvexis-settings__body">
        <div v-if="accountStore.status === 'connected' && accountStore.account" class="auvexis-settings__account">
          <div>
            <span class="auvexis-settings__label">Connected as</span>
            <strong class="auvexis-settings__username">@{{ accountStore.account.username }}</strong>
          </div>

          <div class="auvexis-settings__badges">
            <span
              v-for="badge in accountStore.account.badges"
              :key="badge.id"
              class="auvexis-settings__badge"
              :style="badgeStyle(badge)"
            >
              <img
                v-if="badge.iconUrl"
                class="auvexis-settings__badge-icon"
                :src="badge.iconUrl"
                alt=""
                aria-hidden="true"
              />
              {{ badge.name }}
            </span>
            <span v-if="accountStore.account.badges.length === 0" class="auvexis-settings__muted">
              No badges yet
            </span>
          </div>
        </div>

        <div v-else-if="accountStore.status === 'needs_reconnect'" class="auvexis-settings__notice">
          <LucideIcon name="circle-alert" :size="16" />
          Auvexis needs you to reconnect before Sailor can trust account badges.
        </div>

        <p v-else class="auvexis-settings__empty">
          No Auvexis account is connected to this Sailor profile.
        </p>

        <p v-if="accountStore.error" class="auvexis-settings__error">
          {{ accountStore.error }}
        </p>

        <div class="auvexis-settings__actions">
          <BaseButton
            v-if="accountStore.status !== 'connected'"
            variant="primary"
            :loading="accountStore.isConnecting"
            @click="accountStore.connect"
          >
            <template #left>
              <LucideIcon name="external-link" :size="16" />
            </template>
            {{ accountStore.status === 'needs_reconnect' ? 'Reconnect Auvexis' : 'Connect Auvexis Account' }}
          </BaseButton>

          <BaseButton variant="secondary" :loading="accountStore.isLoading" @click="accountStore.loadStatus">
            <template #left>
              <LucideIcon name="refresh-cw" :size="16" />
            </template>
            Refresh
          </BaseButton>

          <BaseButton
            v-if="accountStore.status !== 'disconnected'"
            variant="danger"
            :loading="accountStore.isDisconnecting"
            @click="accountStore.logout"
          >
            Logout
          </BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import BaseBadge, { type BadgeVariant } from '@/shared/components/base/BaseBadge.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { AuvexisAccountBadge } from '@/core/api/auvexis-account.api'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAuvexisAccountStore } from '@/shared/stores/auvexis-account.store'

const accountStore = useAuvexisAccountStore()

const statusLabel = computed(() => {
  if (accountStore.status === 'connected') return 'Connected'
  if (accountStore.status === 'needs_reconnect') return 'Needs reconnect'
  return 'Disconnected'
})

const statusBadgeVariant = computed<BadgeVariant>(() => {
  if (accountStore.status === 'connected') return 'success'
  if (accountStore.status === 'needs_reconnect') return 'warning'
  return 'outline'
})

const statusBadgeIcon = computed(() => {
  if (accountStore.status === 'connected') return 'check'
  if (accountStore.status === 'needs_reconnect') return 'circle-alert'
  return 'link'
})

const badgeStyle = (badge: AuvexisAccountBadge) => ({
  backgroundColor: badge.style.backgroundColor,
  borderColor: badge.style.borderColor,
  color: badge.style.textColor,
})

onMounted(() => {
  accountStore.loadStatus()
})
</script>

<style scoped>
.auvexis-settings {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-4);
}

.auvexis-settings__card {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-4);
  padding: var(--sailor-space-4);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-muted);
}

.auvexis-settings__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sailor-space-3);
}

.auvexis-settings__identity {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-3);
}

.auvexis-settings__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
  color: var(--sailor-accent);
}

.auvexis-settings__title {
  margin: 0;
  font-size: var(--sailor-text-base);
  color: var(--sailor-text-primary);
}

.auvexis-settings__description,
.auvexis-settings__empty,
.auvexis-settings__muted,
.auvexis-settings__label {
  margin: 0;
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-muted);
}

.auvexis-settings__state,
.auvexis-settings__notice {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-secondary);
}

.auvexis-settings__notice {
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-status-running-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-status-running-bg);
  color: var(--sailor-status-running-text);
}

.auvexis-settings__body,
.auvexis-settings__account {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-3);
}

.auvexis-settings__username {
  display: block;
  margin-top: var(--sailor-space-1);
  color: var(--sailor-text-primary);
}

.auvexis-settings__badges,
.auvexis-settings__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sailor-space-2);
}

.auvexis-settings__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-1);
  min-height: 24px;
  padding: 2px 9px;
  border: 1px solid;
  border-radius: 999px;
  font-size: var(--sailor-text-xs);
  font-weight: 700;
  line-height: 1;
}

.auvexis-settings__badge-icon {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  object-fit: cover;
}

.auvexis-settings__error {
  margin: 0;
  font-size: var(--sailor-text-sm);
  color: var(--sailor-status-error-text);
}

.auvexis-settings__spin {
  animation: auvexis-settings-spin 1s linear infinite;
}

@keyframes auvexis-settings-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

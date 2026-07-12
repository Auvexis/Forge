<template>
  <section class="auvexis-settings">
    <div class="auvexis-settings__hero">
      <div class="auvexis-settings__avatar">
        <LucideIcon name="shield-check" :size="24" />
      </div>

      <div class="auvexis-settings__identity">
        <div class="auvexis-settings__title-row">
          <h3 class="auvexis-settings__title">
            {{ accountStore.account?.username ? `@${accountStore.account.username}` : 'Auvexis Account' }}
          </h3>
          <BaseBadge :variant="statusBadgeVariant" size="sm" :icon="statusBadgeIcon">
            {{ statusLabel }}
          </BaseBadge>
        </div>
        <p class="auvexis-settings__description">
          {{ accountStore.status === 'connected' ? 'Connected to this Fabric profile.' : 'Connect this Fabric profile to your Auvexis identity.' }}
        </p>
      </div>
    </div>

    <div v-if="accountStore.isLoading" class="auvexis-settings__state">
      <LucideIcon name="loader-2" :size="18" class="auvexis-settings__spin" />
      Loading Auvexis account...
    </div>

    <div v-else class="auvexis-settings__body">
      <template v-if="accountStore.status === 'connected' && accountStore.account">
        <div class="auvexis-settings__row">
          <span class="auvexis-settings__label">Username</span>
          <strong class="auvexis-settings__value">@{{ accountStore.account.username }}</strong>
        </div>

        <div class="auvexis-settings__row auvexis-settings__row--stacked">
          <span class="auvexis-settings__label">Badges</span>
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
      </template>

      <div v-else-if="accountStore.status === 'needs_reconnect'" class="auvexis-settings__notice">
        <LucideIcon name="circle-alert" :size="16" />
        Auvexis needs you to reconnect before Fabric can trust account badges.
      </div>

      <div v-else class="auvexis-settings__row">
        <span class="auvexis-settings__label">Connection</span>
        <span class="auvexis-settings__muted">No Auvexis account is connected.</span>
      </div>

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
  gap: 0;
}

.auvexis-settings__hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 24px 18px;
  border-bottom: 1px solid var(--fabric-border);
}

.auvexis-settings__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px solid var(--fabric-border);
  border-radius: 50%;
  background: var(--fabric-bg-surface);
  color: var(--fabric-accent);
  flex: 0 0 auto;
}

.auvexis-settings__identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.auvexis-settings__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.auvexis-settings__title {
  margin: 0;
  color: var(--fabric-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.auvexis-settings__description,
.auvexis-settings__muted,
.auvexis-settings__label {
  margin: 0;
  color: var(--fabric-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.auvexis-settings__state,
.auvexis-settings__notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 24px;
  font-size: 12px;
  color: var(--fabric-text-secondary);
}

.auvexis-settings__notice {
  margin: 0 24px;
  border-top: 1px solid var(--fabric-border);
  border-bottom: 1px solid var(--fabric-border);
  background: transparent;
  color: var(--fabric-status-running-text);
}

.auvexis-settings__body {
  display: flex;
  flex-direction: column;
}

.auvexis-settings__row {
  display: grid;
  grid-template-columns: minmax(120px, 0.4fr) minmax(0, 1fr);
  align-items: center;
  gap: 18px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--fabric-border);
}

.auvexis-settings__row--stacked {
  align-items: flex-start;
}

.auvexis-settings__value {
  color: var(--fabric-text-primary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
}

.auvexis-settings__badges,
.auvexis-settings__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.auvexis-settings__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 9px;
  border: 1px solid;
  border-radius: 999px;
  font-size: var(--fabric-text-xs);
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
  padding: 12px 24px;
  border-bottom: 1px solid var(--fabric-border);
  font-size: 12px;
  color: var(--fabric-status-error-text);
}

.auvexis-settings__actions {
  justify-content: flex-end;
  padding: 16px 24px 0;
}

.auvexis-settings__spin {
  animation: auvexis-settings-spin 1s linear infinite;
}

@media (max-width: 720px) {
  .auvexis-settings__row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .auvexis-settings__actions {
    justify-content: flex-start;
  }
}

@keyframes auvexis-settings-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

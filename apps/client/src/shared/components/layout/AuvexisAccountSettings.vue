<template>
  <section class="auvexis-settings">
    <div class="auvexis-settings__hero">
      <div class="auvexis-settings__avatar">
        <LucideIcon name="shield-check" :size="24" />
      </div>

      <div class="auvexis-settings__identity">
        <div class="auvexis-settings__title-row">
          <h3 class="auvexis-settings__title">
            {{ accountDisplayName }}
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
        <div class="auvexis-settings__profile-grid">
          <div class="auvexis-settings__field">
            <span class="auvexis-settings__label">Display name</span>
            <strong class="auvexis-settings__value">{{ accountDisplayName }}</strong>
          </div>

          <div class="auvexis-settings__field">
            <span class="auvexis-settings__label">Username</span>
            <strong class="auvexis-settings__value">@{{ accountStore.account.username }}</strong>
          </div>

          <div class="auvexis-settings__field auvexis-settings__field--wide">
            <span class="auvexis-settings__label">Email address</span>
            <strong class="auvexis-settings__value">
              {{ accountStore.account.email || 'No email provided' }}
            </strong>
          </div>
        </div>

        <div class="auvexis-settings__badge-section">
          <div>
            <span class="auvexis-settings__label">Badges</span>
            <p class="auvexis-settings__hint">Hover a badge to inspect its details.</p>
          </div>
          <div class="auvexis-settings__badges">
            <span
              v-for="badge in accountStore.account.badges"
              :key="badge.id"
              class="auvexis-settings__badge-wrap"
            >
              <span class="auvexis-settings__badge" :style="badgeStyle(badge)">
                <img
                  v-if="badge.iconUrl"
                  class="auvexis-settings__badge-icon"
                  :src="badge.iconUrl"
                  alt=""
                  aria-hidden="true"
                />
                {{ badge.name }}
              </span>
              <span class="auvexis-settings__badge-hint">
                <strong>{{ badge.name }}</strong>
                <span v-if="badge.description">{{ badge.description }}</span>
                <span>Awarded {{ formatBadgeDate(badge.awardedAt) }}</span>
              </span>
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

      <div v-else class="auvexis-settings__empty-state">
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

const accountDisplayName = computed(() => {
  const account = accountStore.account
  return account?.displayName || account?.username || 'Auvexis Account'
})

const badgeStyle = (badge: AuvexisAccountBadge) => ({
  backgroundColor: badge.style.backgroundColor,
  borderColor: badge.style.borderColor,
  color: badge.style.textColor,
})

function formatBadgeDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

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
  padding: 10px 24px 18px;
}

.auvexis-settings__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px solid var(--fabric-border-muted);
  border-radius: 50%;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--fabric-accent) 18%, transparent), transparent),
    var(--fabric-bg-surface);
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
.auvexis-settings__label,
.auvexis-settings__hint {
  margin: 0;
  color: var(--fabric-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.auvexis-settings__label {
  font-weight: 500;
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
  border-top: 1px solid var(--fabric-border-muted);
  border-bottom: 1px solid var(--fabric-border-muted);
  background: transparent;
  color: var(--fabric-status-running-text);
}

.auvexis-settings__body {
  display: flex;
  flex-direction: column;
}

.auvexis-settings__profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 8px 24px 18px;
}

.auvexis-settings__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.auvexis-settings__field--wide {
  grid-column: 1 / -1;
}

.auvexis-settings__badge-section,
.auvexis-settings__empty-state {
  display: grid;
  grid-template-columns: minmax(120px, 0.4fr) minmax(0, 1fr);
  align-items: flex-start;
  gap: 18px;
  padding: 16px 24px;
  border-top: 1px solid var(--fabric-border-muted);
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

.auvexis-settings__badge-wrap {
  position: relative;
  display: inline-flex;
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
  cursor: default;
}

.auvexis-settings__badge-icon {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  object-fit: cover;
}

.auvexis-settings__badge-hint {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  z-index: var(--fabric-z-tooltip);
  display: flex;
  width: 240px;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-overlay);
  box-shadow: var(--fabric-shadow-lg);
  color: var(--fabric-text-secondary);
  font-size: 12px;
  line-height: 1.4;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity var(--fabric-duration-fast) var(--fabric-ease-standard),
    transform var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.auvexis-settings__badge-hint strong {
  color: var(--fabric-text-primary);
  font-size: 13px;
}

.auvexis-settings__badge-wrap:hover .auvexis-settings__badge-hint {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.auvexis-settings__error {
  margin: 0;
  padding: 12px 24px;
  border-top: 1px solid var(--fabric-border-muted);
  font-size: 12px;
  color: var(--fabric-status-error-text);
}

.auvexis-settings__actions {
  justify-content: flex-end;
  padding: 18px 24px 0;
}

.auvexis-settings__spin {
  animation: auvexis-settings-spin 1s linear infinite;
}

@media (max-width: 720px) {
  .auvexis-settings__profile-grid,
  .auvexis-settings__badge-section,
  .auvexis-settings__empty-state {
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

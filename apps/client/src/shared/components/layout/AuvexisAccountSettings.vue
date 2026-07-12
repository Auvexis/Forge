<template>
  <section class="auvexis-settings">
    <div class="auvexis-settings__cover" aria-hidden="true"></div>

    <div class="auvexis-settings__hero">
      <div class="auvexis-settings__avatar">
        <img
          v-if="accountAvatarUrl"
          class="auvexis-settings__avatar-image"
          :src="accountAvatarUrl"
          alt=""
          aria-hidden="true"
        />
        <LucideIcon v-else name="user-round" :size="30" />
      </div>

      <div class="auvexis-settings__hero-actions">
        <BaseButton variant="secondary" size="sm" :loading="accountStore.isLoading" @click="accountStore.loadStatus">
          <template #left>
            <LucideIcon name="refresh-cw" :size="15" />
          </template>
          Refresh
        </BaseButton>

        <BaseButton
          v-if="accountStore.status !== 'disconnected'"
          variant="danger"
          size="sm"
          :loading="accountStore.isDisconnecting"
          @click="accountStore.logout"
        >
          Logout
        </BaseButton>
      </div>
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
        {{ accountEmailLabel }}
      </p>
    </div>

    <div v-if="accountStore.isLoading" class="auvexis-settings__state">
      <LucideIcon name="loader-2" :size="18" class="auvexis-settings__spin" />
      Loading Auvexis account...
    </div>

    <div v-else class="auvexis-settings__body">
      <template v-if="accountStore.status === 'connected' && accountStore.account">
        <div class="auvexis-settings__metrics">
          <div class="auvexis-settings__metric">
            <span>Status</span>
            <strong>{{ statusLabel }}</strong>
          </div>
          <div class="auvexis-settings__metric">
            <span>Badges</span>
            <strong>{{ badgeCountLabel }}</strong>
          </div>
          <div class="auvexis-settings__metric">
            <span>Last validated</span>
            <strong>{{ lastValidatedLabel }}</strong>
          </div>
        </div>

        <div class="auvexis-settings__rows">
          <div class="auvexis-settings__row">
            <span class="auvexis-settings__label">Name</span>
            <div class="auvexis-settings__row-controls auvexis-settings__row-controls--split">
              <div class="auvexis-settings__control">{{ accountNameParts.firstName }}</div>
              <div class="auvexis-settings__control">{{ accountNameParts.lastName }}</div>
            </div>
          </div>

          <div class="auvexis-settings__row">
            <span class="auvexis-settings__label">Email address</span>
            <div class="auvexis-settings__row-controls">
              <div class="auvexis-settings__control auvexis-settings__control--with-icon">
                <LucideIcon name="mail" :size="16" />
                <span>{{ accountEmailLabel }}</span>
              </div>
              <div class="auvexis-settings__verified">
                <LucideIcon name="badge-check" :size="14" />
                Verified by Auvexis
              </div>
            </div>
          </div>

          <div class="auvexis-settings__row">
            <span class="auvexis-settings__label">Username</span>
            <div class="auvexis-settings__row-controls">
              <div class="auvexis-settings__control auvexis-settings__username-control">
                <span class="auvexis-settings__username-prefix">auvexis.com/</span>
                <span>{{ accountStore.account.username }}</span>
                <LucideIcon name="badge-check" :size="15" />
              </div>
            </div>
          </div>

          <div class="auvexis-settings__row auvexis-settings__row--top">
            <span class="auvexis-settings__label">Badges</span>
            <div class="auvexis-settings__row-controls">
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

const accountAvatarUrl = computed(() => {
  const account = accountStore.account
  return account?.avatarUrl || account?.profileImageUrl || account?.pictureUrl || account?.photoUrl || null
})

const accountEmailLabel = computed(() => accountStore.account?.email || 'No email provided')

const accountNameParts = computed(() => {
  const parts = accountDisplayName.value.trim().split(/\s+/).filter(Boolean)
  const firstName = parts.shift() || accountStore.account?.username || 'Auvexis'
  const lastName = parts.join(' ')

  return {
    firstName,
    lastName: lastName || '-',
  }
})

const badgeCountLabel = computed(() => {
  const count = accountStore.account?.badges.length ?? 0
  return count === 1 ? '1 badge' : `${count} badges`
})

const lastValidatedLabel = computed(() => {
  if (!accountStore.lastValidatedAt) return '-'
  return formatBadgeDate(accountStore.lastValidatedAt)
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

.auvexis-settings__cover {
  height: 96px;
  margin: 0 18px;
  border: 1px solid var(--fabric-border-muted);
  border-radius: 14px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--fabric-accent) 18%, transparent), transparent 42%),
    linear-gradient(160deg, var(--fabric-bg-muted), var(--fabric-bg-surface) 48%, color-mix(in srgb, var(--fabric-accent) 12%, var(--fabric-bg-surface)));
}

.auvexis-settings__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-top: -36px;
  padding: 0 34px 12px;
}

.auvexis-settings__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  overflow: hidden;
  border: 3px solid var(--fabric-bg-base);
  border-radius: 50%;
  background: var(--fabric-bg-surface);
  box-shadow: 0 0 0 1px var(--fabric-border);
  color: var(--fabric-text-muted);
  flex: 0 0 auto;
}

.auvexis-settings__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auvexis-settings__hero-actions,
.auvexis-settings__badges,
.auvexis-settings__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.auvexis-settings__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 0 34px 14px;
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
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.auvexis-settings__description,
.auvexis-settings__muted,
.auvexis-settings__label {
  margin: 0;
  color: var(--fabric-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.auvexis-settings__label {
  color: var(--fabric-text-primary);
  font-weight: 600;
}

.auvexis-settings__state,
.auvexis-settings__notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 34px;
  font-size: 12px;
  color: var(--fabric-text-secondary);
}

.auvexis-settings__notice {
  margin: 0 34px;
  border-top: 1px solid var(--fabric-border-muted);
  border-bottom: 1px solid var(--fabric-border-muted);
  background: transparent;
  color: var(--fabric-status-running-text);
}

.auvexis-settings__body,
.auvexis-settings__rows {
  display: flex;
  flex-direction: column;
}

.auvexis-settings__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding: 2px 34px 14px;
}

.auvexis-settings__metric {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding-right: 14px;
}

.auvexis-settings__metric + .auvexis-settings__metric {
  padding-left: 14px;
  border-left: 1px solid var(--fabric-border-muted);
}

.auvexis-settings__metric span {
  color: var(--fabric-text-muted);
  font-size: 12px;
  line-height: 1.2;
}

.auvexis-settings__metric strong {
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auvexis-settings__rows {
  padding: 0 34px;
}

.auvexis-settings__row,
.auvexis-settings__empty-state {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-top: 1px solid var(--fabric-border-muted);
}

.auvexis-settings__row--top {
  align-items: flex-start;
}

.auvexis-settings__row-controls {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.auvexis-settings__row-controls--split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.auvexis-settings__control {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 36px;
  padding: 0 12px;
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-surface);
  color: var(--fabric-text-primary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auvexis-settings__control--with-icon {
  gap: 8px;
}

.auvexis-settings__control--with-icon svg {
  color: var(--fabric-text-muted);
  flex: 0 0 auto;
}

.auvexis-settings__verified {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  color: var(--fabric-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.auvexis-settings__username-control {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0;
  padding: 0;
}

.auvexis-settings__username-control > span,
.auvexis-settings__username-control > svg {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
}

.auvexis-settings__username-control > span:nth-child(2) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.auvexis-settings__username-control > svg {
  padding-left: 6px;
  color: var(--fabric-accent);
}

.auvexis-settings__username-prefix {
  border-right: 1px solid var(--fabric-border-muted);
  background: var(--fabric-bg-muted);
  color: var(--fabric-text-muted);
}

.auvexis-settings__badge-wrap {
  position: relative;
  display: inline-flex;
}

.auvexis-settings__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 25px;
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

.auvexis-settings__empty-state {
  margin: 0 34px;
}

.auvexis-settings__error {
  margin: 0;
  padding: 12px 34px;
  border-top: 1px solid var(--fabric-border-muted);
  font-size: 12px;
  color: var(--fabric-status-error-text);
}

.auvexis-settings__actions {
  justify-content: flex-end;
  padding: 16px 34px 0;
}

.auvexis-settings__spin {
  animation: auvexis-settings-spin 1s linear infinite;
}

@media (max-width: 720px) {
  .auvexis-settings__cover {
    margin: 0 14px;
  }

  .auvexis-settings__hero,
  .auvexis-settings__identity,
  .auvexis-settings__metrics,
  .auvexis-settings__rows,
  .auvexis-settings__state,
  .auvexis-settings__error,
  .auvexis-settings__actions {
    padding-right: 20px;
    padding-left: 20px;
  }

  .auvexis-settings__hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .auvexis-settings__metrics,
  .auvexis-settings__row,
  .auvexis-settings__empty-state {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .auvexis-settings__metric + .auvexis-settings__metric {
    padding-left: 0;
    border-left: 0;
  }

  .auvexis-settings__row-controls--split {
    grid-template-columns: 1fr;
  }

  .auvexis-settings__empty-state,
  .auvexis-settings__notice {
    margin-right: 20px;
    margin-left: 20px;
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

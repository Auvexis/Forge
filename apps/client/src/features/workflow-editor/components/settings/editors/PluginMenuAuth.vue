<template>
  <main class="plugin-auth">
    <header class="plugin-auth__header">
      <div class="plugin-auth__icon-well">
        <LucideIcon name="settings" class="plugin-auth__icon" size="24" />
      </div>
      <div class="plugin-auth__title-area">
        <h1 class="plugin-auth__title">Base Settings</h1>
        <div class="plugin-auth__status">
          <template v-if="pluginStatus?.status === 'connected'">
            <LucideIcon name="check-circle-2" class="status-icon status-icon--success" size="14" />
            <span>Connected</span>
          </template>
          <template v-else-if="pluginStatus?.status === 'configured'">
            <LucideIcon name="alert-circle" class="status-icon status-icon--warning" size="14" />
            <span>Credentials saved. Connect to authenticate.</span>
          </template>
          <template v-else-if="pluginStatus?.status === 'not_configured'">
            <LucideIcon name="alert-circle" class="status-icon status-icon--error" size="14" />
            <span>Not configured</span>
          </template>
        </div>
      </div>
    </header>

    <section v-if="pluginStatus?.auth_type === 'oauth2' && pluginStatus?.oauth_redirect_uri" class="plugin-auth__section plugin-auth__section--oauth-info">
      <div class="oauth-redirect-block">
        <label class="auth-field__label">OAuth Redirect URL</label>
        <BaseInput
          :model-value="pluginStatus.oauth_redirect_uri"
          readonly
          @click="$event.target.select()"
        />
        <p
          v-if="pluginStatus?.oauth_ui?.oauthCallbackInstructions"
          class="auth-field__desc mt-1"
        >
          {{ pluginStatus.oauth_ui.oauthCallbackInstructions }}
        </p>
        <div v-if="pluginStatus.oauth_public_url_required" class="oauth-warning">
          <LucideIcon name="circle-alert" size="14" />
          <span>
            {{
              pluginStatus.oauth_public_url_warning ||
              'OAuth needs a public HTTPS URL. Set Public URL in Settings or PUBLIC_URL on the Fabric server before connecting.'
            }}
          </span>
        </div>
      </div>
    </section>

    <section v-if="pluginStatus?.credential_schema" class="plugin-auth__section">
      <form class="plugin-auth__form" @submit.prevent="handleSaveCredentials">
        <div v-for="(field, key) in pluginStatus.credential_schema" :key="key" class="auth-field">
          <label :for="key.toString()" class="auth-field__label">
            {{ field.label }}
            <span v-if="field.required && !isLocked(key.toString())" class="auth-field__asterisk"
              >*</span
            >
            <span v-if="isLocked(key.toString())" class="auth-field__locked-badge">
              <LucideIcon name="lock" size="10" />
              ENV
            </span>
          </label>
          <p v-if="field.description" class="auth-field__desc">{{ field.description }}</p>

          <!-- Locked Input -->
          <div v-if="isLocked(key.toString())" class="auth-field__locked-input">
            <LucideIcon name="lock" size="14" class="text-emerald" />
            <span class="text-xs">Configured through an environment variable</span>
          </div>

          <!-- Toggle Input -->
          <div v-else-if="(field as any).inputType === 'toggle'" class="auth-field__toggle">
            <BaseSwitch v-model="formValues[key]" />
            <span class="auth-field__toggle-text">{{
              formValues[key] ? 'Enabled' : 'Disabled'
            }}</span>
          </div>

          <!-- Textarea -->
          <BaseInput
            v-else-if="field.inputType === 'textarea'"
            :id="key.toString()"
            type="text"
            :placeholder="field.placeholder"
            :required="field.required"
            :model-value="formValues[key] as string"
            @update:model-value="formValues[key] = $event"
          />

          <!-- Default Input -->
          <BaseInput
            v-else
            :id="key.toString()"
            :type="field.inputType"
            :placeholder="field.placeholder"
            :required="field.required"
            :model-value="formValues[key] as string"
            @update:model-value="formValues[key] = $event"
          />
        </div>

        <button type="submit" class="auth-btn auth-btn--primary auth-btn--mt" :disabled="saving">
          <LucideIcon v-if="saving" name="loader-2" size="16" class="animate-spin mr-2" />
          {{ pluginStatus?.auth_type === 'none' ? 'Save Settings' : 'Save Credentials' }}
        </button>
      </form>
    </section>

    <!-- OAuth buttons -->
    <section
      v-if="pluginStatus?.auth_type === 'oauth2'"
      class="plugin-auth__section plugin-auth__section--oauth"
      >
      <p v-if="awaitingOAuthReturn" class="auth-field__desc auth-field__desc--oauth-waiting">
        Waiting for authorization. Return here after finishing in the new tab.
      </p>

      <a
        v-if="pluginStatus.status === 'configured'"
        :href="pluginStatus.oauth_public_url_required ? undefined : authConnectUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="auth-btn auth-btn--secondary auth-btn--full"
        :class="{ 'auth-btn--disabled': authLoading || pluginStatus.oauth_public_url_required }"
        :aria-disabled="authLoading || pluginStatus.oauth_public_url_required"
        @click="handleOAuthLinkClick"
      >
        <LucideIcon v-if="authLoading" name="loader-2" size="16" class="animate-spin mr-2" />
        <template v-else>
           <img v-if="pluginStatus.oauth_ui?.buttonIcon?.startsWith('http')" :src="pluginStatus.oauth_ui.buttonIcon" class="oauth-icon mr-2" />
           <LucideIcon v-else-if="pluginStatus.oauth_ui?.buttonIcon" :name="pluginStatus.oauth_ui.buttonIcon" size="16" class="mr-2" />
           <LucideIcon v-else name="external-link" size="16" class="mr-2" />
        </template>
        {{ pluginStatus.oauth_ui?.buttonText || 'Connect with OAuth2' }}
      </a>

      <button
        v-if="awaitingOAuthReturn"
        class="auth-btn auth-btn--secondary auth-btn--full"
        @click="checkConnection"
      >
        <LucideIcon name="refresh-cw" size="16" class="mr-2" />
        Check connection
      </button>

      <button
        v-if="pluginStatus.status === 'connected'"
        class="auth-btn auth-btn--destructive auth-btn--full"
        @click="handleDisconnect"
      >
        <LucideIcon name="log-out" size="16" class="mr-2" />
        Disconnect
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { usePluginAuth } from '@/shared/composables/usePluginAuth'
import BaseInput from '@/shared/components/base/BaseInput.vue'

const props = defineProps<{
  pluginId: string
}>()

const {
  pluginStatus,
  formValues,
  saving,
  authLoading,
  awaitingOAuthReturn,
  authConnectUrl,
  loadStatus,
  isLocked,
  handleSaveCredentials,
  markOAuthOpened,
  handleDisconnect,
  checkConnection
} = usePluginAuth(() => props.pluginId)

onMounted(() => {
  loadStatus()
})

watch(
  () => props.pluginId,
  () => {
    formValues.value = {}
    loadStatus()
  },
)

function handleOAuthLinkClick(event: MouseEvent) {
  if (!markOAuthOpened()) {
    event.preventDefault()
  }
}
</script>

<style scoped>
.plugin-auth {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-4);
  padding: var(--fabric-space-1);
}

.plugin-auth__header {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-3);
}

.plugin-auth__icon-well {
  width: 40px;
  height: 40px;
  border: 1px solid var(--fabric-plugin-menu-auth-border);
  border-radius: var(--fabric-radius-lg);
  display: flex;
  justify-content: center;
  align-items: center;
}

.plugin-auth__icon {
  color: var(--fabric-plugin-menu-auth-text-muted);
}

.plugin-auth__title {
  font-size: var(--fabric-text-base);
  font-weight: 600;
  margin: 0 0 var(--fabric-space-1) 0;
  color: var(--fabric-plugin-menu-auth-text-primary);
}

.plugin-auth__status {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-1);
  font-size: var(--fabric-text-xs);
  color: var(--fabric-plugin-menu-auth-text-muted);
}

.status-icon--success {
  color: rgb(34, 197, 94);
}
.status-icon--warning {
  color: rgb(234, 179, 8);
}
.status-icon--error {
  color: rgb(239, 68, 68);
}

.plugin-auth__section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.plugin-auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-4);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-1);
}

.auth-field__label {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-1);
  font-size: var(--fabric-text-sm);
  font-weight: 500;
  color: var(--fabric-plugin-menu-auth-text-primary);
}

.auth-field__asterisk {
  color: rgb(239, 68, 68);
}

.auth-field__locked-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: rgb(16, 185, 129);
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 2px 6px;
  border-radius: 9999px;
  margin-left: auto;
}

.auth-field__desc {
  font-size: var(--fabric-text-xs);
  color: var(--fabric-plugin-menu-auth-text-muted);
  margin: 0 0 var(--fabric-space-1) 0;
}

.auth-field__locked-input {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  padding: 0 var(--fabric-space-3);
  height: 40px;
  border-radius: var(--fabric-radius-md);
  border: 1px solid var(--fabric-plugin-menu-auth-border);
  background-color: var(--fabric-plugin-menu-auth-bg-muted);
  color: var(--fabric-plugin-menu-auth-text-muted);
}

.text-emerald {
  color: rgb(16, 185, 129);
}

.auth-field__toggle {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  height: 40px;
}

.auth-field__toggle-text {
  font-size: var(--fabric-text-xs);
  color: var(--fabric-plugin-menu-auth-text-muted);
  font-style: italic;
}


/* Buttons */
.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: var(--fabric-radius-md);
  font-size: var(--fabric-text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--fabric-duration-fast);
  border: none;
}

.auth-btn--primary {
  border: 1px solid var(--fabric-plugin-menu-auth-border);
  color: var(--fabric-plugin-menu-auth-text-primary);
}

.auth-btn--primary:hover {
  opacity: 0.9;
}

.auth-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.auth-btn--secondary {
  background-color: var(--fabric-plugin-menu-auth-bg-surface);
  color: var(--fabric-plugin-menu-auth-text-primary);
  border: 1px solid var(--fabric-plugin-menu-auth-border);
}

.auth-btn--secondary:hover {
  background-color: var(--fabric-plugin-menu-auth-bg-muted);
}

.auth-btn--destructive {
  background-color: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

.auth-btn--destructive:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

.auth-btn--mt {
  margin-top: var(--fabric-space-2);
}

.auth-btn--full {
  width: 100%;
}

.mr-2 {
  margin-right: var(--fabric-space-2);
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.oauth-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.plugin-auth__section--oauth-info {
  margin-bottom: var(--fabric-space-2);
  padding: var(--fabric-space-3);
  background: var(--fabric-plugin-menu-auth-bg-surface);
  border: 1px solid var(--fabric-plugin-menu-auth-border);
  border-radius: var(--fabric-radius-md);
}
.oauth-redirect-block {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
}
.oauth-warning {
  display: flex;
  align-items: flex-start;
  gap: var(--fabric-space-2);
  padding: var(--fabric-space-2);
  border: 1px solid rgba(234, 179, 8, 0.25);
  border-radius: var(--fabric-radius-md);
  background: rgba(234, 179, 8, 0.08);
  color: rgb(234, 179, 8);
  font-size: var(--fabric-text-xs);
  line-height: 1.4;
}
.oauth-warning svg {
  flex: 0 0 auto;
  margin-top: 1px;
}
.mt-1 {
  margin-top: var(--fabric-space-1);
}
</style>

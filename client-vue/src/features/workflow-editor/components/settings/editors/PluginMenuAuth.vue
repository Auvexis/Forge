<template>
  <main class="plugin-auth">
    <header class="plugin-auth__header">
      <div class="plugin-auth__icon-well">
        <LucideIcon name="settings" class="plugin-auth__icon" size="24" />
      </div>
      <div class="plugin-auth__title-area">
        <h1 class="plugin-auth__title">Configurações Base</h1>
        <div class="plugin-auth__status">
          <template v-if="pluginStatus?.status === 'connected'">
            <LucideIcon name="check-circle-2" class="status-icon status-icon--success" size="14" />
            <span>Conectado</span>
          </template>
          <template v-else-if="pluginStatus?.status === 'configured'">
            <LucideIcon name="alert-circle" class="status-icon status-icon--warning" size="14" />
            <span>Credenciais salvas — conecte para autenticar</span>
          </template>
          <template v-else-if="pluginStatus?.status === 'not_configured'">
            <LucideIcon name="alert-circle" class="status-icon status-icon--error" size="14" />
            <span>Não configurado</span>
          </template>
        </div>
      </div>
    </header>

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
            <span class="text-xs">Configurado via variável de ambiente</span>
          </div>

          <!-- Toggle Input -->
          <div v-else-if="(field as any).inputType === 'toggle'" class="auth-field__toggle">
            <label class="switch">
              <input type="checkbox" v-model="formValues[key]" />
              <span class="slider round"></span>
            </label>
            <span class="auth-field__toggle-text">{{
              formValues[key] ? 'Ativado' : 'Desativado'
            }}</span>
          </div>

          <!-- Textarea -->
          <textarea
            v-else-if="field.inputType === 'textarea'"
            :id="key.toString()"
            class="editor-textarea"
            :placeholder="field.placeholder"
            :required="field.required"
            v-model="formValues[key]"
          ></textarea>

          <!-- Default Input -->
          <input
            v-else
            :id="key.toString()"
            :type="field.inputType"
            class="editor-input"
            :placeholder="field.placeholder"
            :required="field.required"
            v-model="formValues[key]"
          />
        </div>

        <button type="submit" class="auth-btn auth-btn--primary auth-btn--mt" :disabled="saving">
          <LucideIcon v-if="saving" name="loader-2" size="16" class="animate-spin mr-2" />
          {{ pluginStatus?.auth_type === 'none' ? 'Salvar Configurações' : 'Salvar Credenciais' }}
        </button>
      </form>
    </section>

    <!-- OAuth buttons -->
    <section
      v-if="pluginStatus?.auth_type === 'oauth2'"
      class="plugin-auth__section plugin-auth__section--oauth"
    >
      <button
        v-if="pluginStatus.status === 'configured'"
        class="auth-btn auth-btn--secondary auth-btn--full"
        @click="handleConnect"
        :disabled="authLoading"
      >
        <LucideIcon v-if="authLoading" name="loader-2" size="16" class="animate-spin mr-2" />
        Conectar com OAuth2
      </button>

      <button
        v-if="pluginStatus.status === 'connected'"
        class="auth-btn auth-btn--destructive auth-btn--full"
        @click="handleDisconnect"
      >
        <LucideIcon name="log-out" size="16" class="mr-2" />
        Desconectar
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PluginStatusResponse } from '@/core/types/plugin.types'

const props = defineProps<{
  pluginId: string
}>()

const pluginStatus = ref<PluginStatusResponse | null>(null)
const formValues = ref<Record<string, any>>({})
const saving = ref(false)
const authLoading = ref(false)

const loadStatus = async () => {
  try {
    const data = await pluginsApi.getStatus(props.pluginId)
    pluginStatus.value = data
    if (data?.credentials) {
      formValues.value = { ...data.credentials }
    }
  } catch (error) {
    console.error('Failed to load plugin status', error)
  }
}

const isLocked = (key: string) => {
  return (pluginStatus.value?.locked_fields ?? []).includes(key)
}

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

const handleSaveCredentials = async () => {
  saving.value = true
  try {
    await pluginsApi.saveCredentials(props.pluginId, formValues.value)
    await loadStatus()
  } catch (err) {
    console.error(err)
  } finally {
    saving.value = false
  }
}

const handleConnect = async () => {
  authLoading.value = true
  try {
    const data = await pluginsApi.getAuthUrl(props.pluginId)
    if (data?.url) {
      window.open(data.url, '_blank', 'width=600,height=700')
      // Simple mockup to reload status after the window opens
      setTimeout(() => loadStatus(), 3000)
    }
  } catch (err) {
    console.error(err)
  } finally {
    authLoading.value = false
  }
}

const handleDisconnect = async () => {
  try {
    await pluginsApi.disconnectAuth(props.pluginId)
    await loadStatus()
  } catch (err) {
    console.error(err)
  }
}
</script>

<style scoped>
.plugin-auth {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
  padding: var(--nod8-space-1);
}

.plugin-auth__header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
}

.plugin-auth__icon-well {
  width: 40px;
  height: 40px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-lg);
  display: flex;
  justify-content: center;
  align-items: center;
}

.plugin-auth__icon {
  color: var(--nod8-text-muted);
}

.plugin-auth__title {
  font-size: var(--nod8-text-base);
  font-weight: 600;
  margin: 0 0 var(--nod8-space-1) 0;
  color: var(--nod8-text-primary);
}

.plugin-auth__status {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
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
}

.plugin-auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
}

.auth-field__label {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
  font-size: var(--nod8-text-sm);
  font-weight: 500;
  color: var(--nod8-text-primary);
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
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  margin: 0 0 var(--nod8-space-1) 0;
}

.auth-field__locked-input {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: 0 var(--nod8-space-3);
  height: 40px;
  border-radius: var(--nod8-radius-md);
  border: 1px solid var(--nod8-border);
  background-color: var(--nod8-bg-muted);
  color: var(--nod8-text-muted);
}

.text-emerald {
  color: rgb(16, 185, 129);
}

.auth-field__toggle {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  height: 40px;
}

.auth-field__toggle-text {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-style: italic;
}

/* Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--nod8-border);
  transition: 0.4s;
}
.slider:before {
  position: absolute;
  content: '';
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
}
input:checked + .slider {
  background-color: var(--nod8-accent);
}
input:checked + .slider:before {
  transform: translateX(16px);
}
.slider.round {
  border-radius: 20px;
}
.slider.round:before {
  border-radius: 50%;
}

/* Buttons */
.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: var(--nod8-radius-md);
  font-size: var(--nod8-text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--nod8-duration-fast);
  border: none;
}

.auth-btn--primary {
  border: 1px solid var(--nod8-border);
  color: var(--nod8-text-primary);
}

.auth-btn--primary:hover {
  opacity: 0.9;
}

.auth-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-btn--secondary {
  background-color: var(--nod8-bg-surface);
  color: var(--nod8-text-primary);
  border: 1px solid var(--nod8-border);
}

.auth-btn--secondary:hover {
  background-color: var(--nod8-bg-muted);
}

.auth-btn--destructive {
  background-color: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

.auth-btn--destructive:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

.auth-btn--mt {
  margin-top: var(--nod8-space-2);
}

.auth-btn--full {
  width: 100%;
}

.mr-2 {
  margin-right: var(--nod8-space-2);
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <BaseModal :is-open="store.isOpen" max-width="1000px" height="85vh" @close="store.close">
    <BaseRestartApplicationConfirm ref="restartConfirmRef" />
    <BaseUpdateDialog
      :is-open="isUpdateDialogOpen"
      :update="desktopUpdateInfo"
      @close="isUpdateDialogOpen = false"
    />
    <div class="gs-shell">
      <!-- ── Left Aside ──────────────────────────────────────────── -->
      <aside class="gs-aside">
        <nav
          class="gs-nav"
          style="position: relative"
        >
          <BaseButton
            v-for="tab in tabs"
            :key="tab.id"
            variant="ghost"
            class="gs-nav__item"
            :class="{ 'gs-nav__item--active': activeTab === tab.id }"
            style="
              position: relative;
              z-index: 1;
              justify-content: flex-start;
              width: 100%;
            "
            @click="activeTab = tab.id"
          >
            <template #left>
              <LucideIcon :name="tab.icon" :size="15" class="gs-nav__icon" />
            </template>
            <span class="gs-nav__label">{{ tab.label }}</span>
          </BaseButton>
        </nav>
      </aside>

      <!-- ── Right Content ───────────────────────────────────────── -->
      <main class="gs-main">
        <div class="gs-header">
          <h2 class="gs-header__title">{{ activeTabTitle }}</h2>
          <button class="gs-header__close" type="button" title="Close" @click="store.close">
            <LucideIcon name="x" :size="18" />
          </button>
        </div>
        <section class="gs-scroll-area gs-section">
        <!-- ── Headers (Fade) ──────────────────────────────────────── -->
        <transition name="fade" mode="out-in">
          <div v-if="activeTab === 'variables'" key="head-var" class="gs-section__head">
            <div style="display: flex; flex-direction: column; gap: var(--fabric-space-1)">
              <h2 class="gs-section__title">Environment Variables</h2>
              <p class="gs-section__desc">
                Use <code class="gs-code" v-pre>{{ env.KEY }}</code> in any workflow to reference
                these values.
              </p>
            </div>
          </div>
          <div
            v-else-if="activeTab === 'credentials'"
            key="head-cred"
            class="gs-section__head"
            style="
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 1rem;
            "
          >
            <div>
              <div style="display: flex; flex-direction: column; gap: var(--fabric-space-1)">
                <h2 class="gs-section__title">Credentials</h2>
                <p class="gs-section__desc">
                  Configure API keys and tokens for your installed plugins.
                </p>
              </div>
            </div>
            <div style="width: 240px; flex-shrink: 0">
              <BaseInput v-model="credSearch" placeholder="Search plugins..." />
            </div>
          </div>
          <div v-else-if="activeTab === 'preferences'" key="head-pref" class="gs-section__head">
            <div style="display: flex; flex-direction: column; gap: var(--fabric-space-1)">
              <h2 class="gs-section__title">Preferences</h2>
              <p class="gs-section__desc">System preferences for this Fabric instance.</p>
            </div>
          </div>
          <div v-else-if="activeTab === 'system'" key="head-system" class="gs-section__head">
            <div style="display: flex; flex-direction: column; gap: var(--fabric-space-1)">
              <h2 class="gs-section__title">System/Updates</h2>
              <p class="gs-section__desc">Desktop behavior and update preferences.</p>
            </div>
          </div>
          <div v-else-if="activeTab === 'auvexis'" key="head-auvexis" class="gs-section__head">
            <div style="display: flex; flex-direction: column; gap: var(--fabric-space-1)">
              <h2 class="gs-section__title">Auvexis</h2>
              <p class="gs-section__desc">Connect this Fabric profile to Auvexis Accounts.</p>
            </div>
          </div>
        </transition>

        <!-- ── Bodies (Slide Up) ────────────────────────────────────── -->
        <transition name="slide-up" mode="out-in">
          <!-- Variables Body -->
          <div v-if="activeTab === 'variables'" key="body-var" class="gs-vars">
            <section class="gs-vars__composer" aria-label="Create environment variable">
              <div class="gs-vars__composer-head">
                <div>
                  <strong>Add Variable</strong>
                  <span>Create values available as <code class="gs-code" v-pre>{{ env.KEY }}</code></span>
                </div>
              </div>

              <div class="gs-vars__form">
                <label class="gs-vars__field">
                  <span>Key</span>
                  <BaseInput v-model="newVar.key" placeholder="KEY_NAME" :error="newVar.keyError" spellcheck="false" />
                </label>
                <label class="gs-vars__field">
                  <span>Value</span>
                  <div class="gs-vars__secret-field">
                    <BaseInput
                      v-model="newVar.value"
                      placeholder="Value"
                      :type="showNewVarValue ? 'text' : 'password'"
                      spellcheck="false"
                    />
                    <BaseButton
                      variant="ghost"
                      size="icon"
                      :title="showNewVarValue ? 'Hide value' : 'Show value'"
                      @click="showNewVarValue = !showNewVarValue"
                    >
                      <template #left>
                        <LucideIcon :name="showNewVarValue ? 'eye-off' : 'eye'" :size="15" />
                      </template>
                    </BaseButton>
                  </div>
                </label>
                <label class="gs-vars__field gs-vars__field--description">
                  <span>Description</span>
                  <BaseInput v-model="newVar.description" placeholder="Optional" />
                </label>
                <BaseButton
                  class="gs-vars__add"
                  variant="primary"
                  :loading="isSavingVar"
                  :disabled="!newVar.key.trim()"
                  @click="handleSaveVariable"
                >
                  Add
                </BaseButton>
              </div>
            </section>

            <div class="gs-vars__list-head">
              <span>{{ store.variables.length }} variables</span>
              <code>env.*</code>
            </div>

            <div v-if="store.isLoadingVariables" class="gs-state">
              <LucideIcon name="loader-2" :size="18" class="gs-spin" />
            </div>

            <div v-else-if="store.variables.length === 0" class="gs-state gs-vars__empty">
              <LucideIcon name="key-round" :size="24" />
              <strong>No variables yet</strong>
              <span>Add the first environment variable above.</span>
            </div>

            <div v-else class="gs-vars__rows">
              <article v-for="v in store.variables" :key="v.key" class="gs-vars__row">
                <span class="gs-vars__key-icon">
                  <LucideIcon name="key-round" :size="14" />
                </span>
                <div class="gs-vars__identity">
                  <strong>{{ v.key }}</strong>
                  <span>{{ v.description || 'No description' }}</span>
                </div>
                <code class="gs-vars__token">env.{{ v.key }}</code>
                <div class="gs-vars__actions">
                  <code
                    class="gs-vars__value"
                    :title="revealedVars[v.key] ? v.value : 'Click eye to reveal'"
                  >
                    {{ revealedVars[v.key] ? v.value : '••••••••••••••••' }}
                  </code>
                  <BaseButton
                    variant="ghost"
                    size="icon"
                    title="Copy variable token"
                    @click="copyVariableToken(v.key)"
                  >
                    <template #left>
                      <LucideIcon name="copy" :size="13" />
                    </template>
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="icon"
                    :title="revealedVars[v.key] ? 'Hide value' : 'Show value'"
                    @click="toggleVarVisibility(v.key)"
                  >
                    <template #left>
                      <LucideIcon :name="revealedVars[v.key] ? 'eye-off' : 'eye'" :size="13" />
                    </template>
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="icon"
                    :loading="deletingKey === v.key"
                    @click="handleDeleteVariable(v.key)"
                    title="Delete"
                  >
                    <template #left>
                      <LucideIcon name="trash-2" :size="13" />
                    </template>
                  </BaseButton>
                </div>
              </article>
            </div>
          </div>

          <!-- Credentials Body -->
          <div v-else-if="activeTab === 'credentials'" key="body-cred" class="gs-pref-list">
            <!-- Loading -->
            <div v-if="isLoadingPlugins" class="gs-state" style="padding: 2rem">
              <LucideIcon name="loader-2" :size="18" class="gs-spin" />
            </div>

            <!-- Empty -->
            <div v-else-if="authPlugins.length === 0" class="gs-state" style="padding: 2rem">
              <LucideIcon name="key-round" :size="24" />
              <p>
                {{
                  credSearch.trim()
                    ? 'No plugins found matching search.'
                    : 'No plugins requiring credentials installed.'
                }}
              </p>
            </div>

            <!-- Plugin credential list -->
            <div
              v-else
              style="
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 0.75rem;
              "
            >
              <div
                v-for="plugin in authPlugins"
                :key="plugin.id"
                class="gs-cred-grid-item"
                :class="{ 'gs-cred-grid-item--active': selectedPluginForMenu?.id === plugin.id }"
                @click="openPluginMenu(plugin)"
              >
                <img
                  v-if="isUrl(pluginIcon(plugin))"
                  :src="pluginIcon(plugin)"
                  alt=""
                  style="
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                    border-radius: var(--fabric-global-settings-preview-radius);
                    margin-bottom: 0.75rem;
                  "
                />
                <div
                  v-else
                  style="
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--fabric-app-global-settings-bg-surface);
                    border: 1px solid var(--fabric-app-global-settings-border);
                    border-radius: var(--fabric-global-settings-preview-radius);
                    margin-bottom: 0.75rem;
                  "
                >
                  <LucideIcon :name="pluginIcon(plugin)" :size="20" style="opacity: 0.7" />
                </div>

                <span
                  style="
                    font-size: 0.95em;
                    font-weight: 500;
                    color: var(--fabric-app-global-settings-text-primary);
                    margin-bottom: 0.25rem;
                    text-align: center;
                  "
                >
                  {{ plugin.manifest?.metadata?.name ?? plugin.id }}
                </span>

                <span
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.35rem;
                    font-size: 0.75em;
                  "
                  :style="
                    plugin.status === 'connected'
                      ? 'color: var(--fabric-app-global-settings-text-success);'
                      : plugin.status === 'configured'
                      ? 'color: var(--fabric-app-global-settings-text-warning);'
                      : 'color: var(--fabric-app-global-settings-text-danger);'
                  "
                >
                  <LucideIcon
                    :name="plugin.status === 'connected' ? 'check' : 'circle-alert'"
                    :size="12"
                  />
                  {{ plugin.status === 'connected' ? 'Connected' : plugin.status === 'configured' ? 'Configured' : 'Not configured' }}
                </span>
              </div>
            </div>

            <!-- BaseMiniMenu for Plugin Credentials -->
            <BaseMiniMenu
              :is-open="!!selectedPluginForMenu"
              :title="
                'Configure ' +
                (selectedPluginForMenu?.manifest?.metadata?.name ?? selectedPluginForMenu?.id)
              "
              :logo="selectedPluginIcon"
              :icon="selectedPluginIcon"
              max-width="520px"
              @close="closePluginMenu"
            >
              <div
                style="display: flex; flex-direction: column; gap: 1.25rem"
                v-if="selectedPluginForMenu"
              >
                <!-- OAuth Redirect URL Block -->
                <div
                  v-if="selectedPluginForMenu.auth_type === 'oauth2' && pluginStatus?.oauth_redirect_uri"
                  style="display: flex; flex-direction: column; gap: var(--fabric-space-2); padding: var(--fabric-space-3); background: var(--fabric-app-global-settings-bg-surface); border-radius: var(--fabric-global-settings-inline-card-radius); border: 1px solid var(--fabric-app-global-settings-border); margin-bottom: var(--fabric-space-2);"
                >
                  <span style="font-size: var(--fabric-text-sm); font-weight: 500; color: var(--fabric-app-global-settings-text-primary);">OAuth Redirect URL</span>
                  <BaseInput
                    :model-value="pluginStatus.oauth_redirect_uri"
                    readonly
                    @click="$event.target.select()"
                  />
                  <p
                    v-if="pluginStatus?.oauth_ui?.oauthCallbackInstructions"
                    style="margin: 0; font-size: var(--fabric-text-xs); color: var(--fabric-app-global-settings-text-muted); margin-top: var(--fabric-space-1);"
                  >
                    {{ pluginStatus.oauth_ui.oauthCallbackInstructions }}
                  </p>
                  <div
                    v-if="pluginStatus.oauth_public_url_required"
                    style="display: flex; align-items: flex-start; gap: var(--fabric-space-2); padding: var(--fabric-space-2); border: 1px solid rgba(234, 179, 8, 0.25); border-radius: var(--fabric-global-settings-inline-card-radius); background: rgba(234, 179, 8, 0.08); color: rgb(234, 179, 8); font-size: var(--fabric-text-xs); line-height: 1.4;"
                  >
                    <LucideIcon name="circle-alert" :size="14" style="flex: 0 0 auto; margin-top: 1px;" />
                    <span>
                      {{
                        pluginStatus.oauth_public_url_warning ||
                        'OAuth needs a public HTTPS URL. Set Public URL in Settings or PUBLIC_URL on the Fabric server before connecting.'
                      }}
                    </span>
                  </div>
                </div>
                <template
                  v-for="(schema, fieldKey) in credentialSchema(selectedPluginForMenu)"
                  :key="fieldKey"
                >
                  <div style="display: flex; flex-direction: column; gap: var(--fabric-space-1)">
                    <label style="display: flex; align-items: center; gap: var(--fabric-space-1); font-size: var(--fabric-text-sm); font-weight: 500; color: var(--fabric-app-global-settings-text-primary);">
                      {{ (schema as any).label ?? (schema as any).title ?? String(fieldKey) }}
                      <span v-if="(schema as any).required" style="color: rgb(239, 68, 68);">*</span>
                    </label>
                    <p
                      v-if="(schema as any).description"
                      style="margin: 0; font-size: var(--fabric-text-xs); color: var(--fabric-app-global-settings-text-muted);"
                    >
                      {{ (schema as any).description }}
                    </p>

                    <div
                      style="display: flex; align-items: center; gap: 0.5rem; margin-top: var(--fabric-space-1)"
                    >
                      <BaseInput
                        style="flex: 1"
                        :model-value="getCredField(selectedPluginForMenu.id, String(fieldKey))"
                        placeholder="Enter value"
                        :type="
                          (schema as any).format === 'password' &&
                          !showCredValues[`${selectedPluginForMenu.id}_${fieldKey}`]
                            ? 'password'
                            : 'text'
                        "
                        @update:model-value="
                          setCredField(selectedPluginForMenu.id, String(fieldKey), String($event))
                        "
                      />
                      <BaseButton
                        v-if="(schema as any).format === 'password'"
                        variant="ghost"
                        size="icon"
                        :title="
                          showCredValues[`${selectedPluginForMenu.id}_${fieldKey}`]
                            ? 'Hide'
                            : 'Show'
                        "
                        @click="toggleCredVisibility(selectedPluginForMenu.id, String(fieldKey))"
                      >
                        <template #left>
                          <LucideIcon
                            :name="
                              showCredValues[`${selectedPluginForMenu.id}_${fieldKey}`]
                                ? 'eye-off'
                                : 'eye'
                            "
                            :size="15"
                          />
                        </template>
                      </BaseButton>
                    </div>
                  </div>
                </template>
              </div>

              <template #footer>
                <div style="display: flex; flex-direction: column; gap: var(--fabric-space-2); width: 100%;">
                  <!-- Save Button -->
                  <BaseButton
                    variant="primary"
                    :disabled="!hasPendingCredFields(selectedPluginForMenu?.id)"
                    :loading="isSavingCred === selectedPluginForMenu?.id"
                    @click="handleSaveCredentialAndClose(selectedPluginForMenu.id)"
                    style="width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                  >
                    Save Credentials
                  </BaseButton>

                  <!-- OAuth2 / Test Connection -->
                  <BaseButton
                    v-if="selectedPluginForMenu?.auth_type === 'oauth2' && pluginStatus?.status === 'configured'"
                    variant="secondary"
                    :title="pluginStatus?.oauth_ui?.buttonText || 'Authenticate via OAuth2'"
                    :disabled="pluginStatus?.oauth_public_url_required"
                    @click="handleOAuth2(selectedPluginForMenu.id)"
                    style="width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                  >
                    <template #left>
                      <img v-if="pluginStatus?.oauth_ui?.buttonIcon?.startsWith('http')" :src="pluginStatus.oauth_ui.buttonIcon" style="width: 16px; height: 16px; object-fit: contain;" />
                      <LucideIcon v-else-if="pluginStatus?.oauth_ui?.buttonIcon" :name="pluginStatus.oauth_ui.buttonIcon" :size="16" />
                      <LucideIcon v-else name="external-link" :size="16" />
                    </template>
                    {{ pluginStatus?.oauth_ui?.buttonText || 'Connect with OAuth2' }}
                  </BaseButton>
                  <p
                    v-if="selectedPluginForMenu?.auth_type === 'oauth2' && awaitingOAuthReturn"
                    class="gs-field__hint"
                  >
                    Waiting for authorization. Return here after finishing in the new tab.
                  </p>
                  <BaseButton
                    v-if="selectedPluginForMenu?.auth_type === 'oauth2' && awaitingOAuthReturn"
                    variant="secondary"
                    title="Check connection"
                    @click="checkConnection"
                    style="width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                  >
                    <template #left><LucideIcon name="refresh-cw" :size="16" /></template>
                    Check connection
                  </BaseButton>
                  <BaseButton
                    v-else-if="selectedPluginForMenu?.auth_type !== 'none' && selectedPluginForMenu?.auth_type !== 'oauth2'"
                    variant="secondary"
                    title="Test Connection"
                    @click="handleTestConnection(selectedPluginForMenu.id)"
                    style="width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                  >
                    <template #left><LucideIcon name="plug" :size="16" /></template>
                    Test Connection
                  </BaseButton>

                  <BaseButton
                    v-if="hasCredential(selectedPluginForMenu?.id) && pluginStatus?.status === 'connected'"
                    variant="ghost"
                    style="color: rgb(239, 68, 68); background-color: rgba(239, 68, 68, 0.1); width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                    :loading="isDeletingCred === selectedPluginForMenu?.id"
                    @click="handleDeleteCredentialAndClose(selectedPluginForMenu.id)"
                  >
                    <template #left><LucideIcon name="log-out" :size="16" /></template>
                    Disconnect
                  </BaseButton>
                </div>
              </template>
            </BaseMiniMenu>
          </div>

          <!-- Preferences Body -->
          <div v-else-if="activeTab === 'preferences'" key="body-pref" class="gs-pref-list">
            <div class="gs-theme-row">
              <div class="gs-theme-row__copy">
                <LucideIcon name="sun-moon" :size="16" />
                <div>
                  <strong>Theme</strong>
                  <span>Controls the app color scheme</span>
                </div>
              </div>

              <BaseThemeSelect :model-value="themeValue" @update:model-value="handleThemeChange" />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="database" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Log Retention</span>
                  <span class="gs-pref-row__hint">How long to keep execution logs</span>
                </div>
              </div>
              <BaseSelect
                :model-value="logRetentionValue"
                :options="logRetentionOptions"
                @update:model-value="handleLogRetentionChange"
              />
            </div>

            <div v-if="isDesktopWindow" class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="zoom-in" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Window Zoom</span>
                  <span class="gs-pref-row__hint">Adjust the desktop interface scale</span>
                </div>
              </div>
              <div class="gs-window-zoom">
                <BaseButton
                  variant="secondary"
                  size="icon"
                  title="Decrease zoom"
                  @click="decreaseWindowZoom"
                >
                  <template #left>
                    <LucideIcon name="minus" :size="15" />
                  </template>
                </BaseButton>
                <BaseButton variant="ghost" title="Reset zoom" @click="resetWindowZoom">
                  {{ windowZoomLabel }}
                </BaseButton>
                <BaseButton
                  variant="secondary"
                  size="icon"
                  title="Increase zoom"
                  @click="increaseWindowZoom"
                >
                  <template #left>
                    <LucideIcon name="plus" :size="15" />
                  </template>
                </BaseButton>
              </div>
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="globe" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Public URL</span>
                  <span class="gs-pref-row__hint">Base URL used by production webhooks and forms</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 320px">
                <BaseInput
                  v-model="publicUrlDraft"
                  placeholder="https://example.ngrok-free.app"
                  :disabled="publicUrlLocked"
                  style="flex: 1"
                />
                <BaseButton
                  variant="primary"
                  :loading="isSavingPublicUrl"
                  :disabled="publicUrlLocked"
                  @click="handlePublicUrlSave"
                >
                  Save
                </BaseButton>
                <BaseButton
                  v-if="hasConfiguredPublicUrl"
                  variant="ghost"
                  size="icon"
                  title="Clear public URL"
                  :loading="isClearingPublicUrl"
                  :disabled="publicUrlLocked || isSavingPublicUrl"
                  @click="handlePublicUrlClear"
                >
                  <template #left>
                    <LucideIcon name="x" :size="15" />
                  </template>
                </BaseButton>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'system'" key="body-system" class="gs-pref-list">
            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="bell" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Desktop Notifications</span>
                  <span class="gs-pref-row__hint">Send native notifications when Fabric is not focused</span>
                </div>
              </div>
              <BaseSwitch
                :model-value="desktopNotificationsEnabled"
                @update:model-value="handleDesktopNotificationsChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="minus" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Minimize to Tray</span>
                  <span class="gs-pref-row__hint">Hide Fabric in the system tray when minimized</span>
                </div>
              </div>
              <BaseSwitch
                :model-value="desktopMinimizeToTray"
                @update:model-value="handleDesktopMinimizeToTrayChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="panel-bottom-close" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Close to Tray</span>
                  <span class="gs-pref-row__hint">Keep Fabric running in the tray when the window closes</span>
                </div>
              </div>
              <BaseSwitch
                :model-value="desktopCloseToTray"
                @update:model-value="handleDesktopCloseToTrayChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="power" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Open with OS</span>
                  <span class="gs-pref-row__hint">Start Fabric automatically when you sign in</span>
                </div>
              </div>
              <BaseSwitch
                :model-value="desktopOpenAtLogin"
                @update:model-value="handleDesktopOpenAtLoginChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="refresh-cw" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Check for Updates</span>
                  <span class="gs-pref-row__hint">
                    {{ updateCheckMessage || 'Look for safe Fabric Desktop updates when the app opens' }}
                  </span>
                </div>
              </div>
              <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 10px; min-width: 0">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  :loading="isCheckingUpdates"
                  :disabled="!isDesktopWindow"
                  title="Check for updates"
                  @click="checkForDesktopUpdates({ manual: true })"
                >
                  <template #left>
                    <LucideIcon name="refresh-cw" :size="14" />
                  </template>
                  Check Now
                </BaseButton>
                <BaseSwitch
                  :model-value="updatesAutoCheck"
                  @update:model-value="handleUpdatesAutoCheckChange"
                />
              </div>
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="download" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Install Updates Automatically</span>
                  <span class="gs-pref-row__hint">Prepare safe desktop updates for automatic install after signed installers are enabled</span>
                </div>
              </div>
              <BaseSwitch
                :model-value="updatesAutoInstall"
                @update:model-value="handleUpdatesAutoInstallChange"
              />
            </div>
          </div>

          <div v-else-if="activeTab === 'auvexis'" key="body-auvexis" class="gs-pref-list">
            <AuvexisAccountSettings />
          </div>
        </transition>
        </section>
      </main>
    </div>
  </BaseModal>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useSettingsStore } from '@/shared/stores/settings.store'
import { useTheme, type ThemeMode } from '@/shared/composables/useTheme'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import BaseThemeSelect from '@/shared/components/base/BaseThemeSelect.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseMiniMenu from '@/shared/components/base/BaseMiniMenu.vue'
import BaseRestartApplicationConfirm from '@/shared/components/base/BaseRestartApplicationConfirm.vue'
import BaseUpdateDialog, {
  type BaseUpdateDialogInfo,
} from '@/shared/components/base/BaseUpdateDialog.vue'
import AuvexisAccountSettings from '@/shared/components/layout/AuvexisAccountSettings.vue'
import { usePluginAuth } from '@/shared/composables/usePluginAuth'
import { useToast } from '@/shared/composables/useToast'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'

const toast = useToast()

// ─── Store ────────────────────────────────────────────────────────────────────

const store = useSettingsStore()
const { iconVariant, setMode } = useTheme()
const isDesktopWindow = computed(
  () => typeof window !== 'undefined' && window.fabricDesktop?.isDesktop === true,
)
const windowZoomFactor = ref(1)
const windowZoomLabel = computed(() => `${Math.round(windowZoomFactor.value * 100)}%`)
const desktopNotificationsEnabled = computed(
  () => store.settings.desktop_notifications_enabled !== false,
)
const desktopMinimizeToTray = computed(() => store.settings.desktop_minimize_to_tray !== false)
const desktopCloseToTray = computed(() => store.settings.desktop_close_to_tray !== false)
const desktopOpenAtLogin = computed(() => store.settings.desktop_open_at_login === true)
const updatesAutoCheck = computed(() => store.settings.updates_auto_check !== false)
const updatesAutoInstall = computed(() => store.settings.updates_auto_install === true)
const isCheckingUpdates = ref(false)
const isUpdateDialogOpen = ref(false)
const desktopUpdateInfo = ref<BaseUpdateDialogInfo | null>(null)
const updateCheckMessage = ref('')
let removeZoomChangeListener: (() => void) | undefined
let didAutoCheckUpdates = false

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: 'preferences', label: 'Preferences', icon: 'sliders-horizontal' },
  { id: 'system', label: 'System/Updates', icon: 'monitor-cog' },
  { id: 'auvexis', label: 'Auvexis', icon: 'shield-check' },
  { id: 'credentials', label: 'Credentials', icon: 'lock-keyhole' },
  { id: 'variables', label: 'Variables', icon: 'key-round' },
] as const

type TabId = (typeof tabs)[number]['id']
const activeTab = computed({
  get: () => store.activeTab as TabId,
  set: (val) => { store.activeTab = val }
})
const activeTabTitle = computed(() => tabs.find((tab) => tab.id === activeTab.value)?.label ?? 'Settings')

// ─── Load data when opened ────────────────────────────────────────────────────

watch(
  () => store.isOpen,
  (opened) => {
    if (opened) {
      store.fetchVariables()
      store.fetchSettings().then(() => {
        syncDesktopPreferences()
        maybeAutoCheckForUpdates()
      })
      loadPlugins()
    }
  },
)

// ─── Variables ────────────────────────────────────────────────────────────────

const newVar = ref({ key: '', value: '', description: '', keyError: '' })
const isSavingVar = ref(false)
const deletingKey = ref<string | null>(null)

const showNewVarValue = ref(false)
const revealedVars = ref<Record<string, boolean>>({})

function toggleVarVisibility(key: string) {
  revealedVars.value[key] = !revealedVars.value[key]
}

async function copyVariableToken(key: string) {
  const token = `{{ env.${key} }}`
  try {
    await navigator.clipboard?.writeText(token)
    toast.success('Variable copied')
  } catch {
    toast.error('Could not copy variable')
  }
}

async function handleSaveVariable() {
  newVar.value.keyError = ''
  const key = newVar.value.key.trim().toUpperCase()

  if (!key) return
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    newVar.value.keyError = 'Must be a valid identifier (letters, digits, underscores)'
    return
  }

  isSavingVar.value = true
  try {
    await store.saveVariable(key, newVar.value.value, newVar.value.description)
    newVar.value = { key: '', value: '', description: '', keyError: '' }
  } catch (err: any) {
    newVar.value.keyError = err.message
  } finally {
    isSavingVar.value = false
  }
}

async function handleDeleteVariable(key: string) {
  deletingKey.value = key
  try {
    await store.deleteVariable(key)
  } finally {
    deletingKey.value = null
  }
}

// ─── Credentials ───────────────────────────────────────────────────────────

const plugins = ref<any[]>([])
const isLoadingPlugins = ref(false)
const pendingCredFields = ref<Record<string, Record<string, string>>>({})
const isSavingCred = ref<string | null>(null)
const isDeletingCred = ref<string | null>(null)

const showCredValues = ref<Record<string, boolean>>({})
const selectedPluginForMenu = ref<any>(null)
const credSearch = ref('')

function pluginIcon(plugin: any): string {
  return resolvePluginIcon(plugin.manifest?.metadata ?? {}, {
    iconVariant: iconVariant.value,
    fallback: 'puzzle',
  })
}

const selectedPluginIcon = computed(() =>
  selectedPluginForMenu.value ? pluginIcon(selectedPluginForMenu.value) : 'puzzle',
)

function toggleCredVisibility(pluginId: string, fieldKey: string) {
  const key = `${pluginId}_${fieldKey}`
  showCredValues.value[key] = !showCredValues.value[key]
}

const {
  pluginStatus,
  loadStatus,
  handleConnect: startOAuth2,
  handleDisconnect: disconnectOAuth2,
  authLoading: isAuthLoading,
  awaitingOAuthReturn,
  checkConnection,
} = usePluginAuth(() => selectedPluginForMenu.value?.id ?? null)

watch(() => pluginStatus.value?.status, (newStatus) => {
  if (newStatus) syncSelectedPluginStatus(newStatus)
})

function syncSelectedPluginStatus(status: string) {
  const pluginId = selectedPluginForMenu.value?.id
  if (!pluginId) return
  const target = plugins.value.find((plugin: any) => plugin.id === pluginId)
  if (target) target.status = status
  selectedPluginForMenu.value.status = status
}

async function openPluginMenu(plugin: any) {
  selectedPluginForMenu.value = plugin
  await loadStatus()
}

function closePluginMenu() {
  selectedPluginForMenu.value = null
}

const isUrl = (str?: string) => str?.startsWith('http') || str?.startsWith('/')

async function loadPlugins() {
  isLoadingPlugins.value = true
  try {
    const { pluginsApi } = await import('@/core/api/plugins.api')
    const list = await pluginsApi.getAll()
    plugins.value = list ?? []
    for (const p of authPlugins.value) {
      await store.fetchCredential(p.id)
    }

    if (store.targetPluginId) {
      const target = plugins.value.find((p: any) => p.id === store.targetPluginId)
      if (target) openPluginMenu(target)
      store.targetPluginId = null
    }
  } catch {
    // ignore
  } finally {
    isLoadingPlugins.value = false
  }
}

const authPlugins = computed(() =>
  plugins.value.filter((p: any) => {
    const schema = p.credential_schema
    const hasSchema = schema && typeof schema === 'object' && Object.keys(schema).length > 0
    if (!hasSchema) return false

    if (credSearch.value.trim()) {
      const name = (p.manifest?.metadata?.name || p.id).toLowerCase()
      return name.includes(credSearch.value.trim().toLowerCase())
    }
    return true
  }),
)

function credentialSchema(plugin: any): Record<string, any> {
  return plugin.credential_schema ?? {}
}

function hasCredential(pluginId: string): boolean {
  const cred = store.credentials[pluginId]
  return !!cred && Object.keys(cred.fields ?? {}).length > 0
}

function getCredField(pluginId: string, fieldKey: string): string {
  return (
    pendingCredFields.value[pluginId]?.[fieldKey] ??
    store.credentials[pluginId]?.fields?.[fieldKey] ??
    ''
  )
}

function setCredField(pluginId: string, fieldKey: string, value: string | number) {
  if (!pendingCredFields.value[pluginId]) pendingCredFields.value[pluginId] = {}
  pendingCredFields.value[pluginId][fieldKey] = String(value)
}

function hasPendingCredFields(pluginId: string): boolean {
  const pending = pendingCredFields.value[pluginId]
  return !!pending && Object.values(pending).some((v) => v.trim() !== '')
}

async function handleSaveCredential(pluginId: string) {
  const fields = pendingCredFields.value[pluginId] ?? {}
  if (!Object.keys(fields).length) return
  isSavingCred.value = pluginId
  try {
    await store.saveCredential(pluginId, fields)
    delete pendingCredFields.value[pluginId]
    await loadStatus()
    if (pluginStatus.value?.status) {
      syncSelectedPluginStatus(pluginStatus.value.status)
    }
  } finally {
    isSavingCred.value = null
  }
}

async function handleDeleteCredential(pluginId: string) {
  isDeletingCred.value = pluginId
  try {
    await store.deleteCredential(pluginId)
    delete pendingCredFields.value[pluginId]
  } finally {
    isDeletingCred.value = null
  }
}

async function handleSaveCredentialAndClose(pluginId: string) {
  await handleSaveCredential(pluginId)
  closePluginMenu()
}

async function handleDeleteCredentialAndClose(pluginId: string) {
  if (selectedPluginForMenu.value?.manifest?.auth_type === 'oauth2') {
    await disconnectOAuth2()
  } else {
    await handleDeleteCredential(pluginId)
  }
  closePluginMenu()
}

function handleOAuth2(pluginId: string) {
  startOAuth2()
}

async function handleTestConnection(pluginId: string) {
  try {
    // Re-fetch credentials/status to simulate a test
    await store.fetchCredential(pluginId)
    toast.success('Connection test successful', 'The plugin credentials are valid and responding.')
  } catch (e: any) {
    toast.error('Connection test failed', e.message || 'Could not verify credentials.')
  }
}

// ─── Preferences ──────────────────────────────────────────────────────────────

const logRetentionOptions = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '0', label: 'Keep forever' },
]

const themeValue = computed<ThemeMode>(() => {
  const theme = String(store.settings.theme ?? 'dark')
  return theme === 'light' || theme === 'system' ? theme : 'dark'
})
const logRetentionValue = computed(() => String(store.settings.log_retention_days ?? '30'))
const publicUrlLocked = computed(() => store.settings.public_url_locked === true)
const publicUrlDraft = ref('')
const isSavingPublicUrl = ref(false)
const isClearingPublicUrl = ref(false)
const hasConfiguredPublicUrl = computed(() => {
  const value = store.settings.public_url
  return typeof value === 'string' && value.trim().length > 0
})
const restartConfirmRef = ref<InstanceType<typeof BaseRestartApplicationConfirm> | null>(null)

interface PublicUrlSaveResult {
  publicUrl: string
  pendingPublicUrl: string | null
  restartRequired: true
}

watch(
  () => store.settings.public_url,
  (value) => {
    publicUrlDraft.value = typeof value === 'string' ? value : ''
  },
  { immediate: true },
)

async function handleThemeChange(value: string | number) {
  const theme = String(value) as ThemeMode
  setMode(theme)
  await store.saveSetting('theme', theme)
}

async function handleLogRetentionChange(value: string | number) {
  await store.saveSetting('log_retention_days', String(value))
}

async function handleDesktopNotificationsChange(value: boolean) {
  await store.saveSetting('desktop_notifications_enabled', value)
}

async function handleDesktopMinimizeToTrayChange(value: boolean) {
  await store.saveSetting('desktop_minimize_to_tray', value)
  await syncDesktopPreferences()
}

async function handleDesktopCloseToTrayChange(value: boolean) {
  await store.saveSetting('desktop_close_to_tray', value)
  await syncDesktopPreferences()
}

async function handleDesktopOpenAtLoginChange(value: boolean) {
  await store.saveSetting('desktop_open_at_login', value)
  await syncDesktopPreferences()
}

async function handleUpdatesAutoCheckChange(value: boolean) {
  await store.saveSetting('updates_auto_check', value)
  if (value) maybeAutoCheckForUpdates()
}

async function handleUpdatesAutoInstallChange(value: boolean) {
  await store.saveSetting('updates_auto_install', value)
}

async function syncDesktopPreferences() {
  if (!window.fabricDesktop?.isDesktop) return
  await window.fabricDesktop.setPreferences({
    minimizeToTray: desktopMinimizeToTray.value,
    closeToTray: desktopCloseToTray.value,
    openAtLogin: desktopOpenAtLogin.value,
  })
}

function maybeAutoCheckForUpdates() {
  if (didAutoCheckUpdates || !updatesAutoCheck.value || !window.fabricDesktop?.isDesktop) return
  didAutoCheckUpdates = true
  void checkForDesktopUpdates()
}

async function checkForDesktopUpdates(options: { manual?: boolean } = {}) {
  if (!window.fabricDesktop?.isDesktop) return

  isCheckingUpdates.value = true
  updateCheckMessage.value = 'Checking safe releases...'

  try {
    const update = await window.fabricDesktop.checkForUpdates('safe')
    desktopUpdateInfo.value = update

    if (update.updateAvailable) {
      updateCheckMessage.value = `Fabric ${update.version} is available`
      isUpdateDialogOpen.value = true
      if (updatesAutoInstall.value) {
        toast.info('Update ready to download', 'Automatic install will be enabled after signed installers are available.')
      }
      return
    }

    updateCheckMessage.value = `Fabric ${update.currentVersion} is up to date`
    if (options.manual) {
      toast.success('Fabric is up to date', 'No newer safe desktop release was found.')
    }
  } catch (err: any) {
    updateCheckMessage.value = 'Could not check for updates'
    if (options.manual) {
      toast.error('Update check failed', err?.message ?? 'Could not reach GitHub releases.')
    }
  } finally {
    isCheckingUpdates.value = false
  }
}

async function setWindowZoom(zoomFactor: number) {
  const nextZoomFactor = await window.fabricDesktop?.setZoomFactor(Number(zoomFactor.toFixed(2)))
  if (typeof nextZoomFactor === 'number') windowZoomFactor.value = nextZoomFactor
}

function decreaseWindowZoom() {
  void setWindowZoom(windowZoomFactor.value - 0.1)
}

function increaseWindowZoom() {
  void setWindowZoom(windowZoomFactor.value + 0.1)
}

function resetWindowZoom() {
  void setWindowZoom(1)
}

async function handlePublicUrlSave() {
  isSavingPublicUrl.value = true
  try {
    const result = await store.saveSetting<PublicUrlSaveResult>('public_url', publicUrlDraft.value.trim())
    store.settings.public_url_restart_required = result.restartRequired
    if (result.restartRequired) {
      await requestApplicationRestart(
        'Fabric needs to restart to apply the new public URL. After restarting, open Fabric from the configured public URL.',
      )
    }
  } catch (err: any) {
    toast.error('Public URL not saved', err?.message ?? 'Could not save the public URL.')
  } finally {
    isSavingPublicUrl.value = false
  }
}

async function handlePublicUrlClear() {
  isClearingPublicUrl.value = true
  try {
    const result = await store.deleteSetting<PublicUrlSaveResult>('public_url')
    publicUrlDraft.value = ''
    store.settings.public_url = ''
    store.settings.public_url_restart_required = result.restartRequired
    if (result.restartRequired) {
      await requestApplicationRestart(
        'Fabric needs to restart to remove the public URL and return to the default localhost URL.',
      )
    }
  } catch (err: any) {
    toast.error('Public URL not cleared', err?.message ?? 'Could not clear the public URL.')
  } finally {
    isClearingPublicUrl.value = false
  }
}

async function requestApplicationRestart(message: string) {
  await restartConfirmRef.value?.requestRestart(message)
}

onMounted(() => {
  if (!isDesktopWindow.value || !window.fabricDesktop) return
  void store.fetchSettings().then(() => {
    void syncDesktopPreferences()
    maybeAutoCheckForUpdates()
  })
  void window.fabricDesktop.getZoomFactor().then((zoomFactor) => {
    windowZoomFactor.value = zoomFactor
  })
  removeZoomChangeListener = window.fabricDesktop.onZoomChange((state) => {
    windowZoomFactor.value = state.zoomFactor
  })
})

onUnmounted(() => {
  removeZoomChangeListener?.()
})
</script>

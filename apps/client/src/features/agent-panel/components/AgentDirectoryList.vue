<template>
  <aside class="agent-directory-list" aria-label="Published agents">
    <div class="agent-directory-list__profile-wrap">
      <BaseDropdownSelect
        v-model="selectedProfileValue"
        :options="profileSelectOptions"
        direction="down"
        variant="ghost"
        open-icon=""
        close-icon=""
        trigger-class="agent-directory-list__profile"
        menu-class="agent-directory-list__profile-menu"
        title="Switch profile"
      >
        <template #trigger="{ option }">
          <span>{{ option?.meta ?? currentProfileAvatar }}</span>
        </template>
      </BaseDropdownSelect>
    </div>

    <div
      class="agent-directory-list__agents"
      aria-label="Agent list"
    >
      <div v-if="store.loading" class="agent-directory-list__state">...</div>
      <div v-else-if="store.directoryError" class="agent-directory-list__state">!</div>
      <div
        v-for="agent in store.filteredAgents"
        :key="agent.key"
        class="agent-directory-list__hint-wrapper"
        :class="{ 'agent-directory-list__hint-wrapper--active': agent.key === store.selectedAgentKey }"
        @mouseenter="showAgentHint(agent.key, $event)"
        @mouseleave="hideAgentHint"
        @focusin="showAgentHint(agent.key, $event)"
        @focusout="hideAgentHint"
      >
        <BaseButton
          type="button"
          size="icon"
          variant="ghost"
          class="agent-directory-list__item"
          :class="{ 'agent-directory-list__item--active': agent.key === store.selectedAgentKey }"
          :aria-label="`${agent.name} - ${agent.workflowName}`"
          @click="store.selectAgent(agent.key)"
        >
          <span class="agent-directory-list__emoji">{{ agent.emoji }}</span>
        </BaseButton>
      </div>
    </div>

    <footer class="agent-directory-list__footer">
      <BaseButton
        type="button"
        size="icon"
        variant="ghost"
        :icon-left="store.directoryCollapsed ? 'panel-right' : 'panel-left'"
        :title="store.directoryCollapsed ? 'Expand chat history' : 'Collapse chat history'"
        @click="store.toggleDirectoryCollapsed()"
      />
    </footer>

    <Teleport to="body">
      <Transition name="agent-directory-hint">
        <div
          v-if="activeHintAgent"
          class="agent-directory-list__hint surface"
          :style="hintStyle"
          role="tooltip"
        >
          <span class="agent-directory-list__hint-avatar">{{ activeHintAgent.emoji }}</span>
          <strong>{{ activeHintAgent.name }}</strong>
          <span>{{ activeHintAgent.workflowName }}</span>
        </div>
      </Transition>
    </Teleport>

    <ProfilePasswordConfirmationDialog
      v-if="pendingProfile"
      :model-value="Boolean(pendingProfile)"
      :profile="pendingProfile"
      @confirmed="confirmProtectedProfile"
      @cancel="cancelProtectedProfile"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseDropdownSelect, { type BaseDropdownSelectOption } from '@/shared/components/base/BaseDropdownSelect.vue'
import ProfilePasswordConfirmationDialog from '@/shared/components/overlay/ProfilePasswordConfirmationDialog.vue'
import type { ProfileSummary } from '@/core/api/profiles.api'

const store = useAgentPanelStore()
const profileStore = useProfileStore()
const pendingProfile = ref<ProfileSummary | null>(null)
const currentProfileAvatar = computed(() => profileStore.currentProfile?.avatarEmoji ?? '⛵')
const selectedProfileValue = computed({
  get: () => profileStore.currentProfile?.id ?? '',
  set: (profileId: string) => selectProfile(profileId),
})
const profileSelectOptions = computed<BaseDropdownSelectOption[]>(() =>
  profileStore.sortedProfiles.map((profile) => ({
    value: profile.id,
    label: profile.name,
    shortLabel: profile.name,
    meta: profile.avatarEmoji,
  })),
)
const activeHintAgentKey = ref('')
const hintAnchorRect = ref<DOMRect | null>(null)
const activeHintAgent = computed(() =>
  store.filteredAgents.find((agent) => agent.key === activeHintAgentKey.value) ?? null,
)
const hintStyle = computed(() => {
  const rect = hintAnchorRect.value
  if (!rect) return {}
  return {
    left: `${rect.right + 12}px`,
    top: `${rect.top + rect.height / 2}px`,
  }
})

onMounted(() => {
  if (!store.agents.length) void store.loadAgents()
  if (!profileStore.profiles.length && !profileStore.isLoading) void profileStore.loadProfiles()
})

function selectProfile(profileId: string) {
  const profile = profileStore.profiles.find((item) => item.id === profileId)
  if (profile) void switchProfile(profile)
}

async function switchProfile(profile: ProfileSummary) {
  if (profile.id === profileStore.currentProfile?.id) return

  if (profile.passwordProtected) {
    pendingProfile.value = profile
    return
  }

  await profileStore.switchProfile(profile.id)
}

async function confirmProtectedProfile(password: string) {
  const profile = pendingProfile.value
  pendingProfile.value = null
  if (!profile) return
  await profileStore.switchProfile(profile.id, password)
}

function cancelProtectedProfile() {
  pendingProfile.value = null
}

function showAgentHint(agentKey: string, event: MouseEvent | FocusEvent) {
  const target = event.currentTarget as HTMLElement | null
  hintAnchorRect.value = target?.getBoundingClientRect() ?? null
  activeHintAgentKey.value = agentKey
}

function hideAgentHint() {
  activeHintAgentKey.value = ''
  hintAnchorRect.value = null
}
</script>

<style scoped>
.agent-directory-list {
  position: relative;
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: var(--fabric-space-5);
  border-right: 1px solid var(--fabric-border);
  background: color-mix(in srgb, var(--fabric-bg-surface) 82%, var(--fabric-bg-base));
  padding: var(--fabric-space-4) var(--fabric-space-3);
}

.agent-directory-list__profile-wrap {
  display: grid;
  place-items: center;
}

:deep(.agent-directory-list__profile) {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: var(--fabric-radius-full);
}

:deep(.agent-directory-list__profile-menu) {
  right: auto;
  left: 0;
  width: 220px;
}

.agent-directory-list__agents {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--fabric-space-2);
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.agent-directory-list__item {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: var(--fabric-radius-full);
}

.agent-directory-list__item :deep(.base-button__label) {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  line-height: 1;
}

.agent-directory-list__hint-wrapper {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
}

.agent-directory-list__item {
  color: var(--fabric-text-primary);
}

.agent-directory-list__item:hover,
.agent-directory-list__item:active {
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-text-primary);
}

.agent-directory-list__item--active {
  background: var(--fabric-button-ghost-active);
  color: var(--fabric-text-primary);
}

.agent-directory-list__emoji {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  font-size: 17px;
  line-height: 1;
}

.agent-directory-list__item--active .agent-directory-list__emoji,
.agent-directory-list__item:hover .agent-directory-list__emoji {
  border-color: var(--fabric-border-strong);
}

.agent-directory-list__state {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.agent-directory-list__hint {
  position: fixed;
  z-index: calc(9999 + var(--fabric-z-tooltip));
  display: grid;
  width: 210px;
  min-height: 126px;
  gap: var(--fabric-space-1);
  justify-items: center;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-lg);
  background: var(--fabric-bg-surface);
  padding: var(--fabric-space-3);
  color: var(--fabric-text-primary);
  box-shadow: var(--fabric-shadow-lg);
  pointer-events: none;
  transform: translate(0, -50%);
}

.agent-directory-hint-enter-active,
.agent-directory-hint-leave-active {
  transition:
    opacity var(--fabric-duration-base) var(--fabric-ease-standard),
    transform var(--fabric-duration-base) var(--fabric-ease-standard);
}

.agent-directory-hint-enter-from,
.agent-directory-hint-leave-to {
  opacity: 0;
  transform: translate(-8px, -50%);
}

.agent-directory-list__hint-avatar {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-bg-base);
  font-size: var(--fabric-text-2xl);
}

.agent-directory-list__hint strong {
  margin-top: var(--fabric-space-1);
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-sm);
}

.agent-directory-list__hint span:last-child {
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  text-align: center;
}

.agent-directory-list__footer {
  display: grid;
  place-items: center;
  width: 100%;
  padding-top: var(--fabric-space-2);
}

</style>

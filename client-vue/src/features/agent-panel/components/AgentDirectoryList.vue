<template>
  <aside class="agent-directory-list" aria-label="Published agents">
    <div class="agent-directory-list__profile-wrap">
      <BaseButton
        type="button"
        size="icon"
        variant="ghost"
        class="agent-directory-list__profile"
        title="Switch profile"
        @click="profileMenuOpen = !profileMenuOpen"
      >
        <span>{{ currentProfileAvatar }}</span>
      </BaseButton>

      <Transition name="agent-profile-menu">
        <div
          v-if="profileMenuOpen"
          class="agent-directory-list__profile-menu"
          role="menu"
        >
          <BaseButton
            v-for="profile in profileStore.sortedProfiles"
            :key="profile.id"
            type="button"
            class="agent-directory-list__profile-option"
            :class="{ 'agent-directory-list__profile-option--active': profile.id === profileStore.currentProfile?.id }"
            variant="ghost"
            full-width
            @click="switchProfile(profile.id)"
          >
            <span>{{ profile.avatarEmoji }}</span>
            <strong>{{ profile.name }}</strong>
          </BaseButton>
        </div>
      </Transition>
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
      <div v-if="!store.loading && !store.directoryError && !store.filteredAgents.length" class="agent-directory-list__state">
        0
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
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const store = useAgentPanelStore()
const profileStore = useProfileStore()
const profileMenuOpen = ref(false)
const currentProfileAvatar = computed(() => profileStore.currentProfile?.avatarEmoji ?? '⛵')
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

async function switchProfile(profileId: string) {
  if (profileId === profileStore.currentProfile?.id) {
    profileMenuOpen.value = false
    return
  }
  await profileStore.switchProfile(profileId)
  profileMenuOpen.value = false
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
  gap: var(--sailor-space-5);
  border-right: 1px solid var(--sailor-border);
  background: color-mix(in srgb, var(--sailor-bg-surface) 82%, var(--sailor-bg-base));
  padding: var(--sailor-space-4) var(--sailor-space-3);
}

.agent-directory-list__profile-wrap {
  position: relative;
  display: grid;
  place-items: center;
}

.agent-directory-list__profile {
  width: 30px;
  height: 30px;
  border-radius: var(--sailor-radius-full);
}

.agent-directory-list__profile-menu {
  position: absolute;
  top: calc(100% + var(--sailor-space-2));
  left: 0;
  z-index: var(--sailor-z-overlay);
  display: grid;
  width: 220px;
  gap: var(--sailor-space-1);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-lg);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-2);
  box-shadow: var(--sailor-shadow-lg);
}

.agent-directory-list__profile-option {
  position: relative;
  z-index: 1;
  justify-content: flex-start;
  background: transparent;
}

.agent-directory-list__profile-option:hover,
.agent-directory-list__profile-option:active {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-button-ghost-hover-text);
}

.agent-directory-list__profile-option--active {
  background: var(--sailor-button-ghost-active);
  color: var(--sailor-button-ghost-active-text);
}

.agent-directory-list__profile-option :deep(.base-button__label) {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--sailor-space-2);
}

.agent-directory-list__profile-option strong {
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-directory-list__agents {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sailor-space-2);
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
  border-radius: var(--sailor-radius-full);
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
  color: var(--sailor-text-primary);
}

.agent-directory-list__item:hover,
.agent-directory-list__item:active {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-text-primary);
}

.agent-directory-list__item--active {
  background: var(--sailor-button-ghost-active);
  color: var(--sailor-text-primary);
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
  border-color: var(--sailor-border-strong);
}

.agent-directory-list__state {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.agent-directory-list__hint {
  position: fixed;
  z-index: calc(9999 + var(--sailor-z-tooltip));
  display: grid;
  width: 210px;
  min-height: 126px;
  gap: var(--sailor-space-1);
  justify-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-lg);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-3);
  color: var(--sailor-text-primary);
  box-shadow: var(--sailor-shadow-lg);
  pointer-events: none;
  transform: translate(0, -50%);
}

.agent-directory-hint-enter-active,
.agent-directory-hint-leave-active {
  transition:
    opacity var(--sailor-duration-base) var(--sailor-ease-standard),
    transform var(--sailor-duration-base) var(--sailor-ease-standard);
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
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-bg-base);
  font-size: var(--sailor-text-2xl);
}

.agent-directory-list__hint strong {
  margin-top: var(--sailor-space-1);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
}

.agent-directory-list__hint span:last-child {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  text-align: center;
}

.agent-directory-list__footer {
  display: grid;
  place-items: center;
  width: 100%;
  padding-top: var(--sailor-space-2);
}

.agent-profile-menu-enter-active,
.agent-profile-menu-leave-active {
  transition:
    opacity var(--sailor-duration-base) var(--sailor-ease-standard),
    transform var(--sailor-duration-base) var(--sailor-ease-standard);
}

.agent-profile-menu-enter-from,
.agent-profile-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

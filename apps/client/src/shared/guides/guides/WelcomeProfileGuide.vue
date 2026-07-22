<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import GuideModal from '../components/GuideModal.vue'
import { useGuideFlow } from '../composables/useGuideFlow'
import {
  hasCompletedGuide,
  markGuideCompleted,
  markGuideSkipped,
} from '../composables/useGuideProgress'
import { useProfileStore } from '@/shared/stores/profile.store'

const GUIDE_ID = 'welcome-profile'
const GUIDE_VERSION = 1
const GUIDE_SCOPE = 'profile'
const guideSteps = ['welcome', 'shortcuts', 'start'] as const

const router = useRouter()
const profileStore = useProfileStore()
const flow = useGuideFlow(guideSteps)
const isOpen = ref(false)

const currentProfileId = computed(() => profileStore.currentProfile?.id ?? null)
const activeStepNumber = computed(() => flow.stepIndex.value + 1)
const stepCount = computed(() => flow.stepCount.value)
const isFirstStep = computed(() => flow.isFirstStep.value)
const title = computed(() => {
  if (flow.is('welcome')) return 'Welcome to Fabric'
  if (flow.is('shortcuts')) return 'Workspace shortcuts'
  return 'Start building'
})

onMounted(async () => {
  if (!profileStore.currentProfile && !profileStore.isLoading) {
    await profileStore.loadProfiles()
  }
  openIfNeeded()
})

function openIfNeeded() {
  if (!currentProfileId.value) return
  if (
    hasCompletedGuide({
      scope: GUIDE_SCOPE,
      scopeId: currentProfileId.value,
      guideId: GUIDE_ID,
      version: GUIDE_VERSION,
    })
  ) {
    return
  }

  flow.reset()
  isOpen.value = true
}

function skip() {
  markGuideSkipped({
    scope: GUIDE_SCOPE,
    scopeId: currentProfileId.value,
    guideId: GUIDE_ID,
    version: GUIDE_VERSION,
  })
  isOpen.value = false
}

function complete() {
  markGuideCompleted({
    scope: GUIDE_SCOPE,
    scopeId: currentProfileId.value,
    guideId: GUIDE_ID,
    version: GUIDE_VERSION,
  })
  isOpen.value = false
}

function openTarget(target: 'workflows' | 'pages') {
  complete()
  void router.push(target === 'workflows' ? '/workflows' : '/pages')
}
</script>

<template>
  <GuideModal :open="isOpen" :title="title" @close="skip">
    <section class="welcome-profile-guide">
      <div class="welcome-profile-guide__step-count">
        {{ activeStepNumber }} / {{ stepCount }}
      </div>

      <div v-if="flow.is('welcome')" class="welcome-profile-guide__step">
        <span class="welcome-profile-guide__icon">
          <LucideIcon name="home" :size="22" />
        </span>
        <h3>Fabric starts from Home.</h3>
        <p>
          Use Home as your profile workspace: open editors, jump into panels, and keep the main
          tools close without hunting through menus.
        </p>
      </div>

      <div v-else-if="flow.is('shortcuts')" class="welcome-profile-guide__step">
        <span class="welcome-profile-guide__icon">
          <LucideIcon name="panel-top" :size="22" />
        </span>
        <h3>Your quick panels are already wired.</h3>
        <p>
          Monitoring, Plugin Installer, and Settings are available from the Home shortcuts. Guides
          will use this same lightweight flow.
        </p>
      </div>

      <div v-else class="welcome-profile-guide__step">
        <span class="welcome-profile-guide__icon">
          <LucideIcon name="workflow" :size="22" />
        </span>
        <h3>Choose where to begin.</h3>
        <p>
          Start with automations in the Workflow Editor, or build a workflow-connected surface in
          Pages.
        </p>
        <div class="welcome-profile-guide__start-actions">
          <BaseButton variant="link" icon-left="workflow" @click="openTarget('workflows')">
            Open Workflow Editor
          </BaseButton>
          <BaseButton variant="link" icon-left="panel-top" @click="openTarget('pages')">
            Open Pages Editor
          </BaseButton>
        </div>
      </div>

      <footer class="welcome-profile-guide__actions">
        <BaseButton variant="ghost" @click="skip">Skip</BaseButton>
        <div class="welcome-profile-guide__step-actions">
          <BaseButton variant="secondary" :disabled="isFirstStep" @click="flow.back">
            Back
          </BaseButton>
          <BaseButton v-if="!flow.isLastStep" variant="primary" @click="flow.next">
            Next
          </BaseButton>
          <BaseButton v-else variant="primary" @click="complete">
            Done
          </BaseButton>
        </div>
      </footer>
    </section>
  </GuideModal>
</template>

<style scoped>
.welcome-profile-guide {
  min-width: 0;
}

.welcome-profile-guide__step-count {
  padding: var(--fabric-space-3) var(--fabric-space-5) 0;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.welcome-profile-guide__step {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-6) var(--fabric-space-5);
}

.welcome-profile-guide__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-accent);
  background: var(--fabric-bg-base);
}

.welcome-profile-guide h3,
.welcome-profile-guide p {
  margin: 0;
}

.welcome-profile-guide h3 {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xl);
}

.welcome-profile-guide p {
  max-width: 560px;
  color: var(--fabric-text-secondary);
  line-height: 1.6;
}

.welcome-profile-guide__start-actions,
.welcome-profile-guide__step-actions,
.welcome-profile-guide__actions {
  display: flex;
  gap: var(--fabric-space-2);
}

.welcome-profile-guide__start-actions {
  flex-direction: column;
  align-items: flex-start;
  margin-top: var(--fabric-space-2);
}

.welcome-profile-guide__actions {
  align-items: center;
  justify-content: space-between;
  padding: var(--fabric-space-4) var(--fabric-space-5);
  border-top: 1px solid var(--fabric-border);
}
</style>

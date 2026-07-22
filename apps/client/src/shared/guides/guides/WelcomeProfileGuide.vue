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
type WelcomeGuideLang = 'en' | 'pt' | 'es' | 'fr'

const languageOptions: Array<{ value: WelcomeGuideLang; label: string; shortLabel: string }> = [
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'pt', label: 'Portuguese', shortLabel: 'PT' },
  { value: 'es', label: 'Spanish', shortLabel: 'ES' },
  { value: 'fr', label: 'French', shortLabel: 'FR' },
]

const copy = {
  en: {
    titles: {
      welcome: 'Welcome to Fabric',
      shortcuts: 'Workspace shortcuts',
      start: 'Start building',
    },
    welcome: {
      heading: 'Fabric starts from Home.',
      body: 'Use Home as your profile workspace: open editors, jump into panels, and keep the main tools close without hunting through menus.',
    },
    shortcuts: {
      heading: 'Your quick panels are already wired.',
      body: 'Monitoring, Plugin Installer, and Settings are available from the Home shortcuts. Guides will use this same lightweight flow.',
    },
    start: {
      heading: 'Choose where to begin.',
      body: 'Start with automations in the Workflow Editor, or build a workflow-connected surface in Pages.',
      workflow: 'Open Workflow Editor',
      pages: 'Open Pages Editor',
    },
    actions: {
      skip: 'Skip',
      back: 'Back',
      next: 'Next',
      done: 'Done',
    },
  },
  pt: {
    titles: {
      welcome: 'Bem-vindo ao Fabric',
      shortcuts: 'Atalhos do workspace',
      start: 'Comece a criar',
    },
    welcome: {
      heading: 'O Fabric começa pela Home.',
      body: 'Use a Home como workspace do profile: abra editores, acesse paineis e mantenha as ferramentas principais por perto.',
    },
    shortcuts: {
      heading: 'Seus paineis rapidos ja estao conectados.',
      body: 'Monitoring, Plugin Installer e Settings ficam disponiveis pelos atalhos da Home. Os guias usam esse mesmo fluxo leve.',
    },
    start: {
      heading: 'Escolha por onde comecar.',
      body: 'Comece com automacoes no Workflow Editor ou crie uma superficie conectada a workflows no Pages.',
      workflow: 'Abrir Workflow Editor',
      pages: 'Abrir Pages Editor',
    },
    actions: {
      skip: 'Pular',
      back: 'Voltar',
      next: 'Proximo',
      done: 'Concluir',
    },
  },
  es: {
    titles: {
      welcome: 'Bienvenido a Fabric',
      shortcuts: 'Atajos del workspace',
      start: 'Empieza a crear',
    },
    welcome: {
      heading: 'Fabric empieza en Home.',
      body: 'Usa Home como workspace del perfil: abre editores, accede a paneles y manten las herramientas principales cerca.',
    },
    shortcuts: {
      heading: 'Tus paneles rapidos ya estan conectados.',
      body: 'Monitoring, Plugin Installer y Settings estan disponibles desde los atajos de Home. Las guias usan este mismo flujo ligero.',
    },
    start: {
      heading: 'Elige por donde empezar.',
      body: 'Empieza con automatizaciones en Workflow Editor o crea una superficie conectada a workflows en Pages.',
      workflow: 'Abrir Workflow Editor',
      pages: 'Abrir Pages Editor',
    },
    actions: {
      skip: 'Saltar',
      back: 'Atras',
      next: 'Siguiente',
      done: 'Listo',
    },
  },
  fr: {
    titles: {
      welcome: 'Bienvenue dans Fabric',
      shortcuts: 'Raccourcis du workspace',
      start: 'Commencer a creer',
    },
    welcome: {
      heading: 'Fabric commence dans Home.',
      body: 'Utilisez Home comme workspace de profil: ouvrez les editeurs, accedez aux panneaux et gardez les outils principaux a portee.',
    },
    shortcuts: {
      heading: 'Vos panneaux rapides sont deja connectes.',
      body: 'Monitoring, Plugin Installer et Settings sont disponibles depuis les raccourcis Home. Les guides utilisent ce meme flux leger.',
    },
    start: {
      heading: 'Choisissez par ou commencer.',
      body: 'Commencez avec des automatisations dans Workflow Editor ou creez une surface connectee aux workflows dans Pages.',
      workflow: 'Ouvrir Workflow Editor',
      pages: 'Ouvrir Pages Editor',
    },
    actions: {
      skip: 'Ignorer',
      back: 'Retour',
      next: 'Suivant',
      done: 'Terminer',
    },
  },
} satisfies Record<WelcomeGuideLang, {
  titles: Record<(typeof guideSteps)[number], string>
  welcome: { heading: string; body: string }
  shortcuts: { heading: string; body: string }
  start: { heading: string; body: string; workflow: string; pages: string }
  actions: { skip: string; back: string; next: string; done: string }
}>

const router = useRouter()
const profileStore = useProfileStore()
const flow = useGuideFlow(guideSteps)
const isOpen = ref(false)
const activeLang = ref<WelcomeGuideLang>('en')

const currentProfileId = computed(() => profileStore.currentProfile?.id ?? null)
const activeStepNumber = computed(() => flow.stepIndex.value + 1)
const stepCount = computed(() => flow.stepCount.value)
const isFirstStep = computed(() => flow.isFirstStep.value)
const isLastStep = computed(() => flow.isLastStep.value)
const guideCopy = computed(() => copy[activeLang.value])
const title = computed(() => guideCopy.value.titles[flow.activeStep.value ?? 'welcome'])

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
        <span>{{ activeStepNumber }} / {{ stepCount }}</span>
        <div class="welcome-profile-guide__language" aria-label="Guide language">
          <button
            v-for="option in languageOptions"
            :key="option.value"
            type="button"
            class="welcome-profile-guide__language-option"
            :class="{ 'is-active': activeLang === option.value }"
            :aria-pressed="activeLang === option.value"
            :title="option.label"
            @click="activeLang = option.value"
          >
            {{ option.shortLabel }}
          </button>
        </div>
      </div>

      <div v-if="flow.is('welcome')" class="welcome-profile-guide__step">
        <span class="welcome-profile-guide__icon">
          <LucideIcon name="home" :size="22" />
        </span>
        <h3>{{ guideCopy.welcome.heading }}</h3>
        <p>{{ guideCopy.welcome.body }}</p>
      </div>

      <div v-else-if="flow.is('shortcuts')" class="welcome-profile-guide__step">
        <span class="welcome-profile-guide__icon">
          <LucideIcon name="panel-top" :size="22" />
        </span>
        <h3>{{ guideCopy.shortcuts.heading }}</h3>
        <p>{{ guideCopy.shortcuts.body }}</p>
      </div>

      <div v-else class="welcome-profile-guide__step">
        <span class="welcome-profile-guide__icon">
          <LucideIcon name="workflow" :size="22" />
        </span>
        <h3>{{ guideCopy.start.heading }}</h3>
        <p>{{ guideCopy.start.body }}</p>
        <div class="welcome-profile-guide__start-actions">
          <BaseButton variant="link" icon-left="workflow" @click="openTarget('workflows')">
            {{ guideCopy.start.workflow }}
          </BaseButton>
          <BaseButton variant="link" icon-left="panel-top" @click="openTarget('pages')">
            {{ guideCopy.start.pages }}
          </BaseButton>
        </div>
      </div>

      <footer class="welcome-profile-guide__actions">
        <BaseButton variant="ghost" @click="skip">{{ guideCopy.actions.skip }}</BaseButton>
        <div class="welcome-profile-guide__step-actions">
          <BaseButton variant="secondary" :disabled="isFirstStep" @click="flow.back">
            {{ guideCopy.actions.back }}
          </BaseButton>
          <BaseButton v-if="!isLastStep" variant="primary" @click="flow.next">
            {{ guideCopy.actions.next }}
          </BaseButton>
          <BaseButton v-else variant="primary" @click="complete">
            {{ guideCopy.actions.done }}
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-3) var(--fabric-space-5) 0;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.welcome-profile-guide__language {
  display: inline-flex;
  gap: 2px;
}

.welcome-profile-guide__language-option {
  height: 24px;
  min-width: 30px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: var(--fabric-radius-sm);
  background: transparent;
  color: var(--fabric-text-muted);
  cursor: pointer;
  font: inherit;
  font-weight: var(--fabric-font-semibold);
}

.welcome-profile-guide__language-option:hover,
.welcome-profile-guide__language-option.is-active {
  border-color: var(--fabric-border);
  background: var(--fabric-bg-base);
  color: var(--fabric-text-primary);
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

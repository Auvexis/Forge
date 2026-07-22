<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseSegmentedSelect, {
  type BaseSegmentedSelectOption,
} from '@/shared/components/base/BaseSegmentedSelect.vue'
import BaseThemeSelect from '@/shared/components/base/BaseThemeSelect.vue'
import { useTheme, type ThemeMode } from '@/shared/composables/useTheme'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useGuideFlow } from '../composables/useGuideFlow'
import {
  hasCompletedGuide,
  markGuideCompleted,
  markGuideSkipped,
} from '../composables/useGuideProgress'

const GUIDE_ID = 'welcome-profile'
const GUIDE_VERSION = 1
const GUIDE_SCOPE = 'profile'
const guideSteps = ['welcome', 'workflow', 'pages', 'theme', 'plugins', 'monitoring'] as const
type WelcomeGuideStep = (typeof guideSteps)[number]
type WelcomeGuideLang = 'en' | 'pt' | 'es' | 'fr'
type WelcomeGuideLayout = 'center' | 'media-left' | 'media-right' | 'media-top' | 'media-bottom'

const languageOptions: BaseSegmentedSelectOption[] = [
  { value: 'en', label: 'EN', title: 'English', emojiIcon: '🇺🇸' },
  { value: 'pt', label: 'PT', title: 'Portuguese', emojiIcon: '🇧🇷' },
  { value: 'es', label: 'ES', title: 'Spanish', emojiIcon: '🇪🇸' },
  { value: 'fr', label: 'FR', title: 'French', emojiIcon: '🇫🇷' },
]

const stepLayouts: Record<WelcomeGuideStep, WelcomeGuideLayout> = {
  welcome: 'center',
  workflow: 'media-left',
  pages: 'media-right',
  theme: 'media-bottom',
  plugins: 'media-top',
  monitoring: 'media-bottom',
}

const stepIcons: Partial<Record<WelcomeGuideStep, string>> = {
  workflow: 'workflow',
  pages: 'panel-top',
  plugins: 'plug',
  monitoring: 'activity',
}

const copy = {
  en: {
    titles: {
      welcome: 'Welcome to Fabric',
      workflow: 'Workflow Editor',
      pages: 'Pages Editor',
      theme: 'Choose a Theme',
      plugins: 'Plugin Installer',
      monitoring: 'Monitoring Panel',
    },
    steps: {
      welcome: {
        heading: 'Fabric is your profile workspace.',
        body: 'Start from Home to open editors, manage panels, and keep your most important tools close.',
      },
      workflow: {
        heading: 'Build automations visually.',
        body: 'Use the Workflow Editor to connect nodes, run executions, and iterate on automations without leaving the workspace.',
      },
      pages: {
        heading: 'Create workflow-connected pages.',
        body: 'Pages Editor helps you compose interfaces that can talk to workflows, forms, data, and actions.',
      },
      theme: {
        heading: 'Pick the interface theme.',
        body: 'Choose the visual mode that feels best for long sessions. You can change it later in Settings.',
      },
      plugins: {
        heading: 'Install the integrations you need.',
        body: 'Plugin Installer is where Fabric grows new capabilities, from services and tools to custom workflow actions.',
      },
      monitoring: {
        heading: 'Watch what Fabric is doing.',
        body: 'Monitoring Panel keeps executions, activity, and system feedback visible while you build and run.',
      },
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
      workflow: 'Workflow Editor',
      pages: 'Pages Editor',
      theme: 'Escolha um Tema',
      plugins: 'Plugin Installer',
      monitoring: 'Monitoring Panel',
    },
    steps: {
      welcome: {
        heading: 'Fabric e o workspace do seu profile.',
        body: 'Comece pela Home para abrir editores, gerenciar paineis e manter as ferramentas importantes por perto.',
      },
      workflow: {
        heading: 'Construa automacoes visualmente.',
        body: 'Use o Workflow Editor para conectar nodes, executar fluxos e iterar em automacoes sem sair do workspace.',
      },
      pages: {
        heading: 'Crie paginas conectadas a workflows.',
        body: 'O Pages Editor ajuda a montar interfaces que conversam com workflows, forms, dados e acoes.',
      },
      theme: {
        heading: 'Escolha o tema da interface.',
        body: 'Selecione o modo visual mais confortavel para sessoes longas. Voce pode mudar depois em Settings.',
      },
      plugins: {
        heading: 'Instale as integracoes que voce precisa.',
        body: 'O Plugin Installer e onde o Fabric ganha novas capacidades, de servicos e ferramentas a acoes customizadas.',
      },
      monitoring: {
        heading: 'Acompanhe o que o Fabric esta fazendo.',
        body: 'O Monitoring Panel mostra execucoes, atividade e feedback do sistema enquanto voce cria e roda.',
      },
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
      workflow: 'Workflow Editor',
      pages: 'Pages Editor',
      theme: 'Elige un Tema',
      plugins: 'Plugin Installer',
      monitoring: 'Monitoring Panel',
    },
    steps: {
      welcome: {
        heading: 'Fabric es tu workspace de perfil.',
        body: 'Empieza desde Home para abrir editores, gestionar paneles y mantener cerca tus herramientas principales.',
      },
      workflow: {
        heading: 'Construye automatizaciones visualmente.',
        body: 'Usa Workflow Editor para conectar nodes, ejecutar flujos e iterar automatizaciones sin salir del workspace.',
      },
      pages: {
        heading: 'Crea paginas conectadas a workflows.',
        body: 'Pages Editor te ayuda a componer interfaces que hablan con workflows, formularios, datos y acciones.',
      },
      theme: {
        heading: 'Elige el tema de la interfaz.',
        body: 'Selecciona el modo visual mas comodo para sesiones largas. Puedes cambiarlo luego en Settings.',
      },
      plugins: {
        heading: 'Instala las integraciones que necesitas.',
        body: 'Plugin Installer es donde Fabric suma capacidades, desde servicios y herramientas hasta acciones custom.',
      },
      monitoring: {
        heading: 'Observa lo que Fabric esta haciendo.',
        body: 'Monitoring Panel muestra ejecuciones, actividad y feedback del sistema mientras creas y ejecutas.',
      },
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
      workflow: 'Workflow Editor',
      pages: 'Pages Editor',
      theme: 'Choisir un Theme',
      plugins: 'Plugin Installer',
      monitoring: 'Monitoring Panel',
    },
    steps: {
      welcome: {
        heading: 'Fabric est votre workspace de profil.',
        body: 'Commencez depuis Home pour ouvrir les editeurs, gerer les panneaux et garder les outils importants a portee.',
      },
      workflow: {
        heading: 'Construisez des automatisations visuellement.',
        body: 'Utilisez Workflow Editor pour connecter des nodes, lancer des executions et iterer sans quitter le workspace.',
      },
      pages: {
        heading: 'Creez des pages connectees aux workflows.',
        body: 'Pages Editor aide a composer des interfaces connectees aux workflows, formulaires, donnees et actions.',
      },
      theme: {
        heading: "Choisissez le theme de l'interface.",
        body: 'Selectionnez le mode visuel le plus confortable pour les longues sessions. Vous pourrez le changer dans Settings.',
      },
      plugins: {
        heading: 'Installez les integrations necessaires.',
        body: 'Plugin Installer permet a Fabric de gagner des capacites, des services et outils aux actions personnalisees.',
      },
      monitoring: {
        heading: 'Suivez ce que Fabric fait.',
        body: 'Monitoring Panel montre les executions, activites et retours du systeme pendant que vous construisez.',
      },
    },
    actions: {
      skip: 'Ignorer',
      back: 'Retour',
      next: 'Suivant',
      done: 'Terminer',
    },
  },
} satisfies Record<WelcomeGuideLang, {
  titles: Record<WelcomeGuideStep, string>
  steps: Record<WelcomeGuideStep, { heading: string; body: string }>
  actions: { skip: string; back: string; next: string; done: string }
}>

const profileStore = useProfileStore()
const flow = useGuideFlow(guideSteps)
const { mode, setMode } = useTheme()
const isOpen = ref(false)
const activeLang = ref<WelcomeGuideLang>('en')

const currentProfileId = computed(() => profileStore.currentProfile?.id ?? null)
const isFirstStep = computed(() => flow.isFirstStep.value)
const isLastStep = computed(() => flow.isLastStep.value)
const activeStep = computed<WelcomeGuideStep>(() => flow.activeStep.value ?? 'welcome')
const guideCopy = computed(() => copy[activeLang.value])
const title = computed(() => guideCopy.value.titles[activeStep.value])
const stepCopy = computed(() => guideCopy.value.steps[activeStep.value])
const stepLayout = computed(() => stepLayouts[activeStep.value])
const themeValue = computed<ThemeMode>(() => mode.value)

onMounted(async () => {
  if (!profileStore.currentProfile && !profileStore.isLoading) {
    await profileStore.loadProfiles()
  }
  openIfNeeded()
})

function setLanguage(value: string) {
  if (value === 'en' || value === 'pt' || value === 'es' || value === 'fr') {
    activeLang.value = value
  }
}

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

function handleThemeChange(value: ThemeMode) {
  setMode(value)
}
</script>

<template>
  <BaseModal :is-open="isOpen" max-width="980px" height="min(720px, calc(100vh - 64px))" @close="skip">
    <section class="welcome-profile-guide">
      <header class="welcome-profile-guide__header">
        <div class="welcome-profile-guide__header-title">
          <h2>{{ title }}</h2>
        </div>

        <BaseSegmentedSelect
          class="welcome-profile-guide__language"
          :model-value="activeLang"
          :options="languageOptions"
          aria-label="Guide language"
          @update:model-value="setLanguage"
        />
      </header>

      <main class="welcome-profile-guide__body">
        <Transition name="welcome-profile-guide-step" mode="out-in">
          <div
            :key="activeStep"
            class="welcome-profile-guide__step"
            :class="[
              `welcome-profile-guide__step--${stepLayout}`,
              `welcome-profile-guide__step--${activeStep}`,
            ]"
          >
            <div v-if="activeStep === 'welcome'" class="welcome-profile-guide__welcome-mark">
              <img src="/favicon.svg" alt="Fabric" />
            </div>

            <div
              v-else-if="stepLayout === 'media-left' || stepLayout === 'media-top'"
              class="welcome-profile-guide__media-slot"
            >
              <LucideIcon :name="stepIcons[activeStep] ?? 'sparkles'" :size="34" />
            </div>

            <div class="welcome-profile-guide__copy">
              <h3>{{ stepCopy.heading }}</h3>
              <p>{{ stepCopy.body }}</p>
            </div>

            <BaseThemeSelect
              v-if="activeStep === 'theme'"
              class="welcome-profile-guide__theme-select"
              :model-value="themeValue"
              @update:model-value="handleThemeChange"
            />

            <div
              v-else-if="stepLayout === 'media-right' || stepLayout === 'media-bottom'"
              class="welcome-profile-guide__media-slot"
            >
              <LucideIcon :name="stepIcons[activeStep] ?? 'sparkles'" :size="34" />
            </div>
          </div>
        </Transition>
      </main>

      <footer class="welcome-profile-guide__footer">
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
  </BaseModal>
</template>

<style scoped>
.welcome-profile-guide {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  color: var(--fabric-text-primary);
}

.welcome-profile-guide__header,
.welcome-profile-guide__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-4);
  min-height: 72px;
  padding: 0 var(--fabric-space-8);
}

.welcome-profile-guide__header-title {
  display: flex;
  align-items: baseline;
  gap: var(--fabric-space-3);
  min-width: 0;
}

.welcome-profile-guide__header-title h2 {
  margin: 0;
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xl);
}

.welcome-profile-guide__header-title span {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.welcome-profile-guide__language {
  flex: 0 0 auto;
}

.welcome-profile-guide__body {
  display: flex;
  position: relative;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: var(--fabric-space-8);
}

.welcome-profile-guide__step {
  display: flex;
  width: min(820px, 100%);
  align-items: center;
  justify-content: center;
  gap: clamp(32px, 6vw, 72px);
}

.welcome-profile-guide__step--center,
.welcome-profile-guide__step--media-top,
.welcome-profile-guide__step--media-bottom {
  flex-direction: column;
  text-align: center;
}

.welcome-profile-guide__step--media-left,
.welcome-profile-guide__step--media-right {
  flex-direction: row;
}

.welcome-profile-guide__copy {
  display: flex;
  max-width: 470px;
  flex-direction: column;
  gap: var(--fabric-space-3);
}

.welcome-profile-guide__step--center .welcome-profile-guide__copy,
.welcome-profile-guide__step--media-top .welcome-profile-guide__copy,
.welcome-profile-guide__step--media-bottom .welcome-profile-guide__copy {
  align-items: center;
}

.welcome-profile-guide__welcome-mark {
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
}

.welcome-profile-guide__welcome-mark img {
  display: block;
  width: 82px;
  height: 82px;
}

.welcome-profile-guide__media-slot {
  display: grid;
  place-items: center;
  width: min(340px, 42vw);
  aspect-ratio: 16 / 10;
  background:
    linear-gradient(90deg, transparent 0 48%, color-mix(in srgb, var(--fabric-border-muted) 36%, transparent) 48% 52%, transparent 52%),
    linear-gradient(180deg, transparent 0 48%, color-mix(in srgb, var(--fabric-border-muted) 36%, transparent) 48% 52%, transparent 52%),
    var(--fabric-bg-surface);
  color: var(--fabric-text-muted);
}

.welcome-profile-guide__theme-select {
  width: min(492px, 100%);
}

.welcome-profile-guide h3,
.welcome-profile-guide p {
  margin: 0;
}

.welcome-profile-guide h3 {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xl);
  line-height: 1.25;
}

.welcome-profile-guide p {
  color: var(--fabric-text-secondary);
  line-height: 1.6;
}

.welcome-profile-guide__step-actions {
  display: flex;
  gap: var(--fabric-space-2);
}

.welcome-profile-guide-step-enter-active,
.welcome-profile-guide-step-leave-active {
  transition:
    opacity var(--fabric-duration-base) var(--fabric-ease-standard),
    transform var(--fabric-duration-base) var(--fabric-ease-standard);
}

.welcome-profile-guide-step-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.welcome-profile-guide-step-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 780px) {
  .welcome-profile-guide__header,
  .welcome-profile-guide__footer {
    align-items: stretch;
    flex-direction: column;
    justify-content: center;
    padding: var(--fabric-space-4);
  }

  .welcome-profile-guide__body {
    padding: var(--fabric-space-5);
  }

  .welcome-profile-guide__step,
  .welcome-profile-guide__step--media-left,
  .welcome-profile-guide__step--media-right {
    flex-direction: column;
    text-align: center;
  }

  .welcome-profile-guide__copy {
    align-items: center;
  }

  .welcome-profile-guide__media-slot {
    width: min(300px, 100%);
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useStartGuide } from './useStartGuide'
import { startGuidePreviewComponents } from './startGuidePreviewComponents'
import type { StartGuideLang } from './startGuide.types'

const startGuide = useStartGuide()
const controller = startGuide.controller
const languageOptions: Array<{ value: StartGuideLang; label: string; shortLabel: string }> = [
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'pt', label: 'Portugues', shortLabel: 'PT' },
  { value: 'es', label: 'Espanol', shortLabel: 'ES' },
]

const step = computed(() => controller.activeStep)
const guide = computed(() => controller.activeGuide)
const stepText = computed(() => {
  const current = step.value
  const currentGuide = guide.value
  if (!current || !currentGuide) return null
  return current.lang[controller.activeLang] ?? current.lang[currentGuide.defaultLang]
})
const preview = computed(() => step.value?.preview)
const previewComponent = computed(() => {
  const currentPreview = preview.value
  if (currentPreview?.type !== 'component') return null
  return startGuidePreviewComponents[currentPreview.component] ?? null
})
const previewComponentProps = computed(() => {
  const currentPreview = preview.value
  if (currentPreview?.type !== 'component') return {}
  return {
    ...currentPreview.props,
    lang: controller.activeLang,
  }
})
const isFirstStep = computed(() => controller.activeStepIndex === 0)
const isLastStep = computed(() => {
  if (!guide.value) return true
  return controller.activeStepIndex >= guide.value.steps.length - 1
})

function selectLang(lang: string) {
  controller.setLang(lang as StartGuideLang)
}
</script>

<template>
  <section v-if="guide && step && stepText" class="start-guide surface" role="dialog" aria-modal="true">
    <div class="start-guide__preview">
      <img
        v-if="preview?.type === 'image'"
        class="start-guide__media"
        :src="preview.src"
        :alt="preview.alt ?? stepText.title"
      />
      <img
        v-else-if="preview?.type === 'gif'"
        class="start-guide__media"
        :src="preview.src"
        :alt="preview.alt ?? stepText.title"
      />
      <video
        v-else-if="preview?.type === 'video'"
        class="start-guide__media"
        :src="preview.src"
        :aria-label="preview.alt ?? stepText.title"
        autoplay
        loop
        muted
        playsinline
      />
      <component
        :is="previewComponent"
        v-else-if="preview?.type === 'component' && previewComponent"
        v-bind="previewComponentProps"
        class="start-guide__component-preview"
      />
      <div v-else class="start-guide__placeholder">{{ guide.categoryLabel ?? guide.category }}</div>
    </div>

    <div class="start-guide__content">
      <div class="start-guide__meta">
        <p class="start-guide__count">{{ controller.activeStepIndex + 1 }} / {{ guide.steps.length }}</p>
        <div class="start-guide__language" aria-label="Language">
          <button
            v-for="option in languageOptions"
            :key="option.value"
            type="button"
            class="start-guide__language-option"
            :class="{ 'start-guide__language-option--active': option.value === controller.activeLang }"
            :aria-pressed="option.value === controller.activeLang"
            :title="option.label"
            @click="selectLang(option.value)"
          >
            {{ option.shortLabel }}
          </button>
        </div>
      </div>
      <h2>{{ stepText.title }}</h2>
      <p>{{ stepText.description }}</p>
    </div>

    <div class="start-guide__actions">
      <BaseButton variant="ghost" @click="startGuide.skip">{{ stepText.skipBtn ?? 'Skip' }}</BaseButton>
      <div class="start-guide__step-actions">
        <BaseButton variant="secondary" :disabled="isFirstStep" @click="controller.prevStep">
          {{ stepText.prevBtn ?? 'Back' }}
        </BaseButton>
        <BaseButton v-if="!isLastStep" variant="primary" @click="controller.nextStep">
          {{ stepText.nextBtn ?? 'Next' }}
        </BaseButton>
        <BaseButton v-else variant="primary" @click="startGuide.complete">
          {{ stepText.doneBtn ?? 'Done' }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.start-guide {
  width: min(860px, calc(100vw - 32px));
  background: var(--fabric-bg-surface);
  border: 2px solid var(--fabric-border);
  border-radius: var(--fabric-radius-xl);
  box-shadow: var(--fabric-shadow-lg);
  overflow: hidden;
}

.start-guide__preview {
  height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fabric-bg-base);
  border-bottom: 1px solid var(--fabric-border);
}

.start-guide__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.start-guide__component-preview {
  width: 100%;
  height: 100%;
}

.start-guide__placeholder {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
}

.start-guide__content {
  padding: var(--fabric-space-6);
}

.start-guide__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-4);
  margin: 0 0 var(--fabric-space-3);
}

.start-guide__count {
  margin: 0;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.start-guide__language {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-base);
  padding: 2px;
}

.start-guide__language-option {
  min-width: 34px;
  height: 28px;
  border: 0;
  border-radius: calc(var(--fabric-radius-sm) - 2px);
  background: transparent;
  color: var(--fabric-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
}

.start-guide__language-option--active {
  background: var(--fabric-button-primary-bg);
  color: var(--fabric-button-primary-text);
}

.start-guide__content h2 {
  margin: 0 0 var(--fabric-space-2);
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xl);
}

.start-guide__content p {
  margin: 0;
  color: var(--fabric-text-secondary);
  line-height: 1.6;
}

.start-guide__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-5) var(--fabric-space-6);
  border-top: 1px solid var(--fabric-border);
}

.start-guide__step-actions {
  display: flex;
  gap: var(--fabric-space-2);
}

@media (max-width: 640px) {
  .start-guide__preview {
    height: 300px;
  }

  .start-guide__actions,
  .start-guide__meta {
    align-items: stretch;
    flex-direction: column;
  }

  .start-guide__step-actions {
    justify-content: flex-end;
  }
}
</style>

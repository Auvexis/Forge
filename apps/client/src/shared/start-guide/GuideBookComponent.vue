<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { startGuideRegistry } from './startGuide.registry'
import { useStartGuide } from './useStartGuide'
import type { StartGuideDefinition } from './startGuide.types'

const emit = defineEmits<{
  close: []
}>()

const startGuide = useStartGuide()

interface GuideGroup {
  category: string
  label: string
  guides: StartGuideDefinition[]
}

const groupedGuides = computed<GuideGroup[]>(() => {
  const groups = new Map<string, GuideGroup>()

  for (const guide of Object.values(startGuideRegistry)) {
    const category = guide.category
    const existing = groups.get(category)
    if (existing) {
      existing.guides.push(guide)
    } else {
      groups.set(category, {
        category,
        label: guide.categoryLabel ?? category,
        guides: [guide],
      })
    }
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
})

function guideTitle(guide: StartGuideDefinition) {
  const firstStep = guide.steps[0]
  return firstStep?.lang[guide.defaultLang]?.title ?? guide.featureId
}

function guideDescription(guide: StartGuideDefinition) {
  const firstStep = guide.steps[0]
  return firstStep?.lang[guide.defaultLang]?.description ?? ''
}

function openGuide(guide: StartGuideDefinition) {
  startGuide.open(guide.featureId)
  emit('close')
}
</script>

<template>
  <section
    class="guide-book surface"
    role="dialog"
    aria-modal="true"
    aria-labelledby="guide-book-title"
  >
    <header class="guide-book__header">
      <div>
        <p class="guide-book__eyebrow">Fabric Guides</p>
        <h2 id="guide-book-title">Guide Book</h2>
      </div>
      <BaseButton type="button" variant="ghost" size="icon" icon-left="x" @click="emit('close')" />
    </header>

    <div class="guide-book__body">
      <section v-for="group in groupedGuides" :key="group.category" class="guide-book__group">
        <h3>{{ group.label }}</h3>
        <div class="guide-book__items">
          <article v-for="guide in group.guides" :key="guide.featureId" class="guide-book__item">
            <div>
              <h4>{{ guideTitle(guide) }}</h4>
              <p>{{ guideDescription(guide) }}</p>
            </div>
            <BaseButton
              type="button"
              size="sm"
              variant="outline"
              icon-left="play"
              @click="openGuide(guide)"
            >
              Open
            </BaseButton>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.guide-book {
  width: min(720px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 32px));
  display: flex;
  flex-direction: column;
  background: var(--fabric-bg-surface);
  border: 2px solid var(--fabric-border);
  border-radius: var(--fabric-radius-xl);
  box-shadow: var(--fabric-shadow-xl);
}

.guide-book__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--fabric-space-4);
  padding: var(--fabric-space-5);
  border-bottom: 1px solid var(--fabric-border);
}

.guide-book__eyebrow,
.guide-book__header h2,
.guide-book__group h3,
.guide-book__item h4,
.guide-book__item p {
  margin: 0;
}

.guide-book__eyebrow {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.guide-book__header h2 {
  margin-top: var(--fabric-space-1);
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xl);
}

.guide-book__body {
  overflow-y: auto;
  padding: var(--fabric-space-5);
}

.guide-book__group + .guide-book__group {
  margin-top: var(--fabric-space-6);
}

.guide-book__group h3 {
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-sm);
}

.guide-book__items {
  display: grid;
  gap: var(--fabric-space-3);
  margin-top: var(--fabric-space-3);
}

.guide-book__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-4);
  padding: var(--fabric-space-4);
  background: var(--fabric-bg-base);
  border-radius: var(--fabric-radius-sm);
}

.guide-book__item h4 {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-sm);
}

.guide-book__item p {
  margin-top: var(--fabric-space-1);
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  line-height: 1.5;
}
</style>

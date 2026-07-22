<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    title: string
    description: string
    icon: string
    accent: string
    primaryLabel: string
    secondaryLabel: string
    preview: 'workflow' | 'pages'
  }>(),
  {
    accent: '#60a5fa',
  },
)

defineEmits<{
  primary: []
  secondary: []
}>()
</script>

<template>
  <section class="home-product" :style="{ '--home-accent': accent }">
    <div class="home-product__preview" aria-hidden="true">
      <div v-if="preview === 'workflow'" class="home-product__workflow-preview">
        <span class="home-product__node is-trigger" />
        <span class="home-product__connector" />
        <span class="home-product__node is-action" />
        <span class="home-product__connector is-short" />
        <span class="home-product__node is-output" />
      </div>
      <div v-else class="home-product__pages-preview">
        <span class="home-product__page-toolbar" />
        <span class="home-product__page-hero" />
        <span class="home-product__page-row" />
        <span class="home-product__page-row is-short" />
      </div>
    </div>

    <div class="home-product__body">
      <div class="home-product__title">
        <span class="home-product__icon">
          <LucideIcon :name="icon" :size="18" />
        </span>
        <h2>{{ title }}</h2>
      </div>
      <p>{{ description }}</p>
      <div class="home-product__actions">
        <BaseButton variant="primary" @click="$emit('primary')">
          {{ primaryLabel }}
        </BaseButton>
        <BaseButton variant="secondary" @click="$emit('secondary')">
          {{ secondaryLabel }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-product {
  display: grid;
  grid-template-columns: minmax(280px, 0.88fr) minmax(320px, 1fr);
  min-height: 320px;
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-surface);
}

.home-product__preview {
  display: grid;
  place-items: center;
  min-height: 320px;
  border-right: 1px solid var(--fabric-border);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--home-accent) 12%, transparent), transparent 58%),
    var(--fabric-bg-base);
}

.home-product__workflow-preview,
.home-product__pages-preview {
  width: min(360px, calc(100% - 48px));
  padding: var(--fabric-space-4);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-surface);
}

.home-product__workflow-preview {
  display: grid;
  gap: 14px;
}

.home-product__node {
  width: 128px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--home-accent) 50%, var(--fabric-border));
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-elevated);
  animation: home-node-pulse 4s ease-in-out infinite;
}

.home-product__node.is-action {
  justify-self: center;
  animation-delay: 450ms;
}

.home-product__node.is-output {
  justify-self: end;
  animation-delay: 900ms;
}

.home-product__connector {
  width: 54%;
  height: 2px;
  justify-self: center;
  background: var(--fabric-border);
}

.home-product__connector.is-short {
  width: 34%;
}

.home-product__pages-preview {
  display: grid;
  gap: var(--fabric-space-3);
}

.home-product__page-toolbar,
.home-product__page-hero,
.home-product__page-row {
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-elevated);
}

.home-product__page-toolbar {
  width: 56%;
  height: 12px;
}

.home-product__page-hero {
  height: 112px;
  border: 1px solid color-mix(in srgb, var(--home-accent) 48%, var(--fabric-border));
}

.home-product__page-row {
  height: 14px;
}

.home-product__page-row.is-short {
  width: 62%;
}

.home-product__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  padding: var(--fabric-space-6);
}

.home-product__title {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-3);
}

.home-product__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--home-accent) 48%, var(--fabric-border));
  border-radius: var(--fabric-radius-sm);
  color: var(--home-accent);
  background: color-mix(in srgb, var(--home-accent) 12%, transparent);
}

.home-product h2,
.home-product p {
  margin: 0;
}

.home-product h2 {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-2xl);
}

.home-product p {
  margin-top: var(--fabric-space-4);
  color: var(--fabric-text-secondary);
  line-height: 1.65;
}

.home-product__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fabric-space-2);
  margin-top: var(--fabric-space-5);
}

@keyframes home-node-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--home-accent) 0%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--home-accent) 16%, transparent);
  }
}

@media (max-width: 860px) {
  .home-product {
    grid-template-columns: 1fr;
  }

  .home-product__preview {
    border-right: 0;
    border-bottom: 1px solid var(--fabric-border);
  }
}
</style>

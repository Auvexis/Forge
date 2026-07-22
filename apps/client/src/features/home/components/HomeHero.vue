<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'

defineEmits<{
  createWorkflow: []
  openPages: []
}>()
</script>

<template>
  <section class="home-hero" aria-labelledby="home-hero-title">
    <div class="home-hero__visual" aria-hidden="true">
      <div class="home-hero__window home-hero__window--workflow">
        <span class="home-hero__bar" />
        <span class="home-hero__node is-green" />
        <span class="home-hero__line" />
        <span class="home-hero__node is-blue" />
        <span class="home-hero__line is-short" />
        <span class="home-hero__node is-amber" />
      </div>
      <div class="home-hero__window home-hero__window--pages">
        <span class="home-hero__bar" />
        <span class="home-hero__page-line is-wide" />
        <span class="home-hero__page-line" />
        <span class="home-hero__page-card" />
      </div>
    </div>

    <div class="home-hero__copy">
      <p class="home-hero__eyebrow">Fabric Studio</p>
      <h1 id="home-hero-title">Build workflows, pages, plugins, and production systems in one workspace.</h1>
      <p>
        Start from the editor you need, inspect what is running, and keep your profile ready for
        daily automation work.
      </p>
      <div class="home-hero__actions">
        <BaseButton variant="primary" icon-left="workflow" @click="$emit('createWorkflow')">
          New Workflow
        </BaseButton>
        <BaseButton variant="secondary" icon-left="panel-top" @click="$emit('openPages')">
          Open Pages
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--fabric-space-5);
  padding: var(--fabric-space-8) var(--fabric-space-6) var(--fabric-space-6);
  border-bottom: 1px solid var(--fabric-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--fabric-bg-surface) 80%, transparent), var(--fabric-bg-base)),
    var(--fabric-bg-base);
  text-align: center;
}

.home-hero__visual {
  position: relative;
  width: min(620px, 100%);
  height: 210px;
}

.home-hero__window {
  position: absolute;
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-surface);
  box-shadow: var(--fabric-shadow-md);
}

.home-hero__window--workflow {
  left: 4%;
  top: 18px;
  width: 58%;
  animation: home-preview-rise 5s var(--fabric-ease-standard) infinite;
}

.home-hero__window--pages {
  right: 3%;
  bottom: 8px;
  width: 42%;
  animation: home-preview-rise 5s var(--fabric-ease-standard) infinite 900ms;
}

.home-hero__bar,
.home-hero__page-line,
.home-hero__page-card,
.home-hero__node {
  border-radius: var(--fabric-radius-sm);
}

.home-hero__bar {
  width: 48%;
  height: 10px;
  background: var(--fabric-text-muted);
  opacity: 0.24;
}

.home-hero__node {
  width: 74px;
  height: 34px;
  border: 1px solid var(--fabric-border);
  background: var(--fabric-bg-elevated);
}

.home-hero__node.is-green {
  border-color: color-mix(in srgb, #34d399 50%, var(--fabric-border));
}

.home-hero__node.is-blue {
  justify-self: center;
  border-color: color-mix(in srgb, #60a5fa 50%, var(--fabric-border));
}

.home-hero__node.is-amber {
  justify-self: end;
  border-color: color-mix(in srgb, #f59e0b 50%, var(--fabric-border));
}

.home-hero__line {
  width: 56%;
  height: 2px;
  justify-self: center;
  background: var(--fabric-border);
}

.home-hero__line.is-short {
  width: 34%;
}

.home-hero__page-line {
  height: 12px;
  background: var(--fabric-bg-elevated);
}

.home-hero__page-line.is-wide {
  width: 84%;
}

.home-hero__page-card {
  height: 62px;
  border: 1px solid color-mix(in srgb, #8a52ff 44%, var(--fabric-border));
  background: var(--fabric-bg-base);
}

.home-hero__copy {
  max-width: 820px;
}

.home-hero__eyebrow {
  margin: 0 0 var(--fabric-space-2);
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  text-transform: uppercase;
}

.home-hero h1 {
  margin: 0;
  color: var(--fabric-text-primary);
  font-size: clamp(32px, 6vw, 56px);
  line-height: 1.04;
  letter-spacing: 0;
}

.home-hero__copy > p:last-of-type {
  max-width: 680px;
  margin: var(--fabric-space-4) auto 0;
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-md);
  line-height: 1.6;
}

.home-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--fabric-space-3);
  margin-top: var(--fabric-space-5);
}

@keyframes home-preview-rise {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@media (max-width: 720px) {
  .home-hero {
    padding-inline: var(--fabric-space-4);
  }

  .home-hero__visual {
    height: 180px;
  }
}
</style>

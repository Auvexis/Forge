<template>
  <section class="guide-step-frame">
    <div v-if="$slots.media" class="guide-step-frame__media">
      <slot name="media" />
    </div>
    <div class="guide-step-frame__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.guide-step-frame {
  display: grid;
  min-height: 100%;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 480px);
}

.guide-step-frame__media {
  min-height: 420px;
  background: var(--fabric-guide-step-frame-bg-base);
}

.guide-step-frame__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  padding: var(--fabric-space-8);
}

@media (max-width: 860px) {
  .guide-step-frame {
    grid-template-columns: 1fr;
  }

  .guide-step-frame__media {
    min-height: 280px;
  }
}
</style>

<script setup lang="ts">
defineEmits<{
  openTarget: [target: string]
}>()
</script>

<template>
  <main class="home-welcome" aria-label="Fabric home">
    <div class="home-welcome__actions" aria-label="Create">
      <button
        type="button"
        class="home-welcome__tile"
        @click="$emit('openTarget', 'workflows')"
      >
        <span class="home-welcome__tile-icon home-welcome__tile-icon--workflow" aria-hidden="true">
          <span class="home-welcome__icon-window"></span>
          <span class="home-welcome__icon-branch"></span>
          <span class="home-welcome__icon-node"></span>
        </span>
        <span class="home-welcome__tile-label">New Workflow</span>
      </button>

      <button
        type="button"
        class="home-welcome__tile"
        @click="$emit('openTarget', 'pages')"
      >
        <span class="home-welcome__tile-icon home-welcome__tile-icon--page" aria-hidden="true">
          <span class="home-welcome__icon-page"></span>
          <span class="home-welcome__icon-window"></span>
          <span class="home-welcome__icon-branch"></span>
          <span class="home-welcome__icon-node"></span>
        </span>
        <span class="home-welcome__tile-label">New Page</span>
      </button>
    </div>
  </main>
</template>

<style scoped>
.home-welcome {
  display: flex;
  width: 100%;
  min-height: 100%;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--fabric-home-welcome-bg-base);
  color: var(--fabric-home-welcome-text-primary);
}

.home-welcome__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--fabric-home-welcome-actions-gap);
}

.home-welcome__tile {
  display: flex;
  width: var(--fabric-home-welcome-tile-width);
  height: var(--fabric-home-welcome-tile-height);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--fabric-home-welcome-tile-gap);
  border: 1px solid var(--fabric-home-welcome-tile-border);
  border-radius: var(--fabric-home-welcome-tile-radius);
  background: var(--fabric-home-welcome-tile-bg);
  color: var(--fabric-home-welcome-text-primary);
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.home-welcome__tile:hover,
.home-welcome__tile:focus-visible {
  border-color: var(--fabric-home-welcome-tile-hover-border);
  background: var(--fabric-home-welcome-tile-hover-bg);
  color: var(--fabric-home-welcome-tile-hover-text);
  outline: none;
}

.home-welcome__tile-label {
  max-width: 150px;
  color: inherit;
  font-size: var(--fabric-text-sm);
  line-height: 1.25;
  text-align: center;
}

.home-welcome__tile-icon {
  position: relative;
  display: block;
  width: 128px;
  height: 82px;
  color: var(--fabric-home-welcome-icon);
}

.home-welcome__tile:hover .home-welcome__tile-icon,
.home-welcome__tile:focus-visible .home-welcome__tile-icon {
  color: var(--fabric-home-welcome-icon-hover);
}

.home-welcome__icon-window,
.home-welcome__icon-page,
.home-welcome__icon-branch,
.home-welcome__icon-node {
  position: absolute;
  display: block;
  border-color: currentColor;
}

.home-welcome__icon-window {
  right: 8px;
  bottom: 8px;
  width: 96px;
  height: 58px;
  border: 2px solid currentColor;
  border-radius: var(--fabric-home-welcome-icon-radius);
}

.home-welcome__icon-branch {
  right: 41px;
  bottom: 22px;
  width: 40px;
  height: 35px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: skewX(-36deg);
}

.home-welcome__icon-node {
  right: 42px;
  bottom: 15px;
  width: 28px;
  height: 28px;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: var(--fabric-home-welcome-tile-bg);
}

.home-welcome__tile:hover .home-welcome__icon-node,
.home-welcome__tile:focus-visible .home-welcome__icon-node {
  background: var(--fabric-home-welcome-tile-hover-bg);
}

.home-welcome__icon-page {
  left: 4px;
  bottom: 8px;
  width: 35px;
  height: 50px;
  border: 2px solid currentColor;
  border-radius: var(--fabric-home-welcome-icon-radius);
}

.home-welcome__icon-page::before,
.home-welcome__icon-page::after {
  position: absolute;
  left: 7px;
  width: 5px;
  height: 5px;
  border: 2px solid currentColor;
  border-radius: 50%;
  content: "";
}

.home-welcome__icon-page::before {
  top: 10px;
  box-shadow: 0 12px 0 -2px currentColor;
}

.home-welcome__icon-page::after {
  bottom: 7px;
}

@media (max-width: 720px) {
  .home-welcome__actions {
    flex-direction: column;
    gap: var(--fabric-space-5);
  }
}
</style>

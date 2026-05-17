<template>
  <div class="app-dock">
    <div class="app-dock__left">
      <slot name="left"></slot>
    </div>

    <div class="app-dock__center">
      <slot name="center"></slot>
    </div>

    <div class="app-dock__right">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<style scoped>
.app-dock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--sailor-dock-height);
  padding: 0 var(--sailor-space-3);
  background-color: var(--sailor-bg-surface);
  border-bottom: 1px solid var(--sailor-border);
}

.app-dock__left,
.app-dock__right,
.app-dock__center {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.app-dock__center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
</style>

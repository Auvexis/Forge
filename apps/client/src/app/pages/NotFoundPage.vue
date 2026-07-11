<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
</script>

<template>
  <div class="fabric-fill flex-center flex-col gap-3">
    <div class="icon-box">
      <LucideIcon class="text-muted" name="frown" :size="24" />
    </div>

    <div class="flex-center flex-col gap-2">
      <p class="text-base text-primary">This page doesn't exist</p>
      <p
        class="text-sm text-muted font-mono"
        :style="{ 'max-width': '450px', 'text-align': 'center' }"
      >
        The page you are looking for might have been removed, had its name changed, or is
        temporarily unavailable.
      </p>
    </div>
  </div>
</template>

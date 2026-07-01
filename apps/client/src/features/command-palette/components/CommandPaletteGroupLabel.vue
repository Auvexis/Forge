<script setup lang="ts">
import type { CommandGroup } from '../types/command-palette.types'

defineProps<{ group: CommandGroup }>()
</script>

<template>
  <div class="cp-group">{{ group }}</div>
</template>

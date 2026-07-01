<template>
  <div class="data-table-wrapper surface">
    <table class="data-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width, textAlign: col.align || 'left' }"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="data-table__empty">
            <LoadingSpinner :size="20" text="Loading..." center />
          </td>
        </tr>
        <tr v-else-if="!data || data.length === 0">
          <td :colspan="columns.length" class="data-table__empty">
            {{ emptyText }}
          </td>
        </tr>
        <tr v-else v-for="(row, i) in data" :key="i" @click="$emit('row-click', row)">
          <td v-for="col in columns" :key="col.key" :style="{ textAlign: col.align || 'left' }">
            <slot :name="col.key" :row="row">
              {{ formatValue(row[col.key]) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '../feedback/LoadingSpinner.vue'

export interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

withDefaults(
  defineProps<{
    columns: Column[]
    data: any[]
    loading?: boolean
    emptyText?: string
  }>(),
  {
    loading: false,
    emptyText: 'No data available',
    data: () => [],
  },
)

defineEmits<{
  'row-click': [row: any]
}>()

const formatValue = (val: any) => {
  if (val === null || val === undefined) return '-'
  return String(val)
}
</script>

<style scoped>
.data-table-wrapper {
  border-radius: var(--sailor-radius-sm);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--sailor-text-sm);
}

.data-table th,
.data-table td {
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
}

.data-table th {
  background-color: var(--sailor-bg-elevated);
  color: var(--sailor-text-secondary);
  font-weight: var(--sailor-font-medium);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: var(--sailor-text-xs);
  text-align: left;
}

.data-table tbody tr {
  transition: background-color var(--sailor-duration-fast);
}

.data-table tbody tr:hover {
  background-color: var(--sailor-bg-overlay);
  cursor: pointer;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table__empty {
  text-align: center;
  padding: var(--sailor-space-10) !important;
  color: var(--sailor-text-muted);
}
</style>

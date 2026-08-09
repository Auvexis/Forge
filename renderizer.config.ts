import { defineRenderizerConfig } from '@renderizer/vue'

export default defineRenderizerConfig({
  adapter: 'vue',
  windows: {
    default: {
      width: 1180,
      height: 780,
      popup: true,
    },
    presets: [
      {
        id: 'workflow-node-inspector',
        title: 'Node Inspector',
        width: 1400,
        height: 860,
        popup: true,
        resizable: true,
        minWidth: 980,
        minHeight: 620,
      },
    ],
  },
})

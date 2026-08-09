import { defineRenderizerConfig } from "@renderizer/vue";

export default defineRenderizerConfig({
  adapter: "vue",
  windows: {
    default: {
      width: 1180,
      height: 780,
      popup: true,
    },
  },
});

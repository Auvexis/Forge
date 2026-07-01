/// <reference types="vite/client" />
/// <reference types="node" />

declare module '*.vue' {
  import type { Component } from 'vue'
  const component: Component
  export default component
}

declare module 'vue3-emoji-picker/css' {}

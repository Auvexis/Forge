import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './app/App.vue'
import router from './app/router'
import { installGlobalErrorToasts } from './shared/composables/globalErrorToasts'

// Global CSS Import
import './assets/styles/main.css'

// Vue Flow CSS (required for the graph editor)
import '@vue-flow/core/dist/style.css'
// REMOVIDO: import '@vue-flow/core/dist/theme-default.css' (Isso causa as caixas brancas ao redor dos Custom Nodes!)

const app = createApp(App)
installGlobalErrorToasts(app)

app.use(createPinia())
app.use(router)

app.mount('#app')

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './app/App.vue'
import router from './app/router'
import { installGlobalErrorToasts } from './shared/composables/globalErrorToasts'

// Global CSS Import
import './assets/styles/main.css'

// Vue Flow CSS (required for the graph editor)

const app = createApp(App)
installGlobalErrorToasts(app)

app.use(createPinia())
app.use(router)

app.mount('#app')

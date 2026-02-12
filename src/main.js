import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia' // 1. Traemos la herramienta
import App from './App.vue'

const app = createApp(App) // 2. Iniciamos la app
const pinia = createPinia() // 3. Iniciamos el cerebro

app.use(pinia) // 4. Conectamos el cerebro a la app
app.mount('#app') // 5. Arrancamos
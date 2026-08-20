import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/global.css'

// 主题初始化（暗色模式记忆）
if (localStorage.getItem('worklog_theme') === 'dark') {
  document.documentElement.dataset.theme = 'dark'
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

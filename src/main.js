import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './assets/styles/variables.css'
import './assets/styles/base.css'
import './assets/styles/layout.css'
import './assets/styles/components.css'
import './assets/styles/animations.css'
import App from './App.vue'
import router from './router'

createApp(App).use(Antd).use(router).mount('#app')

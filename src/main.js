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
import { setupImageTouchPan } from './utils/imageTouchPan'

setupImageTouchPan()

const app = createApp(App)
app.use(Antd)
app.use(router)

// Đợi router hoàn tất điều hướng và auth guard ban đầu trước khi mount để loại bỏ nháy giao diện
router.isReady().then(() => {
  app.mount('#app')
})

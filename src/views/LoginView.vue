<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  GoogleOutlined,
  WarningFilled,
  ArrowRightOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue'
import { useAuth } from '../composables/useAuth'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { theme, toggleTheme } = useTheme()
const {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  isLoading,
  authError,
  isFirebaseConfigured,
} = useAuth()

const activeTab = ref('login') // 'login' | 'register'

const loginForm = reactive({
  email: '',
  password: '',
})

const registerForm = reactive({
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const localError = ref('')

async function handleLogin() {
  localError.value = ''
  if (!loginForm.email || !loginForm.password) {
    localError.value = 'Vui lòng nhập đầy đủ Email và Mật khẩu.'
    return
  }

  const res = await loginWithEmail(loginForm.email, loginForm.password)
  if (res.success) {
    const redirect = route.query.redirect || '/reports'
    router.push(redirect)
  }
}

async function handleRegister() {
  localError.value = ''
  if (!registerForm.displayName || !registerForm.email || !registerForm.password) {
    localError.value = 'Vui lòng điền đầy đủ các thông tin bắt buộc.'
    return
  }

  if (registerForm.password.length < 6) {
    localError.value = 'Mật khẩu phải có tối thiểu 6 ký tự.'
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    localError.value = 'Mật khẩu xác nhận không khớp.'
    return
  }

  const res = await registerWithEmail(
    registerForm.email,
    registerForm.password,
    registerForm.displayName
  )
  if (res.success) {
    const redirect = route.query.redirect || '/reports'
    router.push(redirect)
  }
}

async function handleGoogleLogin() {
  localError.value = ''
  const res = await loginWithGoogle()
  if (res.success) {
    const redirect = route.query.redirect || '/reports'
    router.push(redirect)
  }
}

function fillDemoAccount() {
  loginForm.email = 'admin@sentinel.io'
  loginForm.password = '123456'
  handleLogin()
}
</script>

<template>
  <div class="auth-page">
    <!-- Top actions: Theme toggle -->
    <div class="auth-topbar">
      <button
        type="button"
        class="header-icon-btn theme-btn"
        :title="theme === 'dark' ? t('themeDark') : t('themeLight')"
        @click="toggleTheme"
      >
        <span v-if="theme === 'dark'" class="theme-icon">☀️</span>
        <span v-else class="theme-icon">🌙</span>
      </button>
    </div>

    <div class="auth-container">
      <!-- Brand Header -->
      <div class="auth-brand">
        <div class="auth-logo">
          <WarningFilled />
        </div>
        <h1>Sentinel</h1>
        <p>Hệ thống Quản trị & Báo cáo Bất thường</p>
      </div>

      <!-- Config Notice Badge -->
      <div v-if="!isFirebaseConfigured" class="demo-notice-badge">
        <SafetyCertificateOutlined />
        <span>Chế độ Demo khả dụng · Điền file .env để kết nối Firebase thật</span>
      </div>

      <!-- Main Auth Card -->
      <div class="auth-card">
        <!-- Tab Switcher -->
        <div class="auth-tabs">
          <button
            type="button"
            class="auth-tab-btn"
            :class="{ active: activeTab === 'login' }"
            @click="activeTab = 'login'; localError = ''"
          >
            Đăng nhập
          </button>
          <button
            type="button"
            class="auth-tab-btn"
            :class="{ active: activeTab === 'register' }"
            @click="activeTab = 'register'; localError = ''"
          >
            Đăng ký
          </button>
        </div>

        <!-- Error Alert -->
        <div v-if="localError || authError" class="auth-error-alert">
          {{ localError || authError }}
        </div>

        <!-- LOGIN FORM -->
        <form v-if="activeTab === 'login'" class="auth-form" @submit.prevent="handleLogin">
          <div class="input-group">
            <label>Địa chỉ Email</label>
            <a-input
              v-model:value="loginForm.email"
              size="large"
              placeholder="admin@sentinel.io"
              autocomplete="email"
            >
              <template #prefix><MailOutlined style="color: var(--text-tertiary);" /></template>
            </a-input>
          </div>

          <div class="input-group">
            <label>Mật khẩu</label>
            <a-input-password
              v-model:value="loginForm.password"
              size="large"
              placeholder="••••••••"
              autocomplete="current-password"
            >
              <template #prefix><LockOutlined style="color: var(--text-tertiary);" /></template>
            </a-input-password>
          </div>

          <button
            type="submit"
            class="auth-submit-btn"
            :disabled="isLoading"
          >
            <span v-if="isLoading">Đang xử lý...</span>
            <span v-else>Đăng nhập <ArrowRightOutlined /></span>
          </button>

          <div class="auth-divider">
            <span>hoặc tiếp tục với</span>
          </div>

          <button
            type="button"
            class="auth-google-btn"
            :disabled="isLoading"
            @click="handleGoogleLogin"
          >
            <GoogleOutlined />
            <span>Đăng nhập với Google</span>
          </button>

          <button
            type="button"
            class="demo-quick-btn"
            @click="fillDemoAccount"
          >
            <CheckCircleOutlined /> Đăng nhập nhanh tài khoản Demo (Admin)
          </button>
        </form>

        <!-- REGISTER FORM -->
        <form v-else class="auth-form" @submit.prevent="handleRegister">
          <div class="input-group">
            <label>Họ và tên</label>
            <a-input
              v-model:value="registerForm.displayName"
              size="large"
              placeholder="Nguyễn Văn An"
            >
              <template #prefix><UserOutlined style="color: var(--text-tertiary);" /></template>
            </a-input>
          </div>

          <div class="input-group">
            <label>Địa chỉ Email</label>
            <a-input
              v-model:value="registerForm.email"
              size="large"
              placeholder="user@sentinel.io"
              autocomplete="email"
            >
              <template #prefix><MailOutlined style="color: var(--text-tertiary);" /></template>
            </a-input>
          </div>

          <div class="input-group">
            <label>Mật khẩu (tối thiểu 6 ký tự)</label>
            <a-input-password
              v-model:value="registerForm.password"
              size="large"
              placeholder="••••••••"
              autocomplete="new-password"
            >
              <template #prefix><LockOutlined style="color: var(--text-tertiary);" /></template>
            </a-input-password>
          </div>

          <div class="input-group">
            <label>Xác nhận mật khẩu</label>
            <a-input-password
              v-model:value="registerForm.confirmPassword"
              size="large"
              placeholder="••••••••"
              autocomplete="new-password"
            >
              <template #prefix><LockOutlined style="color: var(--text-tertiary);" /></template>
            </a-input-password>
          </div>

          <button
            type="submit"
            class="auth-submit-btn"
            :disabled="isLoading"
          >
            <span v-if="isLoading">Đang tạo tài khoản...</span>
            <span v-else>Tạo tài khoản mới</span>
          </button>

          <div class="auth-divider">
            <span>hoặc</span>
          </div>

          <button
            type="button"
            class="auth-google-btn"
            :disabled="isLoading"
            @click="handleGoogleLogin"
          >
            <GoogleOutlined />
            <span>Đăng ký nhanh với Google</span>
          </button>
        </form>
      </div>

      <!-- Security / Footer note -->
      <div class="auth-footer">
        <span>Bảo mật cấp doanh nghiệp · Sentinel Anomaly Shield v2.4</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  WarningFilled,
  ArrowRightOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
} from '@ant-design/icons-vue'
import { useAuth } from '../composables/useAuth'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'
import qcAvatar from '../assets/qc_character_avatar.png'

const router = useRouter()
const route = useRoute()
const { locale, setLocale, t } = useI18n()
const { theme, toggleTheme } = useTheme()
const {
  loginWithEmail,
  registerWithEmail,
  resendVerificationEmail,
  loginWithGoogle,
  isLoading,
  authError,
  isFirebaseConfigured,
} = useAuth()

const canvasRef = ref(null)
let animId = null

const langOptions = [
  { value: 'vi', label: '🇻🇳 Tiếng Việt' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'zh', label: '🇨🇳 中文' },
]

const activeTab = ref('login') // 'login' | 'register'
const verificationSent = ref(false)
const registeredEmail = ref('')
const resendLoading = ref(false)
const resendSuccess = ref(false)

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

// ─── QC MASCOT FOCUS & JELLY ANIMATION STATE ───
const isInputFocused = ref(false)

function onInputFocus() {
  isInputFocused.value = true
}

function onInputBlur() {
  isInputFocused.value = false
}


// Interactive 60fps Aurora & Floating Particle Engine
onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = (canvas.width = window.innerWidth)
  let height = (canvas.height = window.innerHeight)

  function onResize() {
    if (!canvas) return
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
  }
  window.addEventListener('resize', onResize)

  // Floating ambient glowing orbs with fluid trajectories
  const blobs = [
    {
      x: width * 0.25,
      y: height * 0.35,
      radius: Math.min(width, height) * 0.42,
      color: 'rgba(14, 165, 233, 0.24)', // Cyan highlight
      vx: 0.35,
      vy: 0.25,
      baseRadius: Math.min(width, height) * 0.42,
      phase: 0,
    },
    {
      x: width * 0.75,
      y: height * 0.65,
      radius: Math.min(width, height) * 0.45,
      color: 'rgba(99, 102, 241, 0.22)', // Indigo highlight
      vx: -0.28,
      vy: -0.32,
      baseRadius: Math.min(width, height) * 0.45,
      phase: Math.PI / 2,
    },
    {
      x: width * 0.6,
      y: height * 0.25,
      radius: Math.min(width, height) * 0.38,
      color: 'rgba(16, 185, 129, 0.18)', // Emerald highlight
      vx: -0.22,
      vy: 0.28,
      baseRadius: Math.min(width, height) * 0.38,
      phase: Math.PI,
    },
    {
      x: width * 0.3,
      y: height * 0.75,
      radius: Math.min(width, height) * 0.35,
      color: 'rgba(245, 158, 11, 0.16)', // Amber highlight
      vx: 0.3,
      vy: -0.2,
      baseRadius: Math.min(width, height) * 0.35,
      phase: Math.PI * 1.5,
    },
  ]

  // Micro floating stardust particles
  const particleCount = Math.min(55, Math.floor((width * height) / 22000))
  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.8 + 0.6,
    speedY: Math.random() * 0.45 + 0.15,
    speedX: (Math.random() - 0.5) * 0.3,
    opacity: Math.random() * 0.7 + 0.25,
    pulseSpeed: Math.random() * 0.02 + 0.008,
    pulseDir: Math.random() > 0.5 ? 1 : -1,
    color: Math.random() > 0.5 ? '#38bdf8' : '#818cf8',
  }))

  let mouseX = width / 2
  let mouseY = height / 2
  function onMouseMove(e) {
    mouseX = e.clientX
    mouseY = e.clientY
  }
  window.addEventListener('mousemove', onMouseMove)

  function animate() {
    ctx.clearRect(0, 0, width, height)

    // Fluid moving blurry blobs
    blobs.forEach((blob) => {
      blob.phase += 0.008
      blob.x += blob.vx + Math.sin(blob.phase) * 0.4
      blob.y += blob.vy + Math.cos(blob.phase) * 0.4
      blob.radius = blob.baseRadius + Math.sin(blob.phase * 1.5) * 25

      // Subtle reaction to mouse
      const dx = mouseX - blob.x
      const dy = mouseY - blob.y
      blob.x += dx * 0.003
      blob.y += dy * 0.003

      // Screen edge bounce
      if (blob.x < -blob.radius * 0.4) blob.vx = Math.abs(blob.vx)
      if (blob.x > width + blob.radius * 0.4) blob.vx = -Math.abs(blob.vx)
      if (blob.y < -blob.radius * 0.4) blob.vy = Math.abs(blob.vy)
      if (blob.y > height + blob.radius * 0.4) blob.vy = -Math.abs(blob.vy)

      const gradient = ctx.createRadialGradient(
        blob.x,
        blob.y,
        0,
        blob.x,
        blob.y,
        blob.radius
      )
      gradient.addColorStop(0, blob.color)
      gradient.addColorStop(0.55, blob.color.replace(/[\d\.]+\)$/, '0.08)'))
      gradient.addColorStop(1, 'transparent')

      ctx.save()
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })

    // Stardust floating upwards
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.y -= p.speedY
      p.x += p.speedX
      p.opacity += p.pulseSpeed * p.pulseDir
      if (p.opacity > 0.95) p.pulseDir = -1
      if (p.opacity < 0.2) p.pulseDir = 1

      if (p.y < -15) {
        p.y = height + 15
        p.x = Math.random() * width
      }
      if (p.x < -15) p.x = width + 15
      if (p.x > width + 15) p.x = -15

      ctx.save()
      ctx.globalAlpha = Math.max(0.1, Math.min(1, p.opacity))
      ctx.fillStyle = p.color
      ctx.shadowBlur = 10
      ctx.shadowColor = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    animId = requestAnimationFrame(animate)
  }

  animId = requestAnimationFrame(animate)

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mousemove', onMouseMove)
    if (animId) cancelAnimationFrame(animId)
  })
})

async function handleLogin() {
  localError.value = ''
  if (!loginForm.email || !loginForm.password) {
    localError.value = t('errorFillAll')
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
    localError.value = t('errorFillRequired')
    return
  }

  if (registerForm.password.length < 6) {
    localError.value = t('errorPasswordMin')
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    localError.value = t('errorPasswordMismatch')
    return
  }

  const res = await registerWithEmail(
    registerForm.email,
    registerForm.password,
    registerForm.displayName
  )
  if (res.success) {
    if (res.emailSent) {
      verificationSent.value = true
      registeredEmail.value = registerForm.email
    } else {
      const redirect = route.query.redirect || '/reports'
      router.push(redirect)
    }
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

async function handleResendEmail() {
  resendLoading.value = true
  resendSuccess.value = false
  const res = await resendVerificationEmail()
  resendLoading.value = false
  if (res.success) {
    resendSuccess.value = true
    setTimeout(() => {
      resendSuccess.value = false
    }, 4000)
  }
}

function proceedToApp() {
  const redirect = route.query.redirect || '/reports'
  router.push(redirect)
}

function fillDemoAccount() {
  loginForm.email = 'admin@sentinel.io'
  loginForm.password = '123456'
  handleLogin()
}
</script>

<template>
  <div class="auth-page">
    <!-- Atmospheric Moving Blur Canvas & Particles (Nền chuyển động mờ mờ ảo ảo 60fps) -->
    <canvas ref="canvasRef" class="auth-ambient-canvas"></canvas>

    <!-- Cyber Mesh Grid Overlay -->
    <div class="aurora-mesh-grid"></div>

    <!-- Top actions: Language selector & Theme toggle -->
    <div class="auth-topbar">
      <!-- Language Switcher -->
      <a-select
        :value="locale"
        class="lang-select auth-lang-select"
        :dropdown-match-select-width="false"
        @change="setLocale"
      >
        <template #suffixIcon><GlobalOutlined /></template>
        <a-select-option
          v-for="opt in langOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </a-select-option>
      </a-select>

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
        <h1>{{ t('loginTitle') }}</h1>
        <p>{{ t('loginSubtitle') }}</p>
      </div>

      <!-- Config Notice Badge (chỉ hiện khi chưa điền key vào .env) -->
      <div v-if="!isFirebaseConfigured" class="demo-notice-badge">
        <SafetyCertificateOutlined />
        <span>{{ t('demoModeNotice') }}</span>
      </div>

      <!-- Mascot Avatar sitting directly flush on top of the Auth Card with white border -->
      <div
        class="auth-mascot-logo-wrap"
        :class="{ 'is-focused': isInputFocused }"
      >
        <!-- Ground gelatin shadow -->
        <div class="mascot-ground-shadow"></div>
        <!-- Ambient glowing aura -->
        <div class="mascot-aura-glow"></div>

        <!-- The transparent character mascot with crisp white border -->
        <img
          :src="qcAvatar"
          alt="QC Inspector Mascot"
          class="mascot-jelly-img"
        />
      </div>

      <!-- Card xác nhận Email đã gửi -->
      <div v-if="verificationSent" class="auth-card verification-card">
        <div class="verification-icon-circle">
          <MailOutlined />
        </div>
        <h2 class="verification-title">{{ t('verifySentTitle') }}</h2>
        <p class="verification-desc">
          {{ t('verifySentDesc') }}
        </p>
        <div class="verification-email-badge">
          {{ registeredEmail }}
        </div>
        <p class="verification-hint">
          {{ t('verifySentHint') }}
        </p>

        <div class="verification-actions">
          <button
            type="button"
            class="auth-submit-btn"
            @click="proceedToApp"
          >
            {{ t('btnEnterSystem') }} <ArrowRightOutlined />
          </button>

          <button
            type="button"
            class="resend-link-btn"
            :disabled="resendLoading"
            @click="handleResendEmail"
          >
            {{ resendSuccess ? t('btnResendVerificationSuccess') : (resendLoading ? t('btnResending') : t('btnResendVerification')) }}
          </button>

          <button
            type="button"
            class="back-login-link-btn"
            @click="verificationSent = false; activeTab = 'login'"
          >
            {{ t('btnBackToLogin') }}
          </button>
        </div>
      </div>

      <!-- Main Auth Card (Hybrid Google + Email) -->
      <div v-else class="auth-card">
        <!-- 1. Google 1-Click Login (Ưu tiên hàng đầu) -->
        <button
          type="button"
          class="auth-google-primary-btn"
          :disabled="isLoading"
          @click="handleGoogleLogin"
        >
          <svg class="google-icon" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>{{ t('loginWithGoogle') }}</span>
        </button>

        <div class="auth-divider">
          <span>{{ t('orUseEmail') }}</span>
        </div>

        <!-- Tab Switcher -->
        <div class="auth-tabs">
          <button
            type="button"
            class="auth-tab-btn"
            :class="{ active: activeTab === 'login' }"
            @click="activeTab = 'login'; localError = ''"
          >
            {{ t('tabLogin') }}
          </button>
          <button
            type="button"
            class="auth-tab-btn"
            :class="{ active: activeTab === 'register' }"
            @click="activeTab = 'register'; localError = ''"
          >
            {{ t('tabRegister') }}
          </button>
        </div>

        <!-- Error Alert -->
        <div v-if="localError || authError" class="auth-error-alert">
          {{ localError || authError }}
        </div>

        <!-- LOGIN FORM -->
        <form v-if="activeTab === 'login'" class="auth-form" @submit.prevent="handleLogin">
          <div class="input-group">
            <label>{{ t('labelEmail') }}</label>
            <a-input
              v-model:value="loginForm.email"
              size="large"
              placeholder="name@company.com"
              autocomplete="email"
              @focus="onInputFocus"
              @blur="onInputBlur"
            >
              <template #prefix><MailOutlined style="color: var(--text-tertiary);" /></template>
            </a-input>
          </div>

          <div class="input-group">
            <label>{{ t('labelPassword') }}</label>
            <a-input-password
              v-model:value="loginForm.password"
              size="large"
              placeholder="••••••••"
              autocomplete="current-password"
              @focus="onInputFocus"
              @blur="onInputBlur"
            >
              <template #prefix><LockOutlined style="color: var(--text-tertiary);" /></template>
            </a-input-password>
          </div>

          <button
            type="submit"
            class="auth-submit-btn"
            :disabled="isLoading"
          >
            <span v-if="isLoading">{{ t('btnResending') }}</span>
            <span v-else>{{ t('btnLoginSubmit') }} <ArrowRightOutlined /></span>
          </button>

          <button
            v-if="!isFirebaseConfigured"
            type="button"
            class="demo-quick-btn"
            @click="fillDemoAccount"
          >
            <CheckCircleOutlined /> {{ t('fillDemoAdmin') }}
          </button>
        </form>

        <!-- REGISTER FORM -->
        <form v-else class="auth-form" @submit.prevent="handleRegister">
          <div class="input-group">
            <label>{{ t('labelFullName') }}</label>
            <a-input
              v-model:value="registerForm.displayName"
              size="large"
              :placeholder="t('placeholderFullName')"
              @focus="onInputFocus"
              @blur="onInputBlur"
            >
              <template #prefix><UserOutlined style="color: var(--text-tertiary);" /></template>
            </a-input>
          </div>

          <div class="input-group">
            <label>{{ t('labelEmail') }}</label>
            <a-input
              v-model:value="registerForm.email"
              size="large"
              placeholder="name@company.com"
              autocomplete="email"
              @focus="onInputFocus"
              @blur="onInputBlur"
            >
              <template #prefix><MailOutlined style="color: var(--text-tertiary);" /></template>
            </a-input>
          </div>

          <div class="input-group">
            <label>{{ t('labelPassword') }}</label>
            <a-input-password
              v-model:value="registerForm.password"
              size="large"
              :placeholder="t('placeholderPassword')"
              autocomplete="new-password"
              @focus="onInputFocus"
              @blur="onInputBlur"
            >
              <template #prefix><LockOutlined style="color: var(--text-tertiary);" /></template>
            </a-input-password>
          </div>

          <div class="input-group">
            <label>{{ t('labelConfirmPassword') }}</label>
            <a-input-password
              v-model:value="registerForm.confirmPassword"
              size="large"
              :placeholder="t('placeholderConfirmPassword')"
              autocomplete="new-password"
              @focus="onInputFocus"
              @blur="onInputBlur"
            >
              <template #prefix><LockOutlined style="color: var(--text-tertiary);" /></template>
            </a-input-password>
          </div>

          <button
            type="submit"
            class="auth-submit-btn"
            :disabled="isLoading"
          >
            <span v-if="isLoading">{{ t('btnResending') }}</span>
            <span v-else>{{ t('btnRegisterSubmit') }}</span>
          </button>
        </form>
      </div>

      <!-- Security / Footer note -->
      <div class="auth-footer">
        <span>{{ t('footerCopyright') }}</span>
      </div>
    </div>
  </div>
</template>

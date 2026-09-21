<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BellOutlined,
  GlobalOutlined,
  WarningFilled,
  LogoutOutlined,
  LoginOutlined,
  ExclamationCircleOutlined,
  CrownFilled,
  EyeOutlined,
} from '@ant-design/icons-vue'
import { useTheme } from './composables/useTheme'
import { useI18n } from './composables/useI18n'
import { useAuth } from './composables/useAuth'

const route = useRoute()
const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { locale, setLocale, t } = useI18n()
const { user, isAuthenticated, isAuthReady, userInitials, isAdmin, logout } = useAuth()

const notificationOpen = ref(false)
const showLogoutModal = ref(false)
const isLoggingOut = ref(false)

const isLoginPage = computed(() => route.name === 'login')

const langOptions = [
  { value: 'vi', label: '🇻🇳 Tiếng Việt' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'zh', label: '🇨🇳 中文' },
]

function handleLogout() {
  showLogoutModal.value = true
}

async function confirmLogout() {
  try {
    isLoggingOut.value = true
    await logout()
    showLogoutModal.value = false
    router.push({ name: 'login' })
  } finally {
    isLoggingOut.value = false
  }
}

// ─── Ambient Stardust Background Particles ───
const stardustParticles = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  x: Math.floor((i * 4.3 + (i % 3) * 7.7) % 96 + 2),
  y: Math.floor((i * 6.7 + (i % 5) * 5.1) % 94 + 3),
  size: ((i % 3) * 0.8 + 1.4).toFixed(1),
  duration: ((i % 5) * 2.8 + 16).toFixed(1),
  delay: (-((i * 3.7) % 20)).toFixed(1),
  opacity: ((i % 4) * 0.12 + 0.35).toFixed(2),
}))
</script>

<template>
  <!-- Màn hình chờ an toàn bảo vệ không nháy giao diện khi kiểm tra auth -->
  <div v-if="!isAuthReady" class="app-auth-splash">
    <div class="splash-center-box">
      <div class="splash-icon-pulse">
        <WarningFilled />
      </div>
      <div class="splash-brand-text">
        <strong>Sentinel</strong>
        <span>Khởi tạo hệ thống bảo mật...</span>
      </div>
    </div>
  </div>

  <div v-else class="app-shell">
    <!-- Ambient Animated Dynamic Background (Hoạt ảnh động nền đỉnh cao 60fps) -->
    <div v-if="!isLoginPage" class="app-ambient-backdrop" aria-hidden="true">
      <!-- 7 Glowing Nebula Orbs (Đa tầng ánh sáng chuyển động huyền ảo) -->
      <div class="ambient-orb ambient-orb-cyan"></div>
      <div class="ambient-orb ambient-orb-indigo"></div>
      <div class="ambient-orb ambient-orb-emerald"></div>
      <div class="ambient-orb ambient-orb-amber"></div>
      <div class="ambient-orb ambient-orb-rose"></div>
      <div class="ambient-orb ambient-orb-purple"></div>
      <div class="ambient-orb ambient-orb-azure"></div>

      <!-- Cyber Mesh Grid Overlay -->
      <div class="ambient-mesh-grid"></div>

      <!-- Sentinel Radar Holographic Scan Sweep -->
      <div class="ambient-radar-sweep"></div>

      <!-- Floating Quantum Stardust Particles -->
      <div class="ambient-stardust-field">
        <span
          v-for="p in stardustParticles"
          :key="p.id"
          class="ambient-stardust"
          :style="{
            left: p.x + '%',
            top: p.y + '%',
            width: p.size + 'px',
            height: p.size + 'px',
            animationDuration: p.duration + 's',
            animationDelay: p.delay + 's',
            opacity: p.opacity,
          }"
        ></span>
      </div>
    </div>

    <!-- Topbar dedicated to Sentinel Anomaly Reporting (ẩn khi ở trang Login) -->
    <header v-if="!isLoginPage" class="app-header">
      <div class="header-left">
        <div class="brand" @click="router.push('/reports')">
          <div class="brand-mark"><WarningFilled /></div>
          <div class="brand-copy">
            <strong>Sentinel</strong>
            <span>{{ t('brandSub') }}</span>
          </div>
        </div>

        <div class="header-divider"></div>

        <div class="header-badge">
          <div class="status-dot"></div>
          <span>{{ t('systemStatus') }}</span>
        </div>
      </div>

      <div class="header-right">
        <!-- Language Switcher -->
        <a-select
          :value="locale"
          class="lang-select"
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

        <!-- Theme Toggle Button (Light/Dark) -->
        <button
          type="button"
          class="header-icon-btn theme-btn"
          :title="theme === 'dark' ? t('themeDark') : t('themeLight')"
          @click="toggleTheme"
        >
          <span v-if="theme === 'dark'" class="theme-icon">☀️</span>
          <span v-else class="theme-icon">🌙</span>
        </button>

        <!-- Notification button with wrapper -->
        <div class="notification-wrapper">
          <button
            type="button"
            class="header-icon-btn notification-btn"
            :title="t('notifications')"
            @click="notificationOpen = !notificationOpen"
          >
            <BellOutlined class="notification-icon" />
            <span class="notification-badge-dot"></span>
          </button>

          <div v-if="notificationOpen" class="notification-popover">
            <strong>{{ t('notifications') }}</strong>
            <p>{{ t('notificationsDesc') }}</p>
          </div>
        </div>

        <!-- Role Badge (Admin / Viewer) tách hẳn ra ngoài thành nút riêng trên header -->
        <a-tooltip v-if="isAuthenticated && user" :title="isAdmin ? t('roleAdmin') : t('roleViewer')">
          <div
            class="header-icon-btn header-role-badge"
            :class="isAdmin ? 'role-crown-badge' : 'role-viewer-badge'"
          >
            <CrownFilled v-if="isAdmin" />
            <EyeOutlined v-else />
          </div>
        </a-tooltip>

        <!-- User Profile & Logout -->
        <div v-if="isAuthenticated && user" class="profile">
          <img
            v-if="user.photoURL"
            :src="user.photoURL"
            :alt="user.displayName"
            class="avatar user-photo"
          />
          <div v-else class="avatar">{{ userInitials }}</div>
          <div class="profile-copy">
            <strong>{{ user.displayName || user.email }}</strong>
            <span class="profile-email">{{ user.email }}</span>
          </div>

          <!-- Nút đăng xuất -->
          <button
            type="button"
            class="header-logout-btn"
            :title="t('logout')"
            @click="handleLogout"
          >
            <LogoutOutlined />
          </button>
        </div>

        <!-- Nút Đăng nhập nếu chưa xác thực -->
        <button
          v-else
          type="button"
          class="header-login-btn"
          @click="router.push({ name: 'login' })"
        >
          <LoginOutlined />
          <span>{{ t('login') || 'Đăng nhập' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Content Area (cho các trang Dashboard / Reports bên trong) -->
    <main v-if="!isLoginPage" class="content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Màn hình Đăng nhập hiển thị tràn viền 100vw toàn màn hình -->
    <div v-else class="auth-viewport-wrapper">
      <router-view />
    </div>

    <!-- Professional Enterprise Footer -->
    <footer v-if="!isLoginPage" class="app-footer">
      <div class="footer-inner">
        <div class="footer-left">
          <div class="footer-branding">
            <span class="footer-status-dot"></span>
            <span class="footer-brand-title">Sentinel Incident Ops</span>
            <span class="footer-badge">QC Enterprise</span>
          </div>
          <p class="footer-copyright-text">
            {{ t('footerCopyright') }}
          </p>
        </div>

        <div class="footer-right">
          <div class="footer-meta-row">
            <span class="footer-build-tag">v2.4.2 Production</span>
            <span class="footer-sep">·</span>
            <span class="footer-author-tag">{{ t('footerAuthor') }}</span>
          </div>
          <p class="footer-tagline">
            {{ t('footerSystemTag') }}
          </p>
        </div>
      </div>
    </footer>

    <!-- Modal Xác nhận Đăng xuất (Ant Design Vue) -->
    <a-modal
      v-model:open="showLogoutModal"
      :title="t('logout')"
      :ok-text="t('logout')"
      :cancel-text="t('btnCancel')"
      ok-type="danger"
      :confirm-loading="isLoggingOut"
      class="logout-modal"
      width="440px"
      centered
      @ok="confirmLogout"
    >
      <div class="logout-modal-body">
        <div class="logout-icon-wrapper">
          <ExclamationCircleOutlined />
        </div>
        <div class="logout-modal-info">
          <div class="logout-modal-title">{{ t('logoutConfirm') }}</div>
        </div>
      </div>
    </a-modal>
  </div>
</template>


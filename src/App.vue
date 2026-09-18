<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BellOutlined,
  GlobalOutlined,
  WarningFilled,
  LogoutOutlined,
  LoginOutlined,
} from '@ant-design/icons-vue'
import { useTheme } from './composables/useTheme'
import { useI18n } from './composables/useI18n'
import { useAuth } from './composables/useAuth'

const route = useRoute()
const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { locale, setLocale, t } = useI18n()
const { user, isAuthenticated, userInitials, logout } = useAuth()

const notificationOpen = ref(false)

const isLoginPage = computed(() => route.name === 'login')

const langOptions = [
  { value: 'vi', label: '🇻🇳 Tiếng Việt' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'zh', label: '🇨🇳 中文' },
]

async function handleLogout() {
  if (window.confirm(t('logoutConfirm'))) {
    await logout()
    router.push({ name: 'login' })
  }
}
</script>

<template>
  <div class="app-shell">
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
            <span>{{ user.email ? user.email.slice(0, 18) + (user.email.length > 18 ? '...' : '') : t('userRole') }}</span>
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

    <!-- Main Content Area -->
    <main class="content" :class="{ 'content-auth': isLoginPage }">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>


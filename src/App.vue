<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from './composables/useTheme'
import { useAuth } from './composables/useAuth'
import { getGeminiKey, setGeminiKey } from './utils/aiHelper'
import { globalLoading, toasts, showToast } from './composables/useReports'

const route = useRoute()
const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { user, isAuthenticated, isAuthReady, isAdmin, logout } = useAuth()

const isLoginPage = computed(() => route.name === 'login')
const showKeyModal = ref(false)
const geminiKeyInput = ref(getGeminiKey())

function saveKey() {
  setGeminiKey(geminiKeyInput.value)
  showKeyModal.value = false
  showToast('🔑 Đã lưu Gemini API Key!')
}

async function handleLogout() {
  if (!confirm('Bạn có chắc muốn đăng xuất?')) return
  await logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <!-- GLOBAL LOADING MODAL (Hiển thị khi Import Excel, Xuất Excel, Lưu dữ liệu) -->
  <Teleport to="body">
    <div v-if="globalLoading.active" class="lite-modal-backdrop" style="z-index: 300;">
      <div class="lite-modal-card" style="max-width: 380px; padding: 24px; text-align: center; align-items: center;">
        <div class="lite-spinner"></div>
        <h3 style="font-size: 15px; margin-bottom: 4px;">{{ globalLoading.title }}</h3>
        <p style="font-size: 12.5px; color: var(--text-sub);">{{ globalLoading.subtext }}</p>
        <div v-if="globalLoading.percent !== null" class="lite-progress-track">
          <div class="lite-progress-fill" :style="{ width: globalLoading.percent + '%' }"></div>
        </div>
        <span v-if="globalLoading.percent !== null" style="font-size: 11.5px; font-weight: 700; color: var(--accent); margin-top: 6px;">
          {{ globalLoading.percent }}%
        </span>
      </div>
    </div>
  </Teleport>

  <!-- TOAST THÔNG BÁO GÓC PHẢI -->
  <div class="lite-toast-container">
    <div v-for="t in toasts" :key="t.id" class="lite-toast-item">
      {{ t.text }}
    </div>
  </div>

  <div v-if="!isAuthReady" style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <div class="lite-spinner"></div>
    <strong>Đang khởi tạo Sentinel IPQC...</strong>
  </div>
  <div v-else>
    <header v-if="!isLoginPage" class="lite-header">
      <div class="lite-brand" @click="router.push('/reports')">
        <div class="lite-logo">QC</div>
        <div>
          <strong style="font-size: 15px; display: block;">SENTINEL LITE</strong>
        </div>
      </div>
      <div class="lite-header-actions">
        <button type="button" class="lite-btn" @click="showKeyModal = true">🔑 AI Key</button>
        <button type="button" class="lite-btn" @click="toggleTheme">{{ theme === 'dark' ? '☀️' : '🌙' }}</button>
        <template v-if="isAuthenticated && user">
          <span class="lite-pill" :class="isAdmin ? 'high' : 'medium'">{{ isAdmin ? '👑 Admin' : '👁️ Viewer' }}</span>
          <button type="button" class="lite-btn lite-btn-danger" @click="handleLogout">Thoát</button>
        </template>
      </div>
    </header>
    <main><router-view /></main>

    <Teleport to="body">
      <div v-if="showKeyModal" class="lite-modal-backdrop" @click.self="showKeyModal = false">
        <div class="lite-modal-card" style="max-width: 420px;">
          <div class="lite-modal-header">
            <h3>🔑 Cấu hình Gemini API Key</h3>
            <button class="lite-close-btn" @click="showKeyModal = false">✕</button>
          </div>
          <div class="lite-modal-body">
            <div class="lite-field">
              <label>Nhập Gemini API Key (để dịch câu tiếng Việt bất kỳ sang 3 ngôn ngữ):</label>
              <input v-model="geminiKeyInput" type="password" class="lite-input" placeholder="AIzaSy..." />
            </div>
          </div>
          <div class="lite-modal-footer">
            <button class="lite-btn" @click="showKeyModal = false">Đóng</button>
            <button class="lite-btn lite-btn-primary" @click="saveKey">Lưu Key</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

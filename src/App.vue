<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from './composables/useTheme'
import { useAuth } from './composables/useAuth'
import { getGeminiKey, setGeminiKey } from './utils/aiHelper'

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
}

async function handleLogout() {
  if (!confirm('Bạn có chắc muốn đăng xuất?')) return
  await logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div v-if="!isAuthReady" style="min-height: 100vh; display: grid; place-items: center;">
    <strong>⏳ Đang khởi tạo Sentinel IPQC...</strong>
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

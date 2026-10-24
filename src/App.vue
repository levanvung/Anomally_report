<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useTheme } from './composables/useTheme'
import { useAuth } from './composables/useAuth'
import { getGeminiKey, setGeminiKey } from './utils/aiHelper'
import { globalLoading, toasts, showToast } from './composables/useReports'

const { theme, toggleTheme } = useTheme()
const { user, isAdmin, isLoading, authError, loginWithEmail, loginWithGoogle, logout } = useAuth()

const showKeyModal = ref(false)
const geminiKeyInput = ref(getGeminiKey())

// Trạng thái Modal Đăng nhập Admin ẩn
const showAdminModal = ref(false)
const adminForm = reactive({ email: '', password: '' })

// Bộ đếm gõ 3 lần liên tiếp vào Logo QC
let logoTapCount = 0
let logoTapTimer = null

function handleLogoSecretTap() {
  logoTapCount++
  if (logoTapTimer) clearTimeout(logoTapTimer)

  if (logoTapCount >= 3) {
    logoTapCount = 0
    if (isAdmin.value) {
      showToast('👑 Bạn đang ở chế độ Quản trị viên (Admin)!')
    } else {
      authError.value = ''
      adminForm.password = ''
      showAdminModal.value = true
    }
    return
  }

  // Tự động reset bộ đếm nếu quá 1.2 giây không gõ tiếp
  logoTapTimer = setTimeout(() => {
    logoTapCount = 0
  }, 1200)
}

// Hỗ trợ thêm phím tắt Ctrl + Shift + A trên máy tính để mở nhanh hộp thoại Admin
function handleKeydownShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
    e.preventDefault()
    if (!isAdmin.value) {
      authError.value = ''
      showAdminModal.value = true
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydownShortcut))
onUnmounted(() => window.removeEventListener('keydown', handleKeydownShortcut))

async function handleAdminEmailLogin() {
  const ok = await loginWithEmail(adminForm.email, adminForm.password)
  if (ok) {
    showAdminModal.value = false
    showToast('👑 Đã mở khóa chế độ Admin!')
  }
}

async function handleAdminGoogleLogin() {
  const ok = await loginWithGoogle()
  if (ok) {
    showAdminModal.value = false
    showToast('👑 Đã mở khóa chế độ Admin!')
  }
}

async function handleExitAdmin() {
  if (!confirm('Thoát chế độ Admin và quay về chế độ Xem?')) return
  await logout()
  showToast('👁️ Đã chuyển về chế độ Xem tiêu chuẩn.')
}

function saveKey() {
  setGeminiKey(geminiKeyInput.value)
  showKeyModal.value = false
  showToast('🔑 Đã lưu Gemini API Key!')
}
</script>

<template>
  <!-- GLOBAL LOADING MODAL -->
  <Teleport to="body">
    <div v-if="globalLoading.active" class="lite-modal-backdrop" style="z-index: 300;">
      <div
        class="lite-modal-card"
        style="max-width: 380px; padding: 24px; text-align: center; align-items: center;"
      >
        <div class="lite-spinner"></div>
        <h3 style="font-size: 15px; margin-bottom: 4px;">{{ globalLoading.title }}</h3>
        <p style="font-size: 12.5px; color: var(--text-sub);">{{ globalLoading.subtext }}</p>
        <div v-if="globalLoading.percent !== null" class="lite-progress-track">
          <div class="lite-progress-fill" :style="{ width: globalLoading.percent + '%' }"></div>
        </div>
        <span
          v-if="globalLoading.percent !== null"
          style="font-size: 11.5px; font-weight: 700; color: var(--accent); margin-top: 6px;"
        >
          {{ globalLoading.percent }}%
        </span>
      </div>
    </div>
  </Teleport>

  <!-- TOAST THÔNG BÁO -->
  <div class="lite-toast-container">
    <div v-for="t in toasts" :key="t.id" class="lite-toast-item">
      {{ t.text }}
    </div>
  </div>

  <div>
    <!-- HEADER SIÊU GỌN: Ẩn hoàn toàn nút Đăng nhập / Viewer đối với người xem thường -->
    <header class="lite-header">
      <div
        class="lite-brand"
        style="user-select: none;"
        title="Báo cáo Bất thường IPQC"
        @click="handleLogoSecretTap"
      >
        <div class="lite-logo">QC</div>
        <div>
          <strong style="font-size: 15px; display: block;">SENTINEL LITE</strong>
        </div>
      </div>

      <div class="lite-header-actions">
        <!-- Chỉ hiện nút AI Key, Huy hiệu Admin và nút Thoát khi ĐÃ Ở CHẾ ĐỘ ADMIN -->
        <template v-if="isAdmin && user">
          <button type="button" class="lite-btn" @click="showKeyModal = true">🔑 AI Key</button>
          <span class="lite-pill high">👑 Admin</span>
          <button type="button" class="lite-btn lite-btn-danger" @click="handleExitAdmin">
            Thoát Admin
          </button>
        </template>

        <!-- Nút đổi giao diện Sáng / Tối luôn hiển thị gọn gàng -->
        <button
          type="button"
          class="lite-btn"
          title="Đổi giao diện Sáng / Tối"
          @click="toggleTheme"
        >
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>

    <main>
      <router-view />
    </main>

    <!-- CỬA SỐ ĐĂNG NHẬP ADMIN BÍ MẬT (Mở khi gõ 3 lần vào Logo QC) -->
    <Teleport to="body">
      <div v-if="showAdminModal" class="lite-modal-backdrop" @click.self="showAdminModal = false">
        <div class="lite-modal-card" style="max-width: 400px;">
          <div class="lite-modal-header">
            <h3>🛡️ Mở khóa Chế độ Admin</h3>
            <button class="lite-close-btn" @click="showAdminModal = false">✕</button>
          </div>
          <div class="lite-modal-body">
            <div
              v-if="authError"
              style="
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
                padding: 10px;
                border-radius: 8px;
                font-size: 12px;
                margin-bottom: 12px;
              "
            >
              ⚠️ {{ authError }}
            </div>

            <form @submit.prevent="handleAdminEmailLogin">
              <div class="lite-field" style="margin-bottom: 10px;">
                <label>Email Quản trị viên (Admin)</label>
                <input
                  v-model="adminForm.email"
                  type="email"
                  required
                  class="lite-input"
                  placeholder="levanvung113@gmail.com"
                />
              </div>
              <div class="lite-field" style="margin-bottom: 14px;">
                <label>Mật khẩu</label>
                <input
                  v-model="adminForm.password"
                  type="password"
                  required
                  class="lite-input"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                class="lite-btn lite-btn-primary"
                style="width: 100%; padding: 10px;"
                :disabled="isLoading"
              >
                {{ isLoading ? '⏳ Đang xác thực...' : '🔓 Đăng nhập Admin' }}
              </button>
            </form>

            <div style="text-align: center; margin: 10px 0; font-size: 11.5px; color: var(--text-sub);">
              — hoặc —
            </div>

            <button
              type="button"
              class="lite-btn"
              style="width: 100%; padding: 10px;"
              :disabled="isLoading"
              @click="handleAdminGoogleLogin"
            >
              🌐 Đăng nhập nhanh bằng Google Admin
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL CẤU HÌNH GEMINI API KEY (Chỉ dành cho Admin) -->
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
              <input
                v-model="geminiKeyInput"
                type="password"
                class="lite-input"
                placeholder="AIzaSy..."
              />
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
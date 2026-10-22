<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { loginWithEmail, loginWithGoogle, isLoading, authError } = useAuth()
const form = reactive({ email: '', password: '' })

async function onSubmit() {
  const ok = await loginWithEmail(form.email, form.password)
  if (ok) router.push('/reports')
}

async function onGoogle() {
  const ok = await loginWithGoogle()
  if (ok) router.push('/reports')
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;">
    <div class="lite-modal-card" style="max-width: 400px; padding: 24px;">
      <h2 style="margin-bottom: 6px;">🛡️ Sentinel IPQC Lite</h2>
      <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 18px;">Đăng nhập hệ thống quản lý báo cáo bất thường</p>

      <div v-if="authError" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 10px; border-radius: 8px; font-size: 12px; margin-bottom: 12px;">
        {{ authError }}
      </div>

      <form @submit.prevent="onSubmit">
        <div class="lite-field" style="margin-bottom: 12px;">
          <label>Email</label>
          <input v-model="form.email" type="email" required class="lite-input" placeholder="levanvung113@gmail.com" />
        </div>
        <div class="lite-field" style="margin-bottom: 16px;">
          <label>Mật khẩu</label>
          <input v-model="form.password" type="password" required class="lite-input" placeholder="••••••••" />
        </div>
        <button type="submit" class="lite-btn lite-btn-primary" style="width: 100%; padding: 10px;" :disabled="isLoading">
          {{ isLoading ? '⏳ Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>

      <button type="button" class="lite-btn" style="width: 100%; margin-top: 10px; padding: 10px;" @click="onGoogle">
        🌐 Đăng nhập nhanh với Google
      </button>
    </div>
  </div>
</template>

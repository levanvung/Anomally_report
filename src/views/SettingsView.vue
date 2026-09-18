<script setup>
import { ref } from 'vue'
import {
  BellOutlined,
  GlobalOutlined,
  LockOutlined,
  SafetyOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'

const emailNotifications = ref(true)
const pushNotifications = ref(true)
const criticalAlerts = ref(true)
const weeklyReport = ref(false)
const twoFactorAuth = ref(true)
const sessionTimeout = ref('30')
const language = ref('vi')
const timezone = ref('Asia/Ho_Chi_Minh')
const autoAssign = ref(true)
const escalationTime = ref('4')
</script>

<template>
  <div class="settings-page">
    <div class="page-heading animate-in">
      <div>
        <div class="eyebrow">SYSTEM CONFIGURATION <span>•</span> SENTINEL</div>
        <h1>Cài đặt <span class="accent-star">✦</span></h1>
        <p>Quản lý cấu hình hệ thống và tùy chỉnh cá nhân.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- Notifications -->
      <div class="glass-card animate-in stagger-1">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div class="quick-action-icon" style="width: 32px; height: 32px;"><BellOutlined /></div>
          <h3 style="font-size: 15px; color: var(--text-primary);">Thông báo</h3>
        </div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Email thông báo</strong>
              <span>Nhận thông báo qua email khi có báo cáo mới</span>
            </div>
            <a-switch v-model:checked="emailNotifications" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Push notification</strong>
              <span>Thông báo đẩy trên trình duyệt</span>
            </div>
            <a-switch v-model:checked="pushNotifications" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Cảnh báo nghiêm trọng</strong>
              <span>Nhận ngay khi có bất thường mức critical</span>
            </div>
            <a-switch v-model:checked="criticalAlerts" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Báo cáo tuần</strong>
              <span>Tổng hợp báo cáo hàng tuần qua email</span>
            </div>
            <a-switch v-model:checked="weeklyReport" />
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="glass-card animate-in stagger-2">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div class="quick-action-icon" style="width: 32px; height: 32px;"><LockOutlined /></div>
          <h3 style="font-size: 15px; color: var(--text-primary);">Bảo mật</h3>
        </div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Xác thực hai bước (2FA)</strong>
              <span>Bảo vệ tài khoản với xác thực hai yếu tố</span>
            </div>
            <a-switch v-model:checked="twoFactorAuth" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Thời gian hết phiên</strong>
              <span>Tự động đăng xuất sau thời gian không hoạt động</span>
            </div>
            <a-select v-model:value="sessionTimeout" style="width: 120px;">
              <a-select-option value="15">15 phút</a-select-option>
              <a-select-option value="30">30 phút</a-select-option>
              <a-select-option value="60">1 giờ</a-select-option>
              <a-select-option value="120">2 giờ</a-select-option>
            </a-select>
          </div>
        </div>
      </div>

      <!-- General -->
      <div class="glass-card animate-in stagger-3">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div class="quick-action-icon" style="width: 32px; height: 32px;"><GlobalOutlined /></div>
          <h3 style="font-size: 15px; color: var(--text-primary);">Chung</h3>
        </div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Ngôn ngữ</strong>
              <span>Ngôn ngữ hiển thị giao diện</span>
            </div>
            <a-select v-model:value="language" style="width: 150px;">
              <a-select-option value="vi">Tiếng Việt</a-select-option>
              <a-select-option value="en">English</a-select-option>
            </a-select>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Múi giờ</strong>
              <span>Múi giờ cho hệ thống</span>
            </div>
            <a-select v-model:value="timezone" style="width: 180px;">
              <a-select-option value="Asia/Ho_Chi_Minh">UTC+7 (Hồ Chí Minh)</a-select-option>
              <a-select-option value="Asia/Bangkok">UTC+7 (Bangkok)</a-select-option>
              <a-select-option value="Asia/Tokyo">UTC+9 (Tokyo)</a-select-option>
            </a-select>
          </div>
        </div>
      </div>

      <!-- Workflow -->
      <div class="glass-card animate-in stagger-4">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div class="quick-action-icon" style="width: 32px; height: 32px;"><SafetyOutlined /></div>
          <h3 style="font-size: 15px; color: var(--text-primary);">Quy trình</h3>
        </div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Tự động phân công</strong>
              <span>Tự động gán người xử lý cho báo cáo mới</span>
            </div>
            <a-switch v-model:checked="autoAssign" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Thời gian leo thang</strong>
              <span>Tự động leo thang nếu chưa xử lý sau thời gian</span>
            </div>
            <a-select v-model:value="escalationTime" style="width: 120px;">
              <a-select-option value="2">2 giờ</a-select-option>
              <a-select-option value="4">4 giờ</a-select-option>
              <a-select-option value="8">8 giờ</a-select-option>
              <a-select-option value="24">24 giờ</a-select-option>
            </a-select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ant Switch dark override */
:deep(.ant-switch) {
  background: var(--bg-glass);
  border: 1px solid var(--border-default);
}
:deep(.ant-switch-checked) {
  background: var(--teal) !important;
  border-color: var(--teal) !important;
}

@media (max-width: 768px) {
  .settings-page > div {
    grid-template-columns: 1fr !important;
  }
}
</style>

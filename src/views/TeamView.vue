<script setup>
import { ref } from 'vue'
import {
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons-vue'

const teamMembers = ref([
  {
    name: 'Nguyễn Minh',
    role: 'Trưởng nhóm vận hành',
    email: 'minh.nguyen@sentinel.vn',
    phone: '0901 234 567',
    avatar: 'NM',
    color: 'linear-gradient(135deg, var(--teal), var(--teal-light))',
    assigned: 3,
    resolved: 12,
    avgTime: '4.2h',
    workload: 75,
  },
  {
    name: 'Lê Hoàng',
    role: 'Chuyên viên bảo mật',
    email: 'hoang.le@sentinel.vn',
    phone: '0912 345 678',
    avatar: 'LH',
    color: 'linear-gradient(135deg, #ff6b6b, #ffb347)',
    assigned: 2,
    resolved: 8,
    avgTime: '3.8h',
    workload: 50,
  },
  {
    name: 'Trần An',
    role: 'Kỹ sư hệ thống',
    email: 'an.tran@sentinel.vn',
    phone: '0923 456 789',
    avatar: 'TA',
    color: 'linear-gradient(135deg, #74c0fc, #4dabf7)',
    assigned: 2,
    resolved: 15,
    avgTime: '2.5h',
    workload: 40,
  },
  {
    name: 'Phạm Linh',
    role: 'Kiểm soát tài chính',
    email: 'linh.pham@sentinel.vn',
    phone: '0934 567 890',
    avatar: 'PL',
    color: 'linear-gradient(135deg, var(--medium), #fab005)',
    assigned: 1,
    resolved: 6,
    avgTime: '5.1h',
    workload: 25,
  },
  {
    name: 'Đỗ Vân',
    role: 'Kiểm soát tuân thủ',
    email: 'van.do@sentinel.vn',
    phone: '0945 678 901',
    avatar: 'ĐV',
    color: 'linear-gradient(135deg, var(--low), #51cf66)',
    assigned: 0,
    resolved: 4,
    avgTime: '6.0h',
    workload: 10,
  },
  {
    name: 'Vũ Hải',
    role: 'Quản trị viên hệ thống',
    email: 'hai.vu@sentinel.vn',
    phone: '0956 789 012',
    avatar: 'VH',
    color: 'linear-gradient(135deg, #b197fc, #845ef7)',
    assigned: 1,
    resolved: 9,
    avgTime: '3.2h',
    workload: 30,
  },
])

function getWorkloadColor(workload) {
  if (workload >= 70) return 'linear-gradient(90deg, var(--critical), var(--high))'
  if (workload >= 40) return 'linear-gradient(90deg, var(--high), var(--medium))'
  return 'linear-gradient(90deg, var(--teal), var(--accent))'
}
</script>

<template>
  <div class="team-page">
    <div class="page-heading animate-in">
      <div>
        <div class="eyebrow">TEAM MANAGEMENT <span>•</span> SENTINEL</div>
        <h1>Đội xử lý <span class="accent-star">✦</span></h1>
        <p>Quản lý thành viên và phân bổ công việc trong nhóm.</p>
      </div>
    </div>

    <div class="team-grid">
      <div
        v-for="(member, idx) in teamMembers"
        :key="member.name"
        class="glass-card team-card animate-in"
        :class="'stagger-' + (idx + 1)"
      >
        <div class="avatar-lg" :style="{ background: member.color }">
          {{ member.avatar }}
        </div>
        <h3>{{ member.name }}</h3>
        <div class="role">{{ member.role }}</div>

        <div class="team-stats">
          <div class="team-stat">
            <strong>{{ member.assigned }}</strong>
            <span>Đang xử lý</span>
          </div>
          <div class="team-stat">
            <strong>{{ member.resolved }}</strong>
            <span>Đã xong</span>
          </div>
          <div class="team-stat">
            <strong>{{ member.avgTime }}</strong>
            <span>TB xử lý</span>
          </div>
        </div>

        <!-- Workload -->
        <div style="margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Khối lượng công việc</span>
            <span style="font-size: 11px; font-weight: 700;" :style="{ color: member.workload >= 70 ? 'var(--critical)' : member.workload >= 40 ? 'var(--high)' : 'var(--accent)' }">{{ member.workload }}%</span>
          </div>
          <div class="workload-bar">
            <div class="workload-fill" :style="{ width: member.workload + '%', background: getWorkloadColor(member.workload) }"></div>
          </div>
        </div>

        <!-- Contact -->
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <a-button type="text" size="small" style="flex: 1; font-size: 11px; color: var(--text-muted);">
            <MailOutlined /> Email
          </a-button>
          <a-button type="text" size="small" style="flex: 1; font-size: 11px; color: var(--text-muted);">
            <PhoneOutlined /> Gọi
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useReports } from '../composables/useReports'
import {
  CheckCircleFilled,
  DashboardOutlined,
  ExclamationCircleFilled,
  FileSearchOutlined,
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  RiseOutlined,
} from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { reports, stats, severityLabels, statusLabels } = useReports()

const recentActivities = [
  { type: 'critical', text: 'Sai lệch tồn kho khu vực miền Nam', time: '2 giờ trước', detail: 'Mới phát hiện' },
  { type: 'high', text: 'Truy cập bất thường ngoài giờ', time: '3 giờ trước', detail: 'Đang điều tra' },
  { type: 'info', text: 'Giao dịch hoàn tiền trùng lặp', time: '1 ngày trước', detail: 'Đã giải quyết' },
  { type: 'high', text: 'Nhiệt độ dây chuyền vượt ngưỡng', time: '2 ngày trước', detail: 'Đang điều tra' },
  { type: 'low', text: 'Thiếu chữ ký biên bản bàn giao', time: '4 ngày trước', detail: 'Đã đóng' },
]

const quickActions = [
  { icon: PlusOutlined, label: 'Tạo báo cáo mới', route: '/reports' },
  { icon: SearchOutlined, label: 'Tìm kiếm bất thường', route: '/reports' },
  { icon: ThunderboltOutlined, label: 'Xem đội xử lý', route: '/team' },
]

function getSeverityDistribution() {
  const total = reports.value.length || 1
  return {
    critical: reports.value.filter(r => r.severity === 'critical').length,
    high: reports.value.filter(r => r.severity === 'high').length,
    medium: reports.value.filter(r => r.severity === 'medium').length,
    low: reports.value.filter(r => r.severity === 'low').length,
    total,
  }
}
</script>

<template>
  <div class="dashboard-page">
    <div class="page-heading animate-in">
      <div>
        <div class="eyebrow">OPERATIONS CENTER <span>•</span> 17 SEP 2026</div>
        <h1>Xin chào, Anh Vũ <span class="accent-star">✦</span></h1>
        <p>Theo dõi và xử lý các tín hiệu bất thường trong hệ thống.</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card stat-total animate-in stagger-1">
        <div class="stat-top">
          <span>Tổng báo cáo</span>
          <div class="stat-icon"><FileSearchOutlined /></div>
        </div>
        <strong>{{ stats.total }}</strong>
        <div class="stat-foot"><span class="trend-up">↗ 12%</span> so với tháng trước</div>
      </div>
      <div class="stat-card animate-in stagger-2">
        <div class="stat-top">
          <span>Đang chờ xử lý</span>
          <div class="stat-icon orange"><ExclamationCircleFilled /></div>
        </div>
        <strong>{{ stats.open + stats.investigating }}</strong>
        <div class="stat-foot"><span class="trend-warn">Cần chú ý</span> trong 24 giờ</div>
      </div>
      <div class="stat-card animate-in stagger-3">
        <div class="stat-top">
          <span>Đang điều tra</span>
          <div class="stat-icon blue"><SearchOutlined /></div>
        </div>
        <strong>{{ stats.investigating }}</strong>
        <div class="stat-foot"><span class="trend-neutral">{{ stats.total ? Math.round((stats.investigating / stats.total) * 100) : 0 }}%</span> tổng báo cáo</div>
      </div>
      <div class="stat-card animate-in stagger-4">
        <div class="stat-top">
          <span>Đã giải quyết</span>
          <div class="stat-icon green"><CheckCircleFilled /></div>
        </div>
        <strong>{{ stats.resolved }}</strong>
        <div class="stat-foot"><span class="trend-up">↗ 8%</span> hiệu suất xử lý</div>
      </div>
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
      <!-- Left: Activity + Distribution -->
      <div>
        <!-- Severity Distribution -->
        <div class="glass-card animate-in stagger-5" style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; margin-bottom: 4px; color: var(--text-primary);">Phân bổ mức độ</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 0;">Thống kê báo cáo theo mức độ nghiêm trọng</p>
          <div class="dist-chart">
            <div class="dist-bar" :style="{ height: (getSeverityDistribution().critical / getSeverityDistribution().total * 100) + '%', background: 'var(--critical)', minHeight: getSeverityDistribution().critical ? '8px' : '2px' }" data-label="Nghiêm trọng"></div>
            <div class="dist-bar" :style="{ height: (getSeverityDistribution().high / getSeverityDistribution().total * 100) + '%', background: 'var(--high)', minHeight: getSeverityDistribution().high ? '8px' : '2px' }" data-label="Cao"></div>
            <div class="dist-bar" :style="{ height: (getSeverityDistribution().medium / getSeverityDistribution().total * 100) + '%', background: 'var(--medium)', minHeight: getSeverityDistribution().medium ? '8px' : '2px' }" data-label="Trung bình"></div>
            <div class="dist-bar" :style="{ height: (getSeverityDistribution().low / getSeverityDistribution().total * 100) + '%', background: 'var(--low)', minHeight: getSeverityDistribution().low ? '8px' : '2px' }" data-label="Thấp"></div>
          </div>
          <div class="dist-legend">
            <div class="dist-legend-item"><div class="dist-legend-dot" style="background: var(--critical);"></div> Nghiêm trọng ({{ getSeverityDistribution().critical }})</div>
            <div class="dist-legend-item"><div class="dist-legend-dot" style="background: var(--high);"></div> Cao ({{ getSeverityDistribution().high }})</div>
            <div class="dist-legend-item"><div class="dist-legend-dot" style="background: var(--medium);"></div> Trung bình ({{ getSeverityDistribution().medium }})</div>
            <div class="dist-legend-item"><div class="dist-legend-dot" style="background: var(--low);"></div> Thấp ({{ getSeverityDistribution().low }})</div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="glass-card animate-in stagger-6">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h3 style="font-size: 14px; margin-bottom: 4px; color: var(--text-primary);">Hoạt động gần đây</h3>
              <p style="font-size: 11px; color: var(--text-muted);">Cập nhật mới nhất từ hệ thống</p>
            </div>
            <ClockCircleOutlined style="color: var(--text-muted); font-size: 16px;" />
          </div>
          <ul class="activity-list">
            <li v-for="(activity, idx) in recentActivities" :key="idx" class="activity-item" :style="{ animationDelay: (idx * 80 + 200) + 'ms' }">
              <div class="activity-dot" :class="activity.type"></div>
              <div class="activity-content">
                <strong>{{ activity.text }}</strong>
                <span>{{ activity.detail }} · {{ activity.time }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right: Quick Actions + Overview -->
      <div>
        <!-- Quick Actions -->
        <div class="glass-card animate-in stagger-5" style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--text-primary);">Thao tác nhanh</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div v-for="(action, idx) in quickActions" :key="idx" class="quick-action" @click="router.push(action.route)">
              <div class="quick-action-icon"><component :is="action.icon" /></div>
              <span>{{ action.label }}</span>
              <ArrowRightOutlined style="margin-left: auto; font-size: 11px; color: var(--text-muted);" />
            </div>
          </div>
        </div>

        <!-- Status Overview -->
        <div class="glass-card animate-in stagger-6">
          <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--text-primary);">Tổng quan trạng thái</h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--status-open);"></div>
                <span style="font-size: 12px; color: var(--text-secondary);">Mới tạo</span>
              </div>
              <strong style="font: 600 16px var(--font-heading); color: var(--text-primary);">{{ stats.open }}</strong>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--status-investigating);"></div>
                <span style="font-size: 12px; color: var(--text-secondary);">Đang điều tra</span>
              </div>
              <strong style="font: 600 16px var(--font-heading); color: var(--text-primary);">{{ stats.investigating }}</strong>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--status-resolved);"></div>
                <span style="font-size: 12px; color: var(--text-secondary);">Đã giải quyết</span>
              </div>
              <strong style="font: 600 16px var(--font-heading); color: var(--text-primary);">{{ stats.resolved }}</strong>
            </div>
          </div>

          <!-- Performance indicator -->
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Tỷ lệ xử lý</span>
              <span style="font-size: 13px; color: var(--accent); font-weight: 700;">{{ stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0 }}%</span>
            </div>
            <div class="workload-bar">
              <div class="workload-fill" :style="{ width: (stats.total ? (stats.resolved / stats.total) * 100 : 0) + '%', background: 'linear-gradient(90deg, var(--teal), var(--accent))' }"></div>
            </div>
          </div>
        </div>

        <!-- System health -->
        <div class="glass-card animate-in stagger-7" style="margin-top: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #69db7c; box-shadow: 0 0 8px rgba(105,219,124,0.4); animation: pulse-dot 2s ease-in-out infinite;"></div>
            <div>
              <strong style="font-size: 13px; color: var(--text-primary); display: block;">Hệ thống ổn định</strong>
              <span style="font-size: 10px; color: var(--text-muted);">Uptime 99.98% · Cập nhật 2 phút trước</span>
            </div>
            <RiseOutlined style="margin-left: auto; color: var(--low); font-size: 18px;" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

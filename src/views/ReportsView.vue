<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useReports, getDefectRateLevel, commonProcesses } from '../composables/useReports'
import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FileSearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  PictureOutlined,
  UploadOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  ToolOutlined,
  UserOutlined,
  AppstoreOutlined,
  FileTextOutlined,
} from '@ant-design/icons-vue'
import { useAuth } from '../composables/useAuth'

const { isAdmin, canCreate, canEdit, canDelete } = useAuth()

const {
  searchText,
  statusFilter,
  severityFilter,
  processFilter,
  activeStat,
  currentPage,
  pageSize,
  isModalOpen,
  isEditing,
  editingId,
  isSaving,
  isDetailOpen,
  selectedReport,
  form,
  selectedImageFile,
  imagePreviewUrl,
  handleImageSelected,
  removeAttachedImage,
  onQuantityOrDefectChange,
  filteredReports,
  pagedReports,
  stats,
  t,
  severityLabels,
  statusLabels,
  severityClass,
  statusClass,
  filterByStat,
  resetFilters,
  openCreate,
  openEdit,
  openDetail,
  closeDetail,
  updateStatus,
  saveReport,
  removeReport,
  changePage,
} = useReports()

const fileInputRef = ref(null)

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function onFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (file) {
    handleImageSelected(file)
  }
}

function onFileDrop(e) {
  const file = e.dataTransfer.files && e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    handleImageSelected(file)
  }
}

// ─── Responsive Drawer Width (100% on Mobile/Tablet) ───
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

function handleResize() {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const drawerWidth = computed(() => {
  if (windowWidth.value <= 768) {
    return '100%'
  }
  if (windowWidth.value <= 1200) {
    return '640px'
  }
  return '720px'
})
</script>

<template>
  <div class="reports-page">
    <!-- Page Heading -->
    <div class="page-heading animate-in">
      <div>
        <div class="eyebrow">
          <span>●</span> {{ t('eyebrow') }}
        </div>
        <h1>{{ t('title') }} <span class="accent-star">✦</span></h1>
        <p>{{ t('subtitle') }}</p>
      </div>
    </div>

    <!-- Stats Grid (Clickable to Filter) -->
    <div class="stats-grid">
      <div
        class="stat-card stat-total animate-in stagger-1"
        :class="{ 'active-stat': activeStat === 'all' }"
        :title="t('filterAll')"
        @click="filterByStat('all')"
      >
        <div class="stat-top">
          <span>{{ t('totalReports') }}</span>
          <div class="stat-icon"><FileSearchOutlined /></div>
        </div>
        <strong>{{ stats.total }}</strong>
        <div class="stat-foot">
          <span class="trend-up">100%</span> {{ t('totalFoot') }}
        </div>
      </div>

      <div
        class="stat-card stat-warn animate-in stagger-2"
        :class="{ 'active-stat': activeStat === 'attention' }"
        :title="t('attentionNeeded')"
        @click="filterByStat('attention')"
      >
        <div class="stat-top">
          <span>{{ t('attentionNeeded') }}</span>
          <div class="stat-icon orange"><ExclamationCircleFilled /></div>
        </div>
        <strong>{{ stats.open + stats.investigating }}</strong>
        <div class="stat-foot">
          <span class="trend-warn">{{ t('highPriority') }}</span> {{ t('attentionFoot') }}
        </div>
      </div>

      <div
        class="stat-card stat-investigating animate-in stagger-3"
        :class="{ 'active-stat': activeStat === 'investigating' }"
        :title="t('investigating')"
        @click="filterByStat('investigating')"
      >
        <div class="stat-top">
          <span>{{ t('investigating') }}</span>
          <div class="stat-icon blue"><SearchOutlined /></div>
        </div>
        <strong>{{ stats.investigating }}</strong>
        <div class="stat-foot">
          <span class="trend-neutral">{{ stats.total ? Math.round((stats.investigating / stats.total) * 100) : 0 }}%</span> {{ t('investigatingFoot') }}
        </div>
      </div>

      <div
        class="stat-card stat-resolved animate-in stagger-4"
        :class="{ 'active-stat': activeStat === 'resolved' }"
        :title="t('resolved')"
        @click="filterByStat('resolved')"
      >
        <div class="stat-top">
          <span>{{ t('resolved') }}</span>
          <div class="stat-icon green"><CheckCircleFilled /></div>
        </div>
        <strong>{{ stats.resolved }}</strong>
        <div class="stat-foot">
          <span class="trend-up">↗ {{ stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0 }}%</span> {{ t('resolvedRate') }}
        </div>
      </div>
    </div>

    <!-- Control Bar: Search, Process, Dropdowns & Quick Chips -->
    <div class="control-bar animate-in stagger-5">
      <div class="control-top">
        <div class="search-box">
          <a-input
            v-model:value="searchText"
            allow-clear
            size="large"
            placeholder="Tìm theo Model, Công đoạn, Máy, Lỗi, Nhân sự..."
            @change="currentPage = 1"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </div>

        <div class="filter-group">
          <!-- Process Filter -->
          <a-select
            v-model:value="processFilter"
            class="filter-select"
            size="large"
            @change="currentPage = 1"
          >
            <template #suffixIcon><AppstoreOutlined /></template>
            <a-select-option value="all">Tất cả công đoạn</a-select-option>
            <a-select-option v-for="proc in commonProcesses" :key="proc" :value="proc">
              {{ proc }}
            </a-select-option>
          </a-select>

          <!-- Status Filter -->
          <a-select
            v-model:value="statusFilter"
            class="filter-select"
            size="large"
            @change="currentPage = 1"
          >
            <template #suffixIcon><FilterOutlined /></template>
            <a-select-option value="all">{{ t('allStatuses') }}</a-select-option>
            <a-select-option value="open">{{ t('statusOpen') }}</a-select-option>
            <a-select-option value="investigating">{{ t('statusInvestigating') }}</a-select-option>
            <a-select-option value="resolved">{{ t('statusResolved') }}</a-select-option>
            <a-select-option value="closed">{{ t('statusClosed') }}</a-select-option>
          </a-select>

          <a-button class="filter-reset-btn" @click="resetFilters">
            <ReloadOutlined /> {{ t('resetFilter') }}
          </a-button>
        </div>
      </div>

      <!-- Quick Chips -->
      <div class="quick-chips">
        <span class="chip-label">{{ t('quickFilterLabel') }}</span>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'all' && statusFilter === 'all' && severityFilter === 'all' && processFilter === 'all' }"
          @click="resetFilters"
        >
          {{ t('filterAll') }} ({{ stats.total }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'attention' }"
          @click="filterByStat('attention')"
        >
          {{ t('filterUrgent') }} ({{ stats.open + stats.investigating }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: severityFilter === 'critical' }"
          @click="severityFilter = severityFilter === 'critical' ? 'all' : 'critical'; currentPage = 1"
        >
          {{ t('filterCritical') }} ({{ stats.critical }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'investigating' }"
          @click="filterByStat('investigating')"
        >
          {{ t('filterInvestigating') }} ({{ stats.investigating }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'resolved' }"
          @click="filterByStat('resolved')"
        >
          {{ t('filterResolved') }} ({{ stats.resolved }})
        </button>
      </div>
    </div>

    <!-- Data Table (15 Cột Chuẩn Hoá - Hiển thị trên Desktop / Tablet >= 768px) -->
    <div class="table-wrap desktop-only animate-in stagger-6">
      <!-- Table Header Bar với nút tạo báo cáo bên phải -->
      <div class="table-header-bar">
        <div class="table-header-left">
          <h3 class="table-header-title">
            <FileTextOutlined style="margin-right: 6px; color: var(--accent);" />{{ t('title') }}
          </h3>
          <span class="table-header-badge">{{ filteredReports.length }} {{ t('records') || 'báo cáo' }}</span>
        </div>
        <div v-if="canCreate" class="table-header-right">
          <a-button type="primary" class="table-create-btn" @click="openCreate">
            <PlusOutlined /> {{ t('createNew') }}
          </a-button>
        </div>
      </div>

      <a-table
        :data-source="pagedReports"
        :pagination="false"
        row-key="id"
        bordered
        :scroll="{ x: 2090 }"
      >
        <!-- 1. STT Column -->
        <a-table-column :title="t('colNo')" key="stt" :width="65" align="center" fixed="left">
          <template #default="{ index }">
            <span class="stt-badge">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
          </template>
        </a-table-column>

        <!-- 2. Date Column -->
        <a-table-column :title="t('colDate')" key="date" :width="120" fixed="left">
          <template #default="{ record }">
            <span class="date-tag">
              <CalendarOutlined style="margin-right: 4px;" />{{ record.date || record.createdAt }}
            </span>
          </template>
        </a-table-column>

        <!-- 3. Process Column -->
        <a-table-column :title="t('colProcess')" key="process" :width="140">
          <template #default="{ record }">
            <span class="process-tag">{{ record.process }}</span>
          </template>
        </a-table-column>

        <!-- 4. Product model Column -->
        <a-table-column :title="t('colProductModel')" key="productModel" :width="160">
          <template #default="{ record }">
            <strong class="model-code" @click="openDetail(record)" :title="record.productModel">
              {{ record.productModel }}
            </strong>
          </template>
        </a-table-column>

        <!-- 5. Machine Column -->
        <a-table-column :title="t('colMachine')" key="machine" :width="150">
          <template #default="{ record }">
            <span class="machine-text" :title="record.machine">
              <ToolOutlined />{{ record.machine }}
            </span>
          </template>
        </a-table-column>

        <!-- 6. Quantity Column -->
        <a-table-column :title="t('colQuantity')" key="quantity" :width="110" align="right">
          <template #default="{ record }">
            <span class="num-text font-bold">{{ Number(record.quantity).toLocaleString() }}</span>
          </template>
        </a-table-column>

        <!-- 7. Defect quantity Column -->
        <a-table-column :title="t('colDefectQuantity')" key="defectQuantity" :width="130" align="right">
          <template #default="{ record }">
            <span class="defect-qty-badge">{{ Number(record.defectQuantity).toLocaleString() }}</span>
          </template>
        </a-table-column>

        <!-- 8. Defect rate Column (Tự động tính) -->
        <a-table-column :title="t('colDefectRate')" key="defectRate" :width="125" align="center">
          <template #default="{ record }">
            <span
              class="defect-rate-pill"
              :class="getDefectRateLevel(record.defectRate).severity"
            >
              {{ record.defectRate }}
            </span>
          </template>
        </a-table-column>

        <!-- 9. Người chịu trách nhiệm Column -->
        <a-table-column :title="t('colResponsiblePerson')" key="responsiblePerson" :width="180">
          <template #default="{ record }">
            <div class="person-cell" :title="record.responsiblePerson">
              <UserOutlined class="person-icon responsible" />
              <span class="person-name">{{ record.responsiblePerson }}</span>
            </div>
          </template>
        </a-table-column>

        <!-- 10. Người phụ trách Column -->
        <a-table-column :title="t('colAssignee')" key="assignee" :width="180">
          <template #default="{ record }">
            <div class="person-cell" :title="record.assignee">
              <ToolOutlined class="person-icon assignee" />
              <span class="person-name">{{ record.assignee }}</span>
            </div>
          </template>
        </a-table-column>

        <!-- 11. Defect image Column -->
        <a-table-column :title="t('colDefectImage')" key="defectImage" :width="105" align="center">
          <template #default="{ record }">
            <div class="table-img-cell">
              <div v-if="record.imageUrl" class="table-image-thumb-box" :title="t('viewFullImage')">
                <a-image
                  :src="record.imageUrl"
                  :alt="record.productModel"
                  class="table-image-thumb"
                />
              </div>
              <div v-else class="table-no-img" :title="t('noImage')">
                <PictureOutlined />
              </div>
            </div>
          </template>
        </a-table-column>

        <!-- 12. Defect description Column -->
        <a-table-column :title="t('colDefectDescription')" key="defectDescription" :width="230">
          <template #default="{ record }">
            <div class="text-truncate-cell" :title="record.defectDescription" @click="openDetail(record)">
              {{ record.defectDescription }}
            </div>
          </template>
        </a-table-column>

        <!-- 13. Progress Note Column -->
        <a-table-column :title="t('colProgressNote')" key="progressNote" :width="210">
          <template #default="{ record }">
            <div class="text-truncate-cell note-text" :title="record.progressNote" @click="openDetail(record)">
              {{ record.progressNote || '—' }}
            </div>
          </template>
        </a-table-column>

        <!-- 14. Người tạo Column -->
        <a-table-column :title="t('colCreator')" key="creator" :width="180">
          <template #default="{ record }">
            <span class="creator-tag" :title="record.creator || 'Admin'">
              <UserOutlined style="margin-right: 5px; flex-shrink: 0;" />
              <span class="creator-name">{{ record.creator || 'Admin' }}</span>
            </span>
          </template>
        </a-table-column>

        <!-- 15. Action Column -->
        <a-table-column :title="t('colActions')" key="actions" :width="130" align="center" fixed="right">
          <template #default="{ record }">
            <div class="row-actions">
              <button
                type="button"
                class="action-btn"
                :title="t('actionView')"
                @click="openDetail(record)"
              >
                <EyeOutlined />
              </button>
              <template v-if="canEdit || canDelete">
                <button
                  type="button"
                  class="action-btn"
                  :title="t('actionEdit')"
                  @click="openEdit(record)"
                >
                  <EditOutlined />
                </button>
                <button
                  type="button"
                  class="action-btn delete-btn"
                  :title="t('actionDelete')"
                  @click="removeReport(record)"
                >
                  <DeleteOutlined />
                </button>
              </template>
            </div>
          </template>
        </a-table-column>

        <!-- Empty State Slot -->
        <template #emptyText>
          <div class="empty-box">
            <div class="empty-box-icon"><FileSearchOutlined /></div>
            <h3>{{ t('emptyTitle') }}</h3>
            <p>{{ t('emptyDesc') }}</p>
            <a-button type="default" @click="resetFilters">{{ t('resetFilter') }}</a-button>
          </div>
        </template>
      </a-table>

      <!-- Table Footer -->
      <div class="table-footer">
        <span>{{ t('showingCount', { paged: pagedReports.length, total: filteredReports.length }) }}</span>
        <a-pagination
          v-model:current="currentPage"
          :page-size="pageSize"
          :total="filteredReports.length"
          size="default"
          show-less-items
          @change="changePage"
        />
      </div>
    </div>

    <!-- Mobile Card View (Tối ưu 15 trường cho Mobile < 768px) -->
    <div class="mobile-cards-wrap mobile-only animate-in stagger-6">
      <div class="mobile-header-bar">
        <div class="mobile-header-left">
          <span class="mobile-header-title">{{ t('title') }}</span>
          <span class="table-header-badge">{{ filteredReports.length }}</span>
        </div>
        <a-button v-if="canCreate" type="primary" size="small" class="table-create-btn" @click="openCreate">
          <PlusOutlined /> {{ t('createNew') }}
        </a-button>
      </div>
      <!-- Empty State -->
      <div v-if="filteredReports.length === 0" class="empty-box">
        <div class="empty-box-icon"><FileSearchOutlined /></div>
        <h3>{{ t('emptyTitle') }}</h3>
        <p>{{ t('emptyDesc') }}</p>
        <a-button type="default" @click="resetFilters">{{ t('resetFilter') }}</a-button>
      </div>

      <!-- Card List -->
      <div v-else class="mobile-card-list">
        <div
          v-for="(record, idx) in pagedReports"
          :key="record.id"
          class="report-mobile-card"
        >
          <!-- Card Header: STT + Model + Defect Rate Badge -->
          <div class="mobile-card-header">
            <div class="mobile-card-model-group">
              <span class="stt-badge">#{{ (currentPage - 1) * pageSize + idx + 1 }}</span>
              <strong class="mobile-card-model">{{ record.productModel }}</strong>
            </div>
            <div class="mobile-card-pills">
              <span
                class="defect-rate-pill"
                :class="getDefectRateLevel(record.defectRate).severity"
              >
                {{ record.defectRate }}
              </span>
              <span class="status-pill" :class="statusClass(record.status)">
                {{ statusLabels[record.status] }}
              </span>
            </div>
          </div>

          <!-- Manufacturing Metrics 3-Box Bar -->
          <div class="mobile-metrics-grid">
            <div class="mobile-metric-item">
              <span class="metric-label">{{ t('detailQuantity') }}</span>
              <strong class="metric-val">{{ Number(record.quantity).toLocaleString() }}</strong>
            </div>
            <div class="mobile-metric-item danger">
              <span class="metric-label">{{ t('detailDefectQty') }}</span>
              <strong class="metric-val">{{ Number(record.defectQuantity).toLocaleString() }}</strong>
            </div>
            <div class="mobile-metric-item highlight">
              <span class="metric-label">{{ t('detailDefectRate') }}</span>
              <strong class="metric-val">{{ record.defectRate }}</strong>
            </div>
          </div>

          <!-- Card Process, Machine & Date -->
          <div class="mobile-subinfo-row">
            <span class="process-tag">{{ record.process }}</span>
            <span class="machine-badge">⚙️ {{ record.machine }}</span>
            <span class="date-tag">📅 {{ record.date || record.createdAt }}</span>
          </div>

          <!-- Defect Photo Banner (Hiển thị to rõ trên Mobile khi có ảnh) -->
          <div v-if="record.imageUrl" class="mobile-card-photo-banner">
            <a-image
              :src="record.imageUrl"
              :alt="record.productModel"
              class="mobile-card-banner-img"
            />
            <div class="mobile-photo-tag">
              <PictureOutlined /> <span>{{ t('colDefectImage') }}</span>
            </div>
            <div class="mobile-photo-zoom-badge">
              <span>🔍 Phóng to & vuốt chọn vùng xem</span>
            </div>
          </div>

          <!-- Defect Description & Progress Note -->
          <div class="mobile-card-desc-box" @click="openDetail(record)">
            <div class="mobile-desc-title">{{ t('colDefectDescription') }}:</div>
            <p class="mobile-desc-content">{{ record.defectDescription }}</p>
            <div v-if="record.progressNote" class="mobile-note-box">
              <span class="note-label">{{ t('colProgressNote') }}:</span> {{ record.progressNote }}
            </div>
          </div>

          <!-- Personnel Meta Row -->
          <div class="mobile-card-meta">
            <div class="mobile-meta-item">
              <span class="meta-icon-tag">👤 {{ t('colResponsiblePerson') }}:</span>
              <span>{{ record.responsiblePerson }}</span>
            </div>
            <div class="mobile-meta-item">
              <span class="meta-icon-tag">🔧 {{ t('colAssignee') }}:</span>
              <span>{{ record.assignee }}</span>
            </div>
            <div class="mobile-meta-item date-item">
              <span>{{ t('colCreator') }}: {{ record.creator || 'Admin' }}</span>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="mobile-card-actions">
            <button
              type="button"
              class="mobile-action-btn view"
              @click="openDetail(record)"
            >
              <EyeOutlined /> <span>{{ t('actionView') }}</span>
            </button>
            <template v-if="canEdit || canDelete">
              <button
                type="button"
                class="mobile-action-btn edit"
                @click="openEdit(record)"
              >
                <EditOutlined /> <span>{{ t('actionEdit') }}</span>
              </button>
              <button
                type="button"
                class="mobile-action-btn delete"
                @click="removeReport(record)"
              >
                <DeleteOutlined /> <span>{{ t('actionDelete') }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination -->
      <div class="mobile-card-footer">
        <span class="mobile-count-text">{{ t('showingCount', { paged: pagedReports.length, total: filteredReports.length }) }}</span>
        <a-pagination
          v-model:current="currentPage"
          :page-size="pageSize"
          :total="filteredReports.length"
          size="small"
          show-less-items
          @change="changePage"
        />
      </div>
    </div>

    <!-- Modal Xem Chi Tiết 15 Thông Tin Báo Cáo -->
    <a-modal
      v-model:open="isDetailOpen"
      width="780px"
      class="detail-modal"
      :footer="null"
      @cancel="closeDetail"
    >
      <div v-if="selectedReport" class="detail-content">
        <div class="detail-header">
          <div class="detail-badge-row">
            <span class="report-cell-id">{{ selectedReport.id }}</span>
            <span class="process-tag">{{ selectedReport.process }}</span>
            <span class="machine-badge">⚙️ {{ selectedReport.machine }}</span>
            <span
              class="defect-rate-pill"
              :class="getDefectRateLevel(selectedReport.defectRate).severity"
            >
              {{ selectedReport.defectRate }}
            </span>
            <span class="status-pill" :class="statusClass(selectedReport.status)">
              {{ statusLabels[selectedReport.status] }}
            </span>
          </div>
          <h2 class="detail-title">{{ selectedReport.productModel }} · {{ selectedReport.process }}</h2>
        </div>

        <!-- 3 Metrics Big Box in Detail Modal -->
        <div class="detail-metrics-banner">
          <div class="detail-metric-card">
            <span>{{ t('detailQuantity') }}</span>
            <strong>{{ Number(selectedReport.quantity).toLocaleString() }}</strong>
          </div>
          <div class="detail-metric-card alert">
            <span>{{ t('detailDefectQty') }}</span>
            <strong>{{ Number(selectedReport.defectQuantity).toLocaleString() }}</strong>
          </div>
          <div class="detail-metric-card rate">
            <span>{{ t('detailDefectRate') }}</span>
            <strong>{{ selectedReport.defectRate }}</strong>
          </div>
        </div>

        <!-- Defect Description -->
        <div class="detail-section-block">
          <div class="detail-section-title">📌 {{ t('detailDesc') }}</div>
          <div class="detail-desc-box">
            {{ selectedReport.defectDescription }}
          </div>
        </div>

        <!-- Progress Note -->
        <div v-if="selectedReport.progressNote" class="detail-section-block">
          <div class="detail-section-title">📝 {{ t('detailProgress') }}</div>
          <div class="detail-note-box">
            {{ selectedReport.progressNote }}
          </div>
        </div>

        <!-- Defect Image display -->
        <div v-if="selectedReport.imageUrl" class="detail-image-box">
          <div class="detail-section-title">📷 {{ t('labelDefectImage') }}</div>
          <div class="detail-image-preview">
            <a-image
              :src="selectedReport.imageUrl"
              :alt="selectedReport.productModel"
              class="detail-report-img"
            />
          </div>
        </div>

        <!-- Personnel & Tracking Grid -->
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailDate') }}</div>
            <div class="detail-info-value">📅 {{ selectedReport.date || selectedReport.createdAt }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailResponsible') }}</div>
            <div class="detail-info-value">👤 {{ selectedReport.responsiblePerson }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailAssignee') }}</div>
            <div class="detail-info-value">🔧 {{ selectedReport.assignee }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailCreator') }}</div>
            <div class="detail-info-value">✍️ {{ selectedReport.creator || 'Admin' }}</div>
          </div>
        </div>

        <!-- Quick Status Change Action -->
        <div class="detail-status-action">
          <span class="detail-status-label">{{ t('quickStatusUpdate') }}</span>
          <div class="status-btn-group">
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'open' }"
              :disabled="!isAdmin"
              :title="!isAdmin ? t('noPermissionEdit') : ''"
              @click="isAdmin && updateStatus(selectedReport.id, 'open')"
            >
              {{ t('statusOpen') }}
            </button>
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'investigating' }"
              :disabled="!isAdmin"
              :title="!isAdmin ? t('noPermissionEdit') : ''"
              @click="isAdmin && updateStatus(selectedReport.id, 'investigating')"
            >
              {{ t('statusInvestigating') }}
            </button>
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'resolved' }"
              :disabled="!isAdmin"
              :title="!isAdmin ? t('noPermissionEdit') : ''"
              @click="isAdmin && updateStatus(selectedReport.id, 'resolved')"
            >
              {{ t('statusResolved') }}
            </button>
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'closed' }"
              :disabled="!isAdmin"
              :title="!isAdmin ? t('noPermissionEdit') : ''"
              @click="isAdmin && updateStatus(selectedReport.id, 'closed')"
            >
              {{ t('statusClosed') }}
            </button>
          </div>

          <a-button v-if="canEdit" type="primary" style="margin-left: auto;" @click="openEdit(selectedReport)">
            <EditOutlined /> {{ t('editInfo') }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Drawer Tạo / Chỉnh sửa Báo Cáo 15 Cột -->
    <a-drawer
      v-model:open="isModalOpen"
      :width="drawerWidth"
      :title="isEditing ? t('modalEditTitle') : t('modalCreateTitle')"
      placement="right"
      class="report-drawer"
      :mask-closable="true"
    >


      <a-form layout="vertical" class="report-form">
        <!-- Nhóm 1: Ngày, Công đoạn, Model & Máy -->
        <div class="form-grid">
          <a-form-item :label="t('labelDate')" required>
            <a-input
              v-model:value="form.date"
              type="date"
              size="large"
            />
          </a-form-item>

          <a-form-item :label="t('labelProcess')" required>
            <a-select v-model:value="form.process" size="large">
              <a-select-option v-for="proc in commonProcesses" :key="proc" :value="proc">
                {{ proc }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </div>

        <div class="form-grid">
          <a-form-item :label="t('labelProductModel')" required>
            <a-input
              v-model:value="form.productModel"
              size="large"
              :placeholder="t('placeholderProductModel')"
            />
          </a-form-item>

          <a-form-item :label="t('labelMachine')" required>
            <a-input
              v-model:value="form.machine"
              size="large"
              :placeholder="t('placeholderMachine')"
            />
          </a-form-item>
        </div>

        <!-- Nhóm 2: Số lượng, Số lượng lỗi & Tỷ lệ lỗi tự tính -->
        <div class="form-grid-3">
          <a-form-item :label="t('labelQuantity')" required>
            <a-input-number
              v-model:value="form.quantity"
              :min="1"
              size="large"
              style="width: 100%;"
              :placeholder="t('placeholderQuantity')"
              @change="onQuantityOrDefectChange"
            />
          </a-form-item>

          <a-form-item :label="t('labelDefectQuantity')" required>
            <a-input-number
              v-model:value="form.defectQuantity"
              :min="0"
              size="large"
              style="width: 100%;"
              :placeholder="t('placeholderDefectQuantity')"
              @change="onQuantityOrDefectChange"
            />
          </a-form-item>

          <a-form-item :label="t('labelDefectRate')">
            <div class="rate-preview-box">
              <span
                class="defect-rate-pill preview"
                :class="getDefectRateLevel(form.defectRate).severity"
              >
                {{ form.defectRate }}
              </span>
              <span class="rate-hint">{{ getDefectRateLevel(form.defectRate).label }}</span>
            </div>
          </a-form-item>
        </div>

        <!-- Nhóm 3: Nhân sự & Trạng thái -->
        <div class="form-grid">
          <a-form-item :label="t('labelResponsiblePerson')" required>
            <a-input
              v-model:value="form.responsiblePerson"
              size="large"
              :placeholder="t('placeholderResponsiblePerson')"
            />
          </a-form-item>

          <a-form-item :label="t('labelAssignee')" required>
            <a-input
              v-model:value="form.assignee"
              size="large"
              :placeholder="t('placeholderAssignee')"
            />
          </a-form-item>
        </div>

        <div class="form-grid">
          <a-form-item :label="t('labelCreator')">
            <a-input
              v-model:value="form.creator"
              size="large"
              :placeholder="t('placeholderCreator')"
            />
          </a-form-item>

          <a-form-item :label="t('labelStatus')">
            <a-select v-model:value="form.status" size="large">
              <a-select-option value="open">{{ t('statusOpen') }}</a-select-option>
              <a-select-option value="investigating">{{ t('statusInvestigating') }}</a-select-option>
              <a-select-option value="resolved">{{ t('statusResolved') }}</a-select-option>
              <a-select-option value="closed">{{ t('statusClosed') }}</a-select-option>
            </a-select>
          </a-form-item>
        </div>

        <!-- Nhóm 4: Mô tả lỗi & Ghi chú tiến độ -->
        <a-form-item :label="t('labelDefectDescription')" required>
          <a-textarea
            v-model:value="form.defectDescription"
            :rows="3"
            :placeholder="t('placeholderDefectDescription')"
          />
        </a-form-item>

        <a-form-item :label="t('labelProgressNote')">
          <a-textarea
            v-model:value="form.progressNote"
            :rows="2"
            :placeholder="t('placeholderProgressNote')"
          />
        </a-form-item>

        <!-- Nhóm 5: Ảnh lỗi hiện trường -->
        <a-form-item :label="t('labelDefectImage')">
          <div class="image-upload-wrapper">
            <input
              type="file"
              ref="fileInputRef"
              accept="image/*"
              style="display: none;"
              @change="onFileChange"
            />

            <!-- Preview if image exists or selected -->
            <div v-if="imagePreviewUrl || form.imageUrl" class="image-preview-card">
              <img :src="imagePreviewUrl || form.imageUrl" alt="Preview" class="upload-thumbnail" />
              <div class="image-preview-meta">
                <span class="preview-filename">{{ selectedImageFile ? selectedImageFile.name : (form.productModel ? `Ảnh lỗi ${form.productModel}` : 'Ảnh lỗi hiện trường') }}</span>
                <span v-if="selectedImageFile" class="preview-filesize">{{ (selectedImageFile.size / 1024).toFixed(1) }} KB</span>
              </div>
              <button
                type="button"
                class="remove-image-btn"
                :title="t('removeImage')"
                @click="removeAttachedImage"
              >
                <CloseCircleOutlined /> {{ t('removeImage') }}
              </button>
            </div>

            <!-- Upload drop area if no image -->
            <div
              v-else
              class="upload-dropzone"
              @click="triggerFileInput"
              @dragover.prevent
              @drop.prevent="onFileDrop"
            >
              <UploadOutlined class="upload-icon" />
              <div class="upload-text">{{ t('uploadImagePlaceholder') }}</div>
              <div class="upload-hint">{{ t('imageFormatNotice') }}</div>
            </div>
          </div>
        </a-form-item>
      </a-form>

      <template #footer>
        <div class="drawer-footer-actions">
          <a-button class="drawer-cancel-btn" size="large" @click="isModalOpen = false">
            {{ t('btnCancel') }}
          </a-button>
          <a-button
            type="primary"
            size="large"
            class="drawer-save-btn"
            style="color:white"
            :loading="isSaving"
            :disabled="!form.productModel || !form.machine || !form.defectDescription"
            @click="saveReport"
          >
            {{ isSaving ? 'Đang lưu...' : t('btnSave') }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

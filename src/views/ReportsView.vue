<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useReports, getDefectRateLevel, commonProcesses, formatFileSize } from '../composables/useReports'
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
  ThunderboltOutlined,
  BranchesOutlined,
  DashboardOutlined,
  LoadingOutlined,
  DownloadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useAuth } from '../composables/useAuth'
import ImageMarkerModal from '../components/ImageMarkerModal.vue'
import ExcelImportModal from '../components/ExcelImportModal.vue'
import { exportReportsToExcel } from '../utils/excelService'

const { isAdmin, canCreate, canEdit, canDelete } = useAuth()

const {
  searchText,
  statusFilter,
  severityFilter,
  processFilter,
  dateRange,
  activeStat,
  currentPage,
  pageSize,
  isModalOpen,
  isEditing,
  editingId,
  isSaving,
  showDeleteModal,
  reportToDelete,
  isDeleting,
  cancelDelete,
  executeDelete,
  isDetailOpen,
  selectedReport,
  form,
  existingImages,
  selectedFiles,
  totalImagesCount,
  compressionSummary,
  handleImagesSelected,
  removeExistingImage,
  removeSelectedFile,
  updateAnnotatedImage,
  clearAllImages,
  getReportImages,
  selectedImageFile,
  imagePreviewUrl,
  handleImageSelected,
  removeAttachedImage,
  onQuantityOrDefectChange,
  filteredReports,
  pagedReports,
  stats,
  processStats,
  toggleProcessFilter,
  t,
  severityLabels,
  statusLabels,
  severityClass,
  statusClass,
  filterByStat,
  reports,
  batchImportReports,
  isFirestoreLoading,
  isImportingReports,
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

// ─── Loading state tổng hợp cho bảng báo cáo ───
const isTableLoading = computed(() => isFirestoreLoading.value || isImportingReports.value)

// ─── Quản lý Import & Export Excel ───
const isImportModalOpen = ref(false)

function handleExportExcel() {
  try {
    const listToExport = filteredReports.value && filteredReports.value.length > 0
      ? filteredReports.value
      : reports.value
    if (!listToExport || listToExport.length === 0) {
      message.warning('Không có dữ liệu báo cáo nào để xuất')
      return
    }
    const res = exportReportsToExcel(listToExport)
    message.success(`Đã xuất thành công ${res.count} báo cáo ra file Excel!`)
  } catch (err) {
    console.error('Lỗi khi xuất Excel:', err)
    message.error('Lỗi khi xuất file Excel: ' + (err.message || ''))
  }
}

async function handleBatchImported(payload) {
  try {
    const records = Array.isArray(payload) ? payload : (payload.records || [])
    const mode = (payload && payload.mode) ? payload.mode : 'overwrite'
    const onProgress = (payload && payload.onProgress) ? payload.onProgress : null
    await batchImportReports(records, mode, onProgress)
  } catch (err) {
    console.error('Lỗi khi import:', err)
  }
}

const fileInputRef = ref(null)

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function onFileChange(e) {
  const files = e.target.files
  if (files && files.length > 0) {
    handleImagesSelected(files)
  }
  if (e.target) e.target.value = ''
}

function onFileDrop(e) {
  const files = e.dataTransfer.files
  if (files && files.length > 0) {
    handleImagesSelected(files)
  }
}

// ─── Image Marker Modal State & Handlers ───
const isMarkerModalOpen = ref(false)
const markerTarget = ref(null)

function openImageMarker(type, index, url, name) {
  markerTarget.value = {
    type,
    index,
    url,
    name: name || `image_${index + 1}.jpg`,
  }
  isMarkerModalOpen.value = true
}

function handleMarkerApply(result) {
  if (markerTarget.value) {
    updateAnnotatedImage(markerTarget.value, result)
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

    <!-- 4 Thẻ Card Công Đoạn Sản Xuất: SMT, AI, DIP, AVR (Nhấp để lọc nhanh theo công đoạn) -->
    <div class="stats-grid">
      <!-- Card SMT -->
      <div
        class="stat-card stat-smt animate-in stagger-1"
        :class="{ 'active-stat': processFilter === 'SMT' }"
        title="Lọc báo cáo công đoạn SMT (Nhấp lần nữa để bỏ lọc)"
        @click="toggleProcessFilter('SMT')"
      >
        <div class="stat-top">
          <span>Công đoạn SMT</span>
          <div class="stat-icon cyan"><ToolOutlined /></div>
        </div>
        <strong>{{ processStats.smt }}</strong>
        <div class="stat-foot">
          <span class="trend-neutral">{{ processStats.smtPercent }}%</span> tổng báo cáo phát sinh
        </div>
      </div>

      <!-- Card AI -->
      <div
        class="stat-card stat-ai animate-in stagger-2"
        :class="{ 'active-stat': processFilter === 'AI' }"
        title="Lọc báo cáo công đoạn AI (Nhấp lần nữa để bỏ lọc)"
        @click="toggleProcessFilter('AI')"
      >
        <div class="stat-top">
          <span>Công đoạn AI</span>
          <div class="stat-icon purple"><ThunderboltOutlined /></div>
        </div>
        <strong>{{ processStats.ai }}</strong>
        <div class="stat-foot">
          <span class="trend-warn">{{ processStats.aiPercent }}%</span> tổng báo cáo phát sinh
        </div>
      </div>

      <!-- Card DIP -->
      <div
        class="stat-card stat-dip animate-in stagger-3"
        :class="{ 'active-stat': processFilter === 'DIP' }"
        title="Lọc báo cáo công đoạn DIP (Nhấp lần nữa để bỏ lọc)"
        @click="toggleProcessFilter('DIP')"
      >
        <div class="stat-top">
          <span>Công đoạn DIP</span>
          <div class="stat-icon amber"><BranchesOutlined /></div>
        </div>
        <strong>{{ processStats.dip }}</strong>
        <div class="stat-foot">
          <span class="trend-warn">{{ processStats.dipPercent }}%</span> tổng báo cáo phát sinh
        </div>
      </div>

      <!-- Card AVR -->
      <div
        class="stat-card stat-avr animate-in stagger-4"
        :class="{ 'active-stat': processFilter === 'AVR' }"
        title="Lọc báo cáo công đoạn AVR (Nhấp lần nữa để bỏ lọc)"
        @click="toggleProcessFilter('AVR')"
      >
        <div class="stat-top">
          <span>Công đoạn AVR</span>
          <div class="stat-icon emerald"><DashboardOutlined /></div>
        </div>
        <strong>{{ processStats.avr }}</strong>
        <div class="stat-foot">
          <span class="trend-up">{{ processStats.avrPercent }}%</span> tổng báo cáo phát sinh
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

          <!-- Date Range Filter (Bộ lọc theo khoảng ngày) -->
          <a-range-picker
            v-model:value="dateRange"
            value-format="YYYY-MM-DD"
            format="DD/MM/YYYY"
            class="filter-date-picker"
            size="large"
            :placeholder="t('dateRangePlaceholder')"
            allow-clear
            @change="currentPage = 1"
          >
            <template #suffixIcon><CalendarOutlined /></template>
          </a-range-picker>

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
          :class="{ active: activeStat === 'all' && statusFilter === 'all' && severityFilter === 'all' && processFilter === 'all' && !dateRange }"
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
        <div class="table-header-right">
          <!-- Nút Xuất Excel: Cho tất cả người dùng -->
          <a-button class="table-action-btn export-btn" @click="handleExportExcel">
            <DownloadOutlined /> Xuất Excel
          </a-button>

          <!-- Nút Nhập Excel: CHỈ ADMIN MỚI CÓ QUYỀN TRUY CẬP -->
          <a-button
            v-if="isAdmin"
            class="table-action-btn import-btn"
            @click="isImportModalOpen = true"
          >
            <UploadOutlined /> Nhập Excel
          </a-button>

          <a-button v-if="canCreate" type="primary" class="table-create-btn" @click="openCreate">
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
        :loading="isTableLoading"
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
        <a-table-column :title="t('colMachine')" key="machine" :width="170">
          <template #default="{ record }">
            <span v-if="record.machine && record.machine.trim()" class="machine-text" :title="record.machine">
              <ToolOutlined class="machine-icon" />
              <span class="machine-name">{{ record.machine }}</span>
            </span>
            <span v-else class="text-muted" style="display: block; opacity: 0.35;">—</span>
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
        <a-table-column :title="t('colDefectImage')" key="imageUrl" :width="110" align="center">
          <template #default="{ record }">
            <div class="table-img-cell">
              <div v-if="getReportImages(record).length > 0" class="table-image-thumb-box" :title="t('viewFullImage')">
                <a-image-preview-group>
                  <a-image
                    :src="getReportImages(record)[0].url"
                    :alt="record.productModel"
                    class="table-image-thumb"
                  />
                  <!-- Hidden extra images for lightbox paging -->
                  <div style="display: none;">
                    <a-image
                      v-for="(img, idx) in getReportImages(record).slice(1)"
                      :key="idx"
                      :src="img.url"
                    />
                  </div>
                </a-image-preview-group>
                <span v-if="getReportImages(record).length > 1" class="multi-img-count-badge">
                  +{{ getReportImages(record).length - 1 }}
                </span>
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
        <div class="mobile-header-right">
          <a-button size="small" class="table-action-btn export-btn" @click="handleExportExcel">
            <DownloadOutlined /> Xuất
          </a-button>
          <a-button
            v-if="isAdmin"
            size="small"
            class="table-action-btn import-btn"
            @click="isImportModalOpen = true"
          >
            <UploadOutlined /> Nhập
          </a-button>
          <a-button v-if="canCreate" type="primary" size="small" class="table-create-btn" @click="openCreate">
            <PlusOutlined /> {{ t('createNew') }}
          </a-button>
        </div>
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
          <div v-if="getReportImages(record).length > 0" class="mobile-card-photo-banner">
            <a-image-preview-group>
              <a-image
                :src="getReportImages(record)[0].url"
                :alt="record.productModel"
                class="mobile-card-banner-img"
              />
              <div style="display: none;">
                <a-image
                  v-for="(img, idx) in getReportImages(record).slice(1)"
                  :key="idx"
                  :src="img.url"
                />
              </div>
            </a-image-preview-group>
            <div class="mobile-photo-tag">
              <PictureOutlined />
              <span>{{ getReportImages(record).length > 1 ? `${getReportImages(record).length} ảnh lỗi` : t('colDefectImage') }}</span>
            </div>
            <div class="mobile-photo-zoom-badge">
              <span>🔍 Phóng to & xem toàn bộ ảnh</span>
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
      width="860px"
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

        <!-- Defect Image display (Hỗ trợ hiển thị nhiều ảnh Gallery) -->
        <div v-if="getReportImages(selectedReport).length > 0" class="detail-image-box">
          <div class="detail-section-title">
            <span>📷 {{ t('labelDefectImage') }} ({{ getReportImages(selectedReport).length }} ảnh)</span>
            <span class="detail-gallery-hint">Nhấp vào ảnh để xem kích thước lớn & chuyển ảnh</span>
          </div>

          <a-image-preview-group>
            <!-- Nếu có 1 ảnh duy nhất: hiển thị lớn nổi bật & căn giữa chuẩn -->
            <div v-if="getReportImages(selectedReport).length === 1" class="detail-single-image-wrap">
              <a-image
                :src="getReportImages(selectedReport)[0].url"
                :alt="selectedReport.productModel"
                class="detail-report-img"
              />
              <div class="image-zoom-indicator">
                <EyeOutlined /> Nhấp để xem kích thước gốc
              </div>
            </div>

            <!-- Nếu có nhiều ảnh: hiển thị lưới Gallery ảnh hiện đại -->
            <div v-else class="detail-images-gallery-grid">
              <div
                v-for="(img, idx) in getReportImages(selectedReport)"
                :key="idx"
                class="detail-gallery-item"
              >
                <a-image
                  :src="img.url"
                  :alt="img.name || `${selectedReport.productModel} - ${idx + 1}`"
                  class="detail-gallery-thumb"
                />
                <div class="detail-gallery-badge">
                  <span>#{{ idx + 1 }}</span>
                </div>
              </div>
            </div>
          </a-image-preview-group>
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

          <div class="detail-actions-right" style="margin-left: auto; display: flex; gap: 8px;">
            <a-button v-if="canEdit" type="primary" @click="openEdit(selectedReport)">
              <EditOutlined /> {{ t('editInfo') }}
            </a-button>
            <a-button v-if="canDelete" danger @click="removeReport(selectedReport)">
              <DeleteOutlined /> {{ t('actionDelete') }}
            </a-button>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- Modal Xác Nhận Xoá Báo Cáo Thay Thế Alert Trình Duyệt -->
    <a-modal
      v-model:open="showDeleteModal"
      :title="null"
      :footer="null"
      :width="460"
      class="delete-confirm-modal"
      centered
      :destroy-on-close="true"
    >
      <div v-if="reportToDelete" class="delete-modal-content">
        <div class="delete-modal-header">
          <div class="delete-icon-wrapper">
            <ExclamationCircleFilled class="delete-warning-icon" />
          </div>
          <div class="delete-header-text">
            <h3 class="delete-modal-title">{{ t('modalDeleteTitle') }}</h3>
            <p class="delete-modal-desc">{{ t('modalDeleteWarning') }}</p>
          </div>
        </div>

        <!-- Thẻ preview chi tiết báo cáo cần xoá -->
        <div class="delete-target-card">
          <div class="delete-target-top">
            <span class="delete-target-id">{{ reportToDelete.id }}</span>
            <span class="delete-target-badge">{{ reportToDelete.process }}</span>
            <span class="delete-target-machine">⚙️ {{ reportToDelete.machine }}</span>
          </div>

          <div class="delete-target-model">
            {{ reportToDelete.productModel }}
          </div>

          <div class="delete-target-defect">
            <span class="defect-label">Mô tả:</span>
            {{ reportToDelete.defectDescription }}
          </div>

          <div class="delete-target-meta">
            <span>📅 {{ reportToDelete.date }}</span>
            <span>👤 {{ reportToDelete.responsiblePerson || reportToDelete.creator }}</span>
            <span v-if="reportToDelete.imageUrl" class="has-img-badge">📷 Có ảnh đính kèm</span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="delete-modal-actions">
          <a-button class="delete-btn-cancel" size="large" @click="cancelDelete">
            {{ t('btnCancel') }}
          </a-button>
          <a-button
            type="primary"
            danger
            size="large"
            class="delete-btn-confirm"
            :loading="isDeleting"
            @click="executeDelete"
          >
            <DeleteOutlined /> {{ isDeleting ? 'Đang xoá...' : t('btnConfirmDelete') }}
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
      :body-style="{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }"
      :header-style="{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }"
      :footer-style="{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }"
    >


      <a-form layout="vertical" class="report-form">
        <!-- Nhóm 1: Ngày, Công đoạn, Model & Máy -->
        <div class="form-grid">
          <a-form-item :label="t('labelDate')">
            <a-input
              v-model:value="form.date"
              type="date"
              size="large"
            />
          </a-form-item>

          <a-form-item :label="t('labelProcess')">
            <a-select v-model:value="form.process" size="large">
              <a-select-option v-for="proc in commonProcesses" :key="proc" :value="proc">
                {{ proc }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </div>

        <div class="form-grid">
          <a-form-item :label="t('labelProductModel')">
            <a-input
              v-model:value="form.productModel"
              size="large"
              :placeholder="t('placeholderProductModel')"
            />
          </a-form-item>

          <a-form-item :label="t('labelMachine')">
            <a-input
              v-model:value="form.machine"
              size="large"
              :placeholder="t('placeholderMachine')"
            />
          </a-form-item>
        </div>

        <!-- Nhóm 2: Số lượng, Số lượng lỗi & Tỷ lệ lỗi tự tính -->
        <div class="form-grid-3">
          <a-form-item :label="t('labelQuantity')">
            <a-input-number
              v-model:value="form.quantity"
              :min="1"
              size="large"
              style="width: 100%;"
              :placeholder="t('placeholderQuantity')"
              @change="onQuantityOrDefectChange"
            />
          </a-form-item>

          <a-form-item :label="t('labelDefectQuantity')">
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
          <a-form-item :label="t('labelResponsiblePerson')">
            <a-input
              v-model:value="form.responsiblePerson"
              size="large"
              :placeholder="t('placeholderResponsiblePerson')"
            />
          </a-form-item>

          <a-form-item :label="t('labelAssignee')">
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
        <a-form-item :label="t('labelDefectDescription')">
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

        <!-- Nhóm 5: Upload nhiều ảnh lỗi hiện trường -->
        <a-form-item>
          <template #label>
            <div class="drawer-image-label-row">
              <span>{{ t('labelDefectImage') }}</span>
              <span v-if="totalImagesCount > 0" class="drawer-img-count-tag">
                {{ totalImagesCount }} ảnh đã chọn
              </span>
            </div>
          </template>

          <div class="image-upload-wrapper">
            <input
              type="file"
              ref="fileInputRef"
              multiple
              accept="image/*"
              style="display: none;"
              @change="onFileChange"
            />

            <!-- Thanh thông báo tính năng Nén ảnh tự động -->
            <div class="drawer-compression-banner">
              <div class="compression-banner-info">
                <ThunderboltOutlined class="compression-banner-icon" />
                <span class="compression-banner-title">Tự động nén ảnh:</span>
                <span class="compression-banner-desc">Chuẩn hóa 1280px, tối ưu ~90% dung lượng giúp tải nhanh và lưu tối đa ảnh</span>
              </div>
              <div v-if="compressionSummary && compressionSummary.count > 0" class="compression-banner-stats">
                <span v-if="compressionSummary.isCompressingAny" class="compression-pill compressing">
                  <LoadingOutlined spin /> Đang nén...
                </span>
                <span v-else class="compression-pill saved" :title="`Gốc: ${compressionSummary.formattedOrig} ➔ Nén: ${compressionSummary.formattedComp}`">
                  Đã giảm {{ compressionSummary.formattedSaved }} (-{{ compressionSummary.ratio }}%)
                </span>
              </div>
            </div>

            <!-- Danh sách ảnh đã chọn / đã có trong báo cáo -->
            <div v-if="totalImagesCount > 0" class="drawer-multi-images-container">
              <div class="drawer-images-grid">
                <!-- Ảnh đã lưu trước đó (existingImages) -->
                <div
                  v-for="(img, idx) in existingImages"
                  :key="'exist_' + idx"
                  class="drawer-img-card"
                >
                  <img :src="img.url" alt="Existing" class="drawer-img-thumb" />
                  <div class="drawer-img-overlay">
                    <span class="img-badge-existing">Đã lưu</span>
                    <div class="drawer-img-actions">
                      <button
                        type="button"
                        class="drawer-img-action-btn edit"
                        title="Đánh dấu lỗi trên ảnh (vẽ, khoanh vùng, mũi tên, ghi chú)"
                        @click.stop="openImageMarker('existing', idx, img.url, img.name)"
                      >
                        <EditOutlined />
                      </button>
                      <button
                        type="button"
                        class="drawer-img-action-btn remove"
                        title="Xoá ảnh này"
                        @click.stop="removeExistingImage(idx)"
                      >
                        <CloseCircleOutlined />
                      </button>
                    </div>
                  </div>
                  <div class="drawer-img-caption" :title="img.name || `Ảnh ${idx + 1}`">
                    {{ img.name || `Ảnh ${idx + 1}` }}
                  </div>
                </div>

                <!-- Ảnh mới chọn chờ lưu (selectedFiles) -->
                <div
                  v-for="(item, idx) in selectedFiles"
                  :key="item.id"
                  class="drawer-img-card new-file"
                >
                  <img :src="item.previewUrl" alt="New" class="drawer-img-thumb" />
                  <div class="drawer-img-overlay">
                    <span v-if="item.isCompressing" class="img-badge-compressing">
                      <LoadingOutlined spin /> Nén...
                    </span>
                    <span v-else-if="item.savings > 0" class="img-badge-saved" :title="`Gốc: ${formatFileSize(item.originalSize)} ➔ Nén: ${formatFileSize(item.compressedSize)}`">
                      ⚡ -{{ item.savings }}%
                    </span>
                    <span v-else class="img-badge-new">Mới</span>

                    <div class="drawer-img-actions">
                      <button
                        v-if="!item.isCompressing"
                        type="button"
                        class="drawer-img-action-btn edit"
                        title="Đánh dấu lỗi trên ảnh (vẽ, khoanh vùng, mũi tên, ghi chú)"
                        @click.stop="openImageMarker('selected', idx, item.previewUrl, item.name)"
                      >
                        <EditOutlined />
                      </button>
                      <button
                        type="button"
                        class="drawer-img-action-btn remove"
                        title="Xoá ảnh này"
                        @click.stop="removeSelectedFile(idx)"
                      >
                        <CloseCircleOutlined />
                      </button>
                    </div>
                  </div>
                  <div class="drawer-img-caption" :title="`${item.name} (${formatFileSize(item.compressedSize)})`">
                    <span v-if="!item.isCompressing" class="caption-size-tag">{{ formatFileSize(item.compressedSize) }}</span>
                    {{ item.name }}
                  </div>
                </div>

                <!-- Nút bấm thêm ảnh nhanh trong lưới -->
                <div class="drawer-add-more-card" @click="triggerFileInput">
                  <PlusOutlined class="add-more-icon" />
                  <span>Thêm ảnh</span>
                </div>
              </div>

              <!-- Thanh công cụ nhỏ bên dưới danh sách ảnh -->
              <div class="drawer-images-footer">
                <button
                  type="button"
                  class="drawer-clear-all-btn"
                  @click="clearAllImages"
                >
                  <DeleteOutlined /> Xoá tất cả ảnh
                </button>
                <button
                  type="button"
                  class="drawer-add-files-btn"
                  @click="triggerFileInput"
                >
                  <UploadOutlined /> Chọn thêm ảnh từ máy
                </button>
              </div>
            </div>

            <!-- Vùng kéo thả khi chưa có ảnh nào -->
            <div
              v-else
              class="upload-dropzone"
              @click="triggerFileInput"
              @dragover.prevent
              @drop.prevent="onFileDrop"
            >
              <UploadOutlined class="upload-icon" />
              <div class="upload-text">Nhấp hoặc kéo thả nhiều ảnh lỗi vào đây</div>
              <div class="upload-hint">Tự động nén thông minh tối ưu dung lượng (JPG, PNG, WEBP)</div>
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
            @click="saveReport"
          >
            {{ isSaving ? 'Đang lưu...' : t('btnSave') }}
          </a-button>
        </div>
      </template>
    </a-drawer>

    <!-- Modal Trình chỉnh sửa & Đánh dấu lỗi trên ảnh -->
    <ImageMarkerModal
      v-model:visible="isMarkerModalOpen"
      :image-url="markerTarget?.url"
      :image-name="markerTarget?.name"
      @apply="handleMarkerApply"
    />

    <!-- Modal Nhập dữ liệu Báo cáo Excel cho Admin -->
    <ExcelImportModal
      v-model:visible="isImportModalOpen"
      :existing-reports="reports"
      :import-handler="batchImportReports"
      @imported="handleBatchImported"
    />
  </div>
</template>

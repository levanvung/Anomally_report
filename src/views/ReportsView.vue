<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  useReports,
  getDefectRateLevel,
  getPrimaryReportImage,
  getReportImageCount,
  commonProcesses,
  formatDisplayDate,
  showLoading,
  hideLoading,
  showToast,
} from '../composables/useReports'
import { useAuth } from '../composables/useAuth'
import { exportReportsToExcel, parseExcelReportFile } from '../utils/excelService'
import { DEFECT_PRESETS, translateViToTrilingual } from '../utils/aiHelper'

const { isAdmin, canCreate, canEdit, canDelete } = useAuth()
const {
  isFirestoreLoading,
  isBackgroundSyncing,
  backgroundLoadedCount,
  loadReportsIncrementally,
  isPageSwitching,
  isDetailImagesLoading,
  detailHdImages,
  dateSortOrder,
  toggleDateSort,
  searchText,
  statusFilter,
  processFilter,
  dateRange,
  activeStat,
  currentPage,
  pageSize,
  isModalOpen,
  isEditing,
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
  handleImagesSelected,
  removeExistingImage,
  removeSelectedFile,
  clearAllImages,
  getReportImages,
  onQuantityOrDefectChange,
  filteredReports,
  pagedReports,
  stats,
  processStats,
  toggleProcessFilter,
  filterByStat,
  reports,
  resetFilters,
  openCreate,
  openEdit,
  openDetail,
  closeDetail,
  saveReport,
  removeReport,
  batchImportReports,
  changePage,
  statusLabels,
  statusClass,
} = useReports()

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isMobile = computed(() => windowWidth.value < 768)
const showMobileFilters = ref(false)
const fileInputRef = ref(null)
const excelInputRef = ref(null)
const isTranslatingDesc = ref(false)
const lightboxUrl = ref('')
const dateFrom = ref('')
const dateTo = ref('')

function onDateChange() {
  dateRange.value =
    dateFrom.value || dateTo.value
      ? [dateFrom.value || dateTo.value, dateTo.value || dateFrom.value]
      : null
  currentPage.value = 1
}

function handleResetAll() {
  dateFrom.value = ''
  dateTo.value = ''
  resetFilters()
}

function onResize() {
  windowWidth.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize, { passive: true }))
onUnmounted(() => window.removeEventListener('resize', onResize))

const totalPages = computed(() => Math.max(1, Math.ceil(filteredReports.value.length / pageSize)))

async function handleExportExcel() {
  const list = filteredReports.value.length ? filteredReports.value : reports.value
  if (!list.length) return alert('Không có dữ liệu để xuất!')

  showLoading(
    '📊 Đang xuất file Excel (.xlsx)...',
    `Đang đóng gói ${list.length} bản ghi báo cáo IPQC...`,
    65
  )
  await new Promise((r) => setTimeout(r, 250))
  try {
    const res = exportReportsToExcel(list)
    showToast(`✅ Đã xuất ${res.count} dòng ra file ${res.filename}!`)
  } finally {
    hideLoading()
  }
}

async function onExcelFileSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  showLoading(
    `📂 Đang đọc file "${file.name}"...`,
    'Đang phân tích các Sheet và trích xuất ảnh lỗi...',
    10
  )
  await new Promise((r) => setTimeout(r, 60))

  try {
    const records = await parseExcelReportFile(file, (msg, pct) => {
      showLoading(msg, 'Vui lòng đợi trong giây lát...', pct)
    })
    if (!records.length) {
      hideLoading()
      return alert('Không tìm thấy dòng dữ liệu hợp lệ trong file Excel!')
    }
    await batchImportReports(records)
  } catch (err) {
    alert('Lỗi đọc file Excel: ' + err.message)
  } finally {
    hideLoading()
  }
}

function applyPresetDefect(e) {
  const idx = e.target.value
  if (idx !== '' && DEFECT_PRESETS[idx]) form.defectDescription = DEFECT_PRESETS[idx].text
  e.target.value = ''
}

async function handleTranslateDefectDesc() {
  if (!form.defectDescription?.trim())
    return alert('Vui lòng gõ mô tả lỗi bằng tiếng Việt trước!')
  isTranslatingDesc.value = true
  try {
    form.defectDescription = await translateViToTrilingual(form.defectDescription, {
      process: form.process,
      model: form.productModel,
    })
    showToast('🌐 Đã dịch sang 3 ngôn ngữ (Anh - Trung - Việt)!')
  } catch (err) {
    alert(err.message)
  } finally {
    isTranslatingDesc.value = false
  }
}
</script>

<template>
  <div class="lite-container">
    <!-- 1. BỐN THẺ CÔNG ĐOẠN (SMT, AI, DIP, AVR) - Lưới 2x2 tối ưu trên Điện thoại -->
    <div v-memo="[processStats, processFilter]" class="lite-stats-grid">
      <div
        class="lite-stat-card"
        :class="{ active: processFilter === 'SMT' }"
        @click="toggleProcessFilter('SMT')"
      >
        <div class="lite-stat-head">
          <span>⚙️ SMT</span>
          <span class="lite-stat-pct">{{ processStats.smtPercent }}%</span>
        </div>
        <div class="lite-stat-num">{{ processStats.smt }} <small>báo cáo</small></div>
        <div class="lite-stat-meta">
          <span>SL: <b>{{ Number(processStats.smtDetails?.totalQty || 0).toLocaleString() }}</b></span>
          <span class="err-num">Lỗi: <b>{{ Number(processStats.smtDetails?.totalDefect || 0).toLocaleString() }}</b></span>
        </div>
      </div>

      <div
        class="lite-stat-card"
        :class="{ active: processFilter === 'AI' }"
        @click="toggleProcessFilter('AI')"
      >
        <div class="lite-stat-head">
          <span>⚡ AI</span>
          <span class="lite-stat-pct">{{ processStats.aiPercent }}%</span>
        </div>
        <div class="lite-stat-num">{{ processStats.ai }} <small>báo cáo</small></div>
        <div class="lite-stat-meta">
          <span>SL: <b>{{ Number(processStats.aiDetails?.totalQty || 0).toLocaleString() }}</b></span>
          <span class="err-num">Lỗi: <b>{{ Number(processStats.aiDetails?.totalDefect || 0).toLocaleString() }}</b></span>
        </div>
      </div>

      <div
        class="lite-stat-card"
        :class="{ active: processFilter === 'DIP' }"
        @click="toggleProcessFilter('DIP')"
      >
        <div class="lite-stat-head">
          <span>🔌 DIP</span>
          <span class="lite-stat-pct">{{ processStats.dipPercent }}%</span>
        </div>
        <div class="lite-stat-num">{{ processStats.dip }} <small>báo cáo</small></div>
        <div class="lite-stat-meta">
          <span>SL: <b>{{ Number(processStats.dipDetails?.totalQty || 0).toLocaleString() }}</b></span>
          <span class="err-num">Lỗi: <b>{{ Number(processStats.dipDetails?.totalDefect || 0).toLocaleString() }}</b></span>
        </div>
      </div>

      <div
        class="lite-stat-card"
        :class="{ active: processFilter === 'AVR' }"
        @click="toggleProcessFilter('AVR')"
      >
        <div class="lite-stat-head">
          <span>🔊 AVR / MP</span>
          <span class="lite-stat-pct">{{ processStats.avrPercent }}%</span>
        </div>
        <div class="lite-stat-num">{{ processStats.avr }} <small>báo cáo</small></div>
        <div class="lite-stat-meta">
          <span>SL: <b>{{ Number(processStats.avrDetails?.totalQty || 0).toLocaleString() }}</b></span>
          <span class="err-num">Lỗi: <b>{{ Number(processStats.avrDetails?.totalDefect || 0).toLocaleString() }}</b></span>
        </div>
      </div>
    </div>

    <!-- 2. THANH TÌM KIẾM & LỌC GỌN GÀNG -->
    <div class="lite-filter-bar">
      <div class="lite-filter-row">
        <div class="lite-search-wrap">
          <input
            v-model="searchText"
            type="text"
            class="lite-input"
            placeholder="🔍 Tìm Model, Công đoạn, Mô tả lỗi..."
          />
          <button
            v-if="isMobile"
            type="button"
            class="lite-btn"
            :class="{ 'lite-btn-primary': showMobileFilters || statusFilter !== 'all' || dateRange }"
            @click="showMobileFilters = !showMobileFilters"
          >
            🌪️ Lọc
          </button>
          <button
            v-if="isMobile"
            type="button"
            class="lite-btn"
            title="Đảo thứ tự Ngày"
            @click="toggleDateSort"
          >
            📅 {{ dateSortOrder === 'desc' ? '↓' : '↑' }}
          </button>
        </div>

        <div v-if="!isMobile || showMobileFilters" class="lite-filter-expand">
          <select v-model="processFilter" class="lite-select" @change="currentPage = 1">
            <option value="all">Tất cả công đoạn</option>
            <option v-for="p in commonProcesses" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="statusFilter" class="lite-select" @change="currentPage = 1">
            <option value="all">Tất cả trạng thái</option>
            <option value="open">Chưa xử lý</option>
            <option value="investigating">Đang điều tra</option>
            <option value="resolved">Đã hoàn thành</option>
          </select>
          <input v-model="dateFrom" type="date" class="lite-input" title="Từ ngày" @change="onDateChange" />
          <input v-model="dateTo" type="date" class="lite-input" title="Đến ngày" @change="onDateChange" />
          <button v-if="!isMobile" type="button" class="lite-btn" @click="toggleDateSort">
            📅 Ngày: {{ dateSortOrder === 'desc' ? 'Mới → Cũ ↓' : 'Cũ → Mới ↑' }}
          </button>
          <button type="button" class="lite-btn" @click="handleResetAll">🔄 Xoá lọc</button>
        </div>
      </div>

      <div class="lite-chips">
        <button
          class="lite-chip"
          :class="{ active: activeStat === 'all' && processFilter === 'all' }"
          @click="handleResetAll"
        >
          Tất cả ({{ stats.total }})
        </button>
        <button
          class="lite-chip"
          :class="{ active: activeStat === 'attention' }"
          @click="filterByStat('attention')"
        >
          🔥 Cần xử lý ({{ stats.open + stats.investigating }})
        </button>
        <button
          class="lite-chip"
          :class="{ active: activeStat === 'resolved' }"
          @click="filterByStat('resolved')"
        >
          ✅ Đã hoàn thành ({{ stats.resolved }})
        </button>
      </div>
    </div>

    <!-- 3. KHUNG DANH SÁCH BÁO CÁO + CHỈ BÁO TẢI NGẦM -->
    <div class="lite-table-card">
      <div v-if="isFirestoreLoading || isPageSwitching" class="lite-table-loading-mask">
        <div class="lite-spinner-sm"></div>
        <span>{{ isFirestoreLoading ? 'Đang tải 15 báo cáo đầu tiên...' : 'Đang chuyển trang...' }}</span>
      </div>

      <div class="lite-table-toolbar">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <strong>📋 Báo cáo ({{ filteredReports.length }})</strong>
          <!-- Huy hiệu báo hiệu đang tải ngầm ở dưới nền -->
          <span v-if="isBackgroundSyncing" class="lite-bg-sync-pill">
            ⏳ Đang tải ngầm ({{ backgroundLoadedCount }}...)
          </span>
          <button
            v-else
            type="button"
            class="lite-btn"
            style="padding: 3px 8px; font-size: 11px;"
            title="Làm mới dữ liệu từ Database"
            @click="loadReportsIncrementally"
          >
            🔄 Tải lại
          </button>
        </div>

        <div class="lite-toolbar-btns">
          <input ref="excelInputRef" type="file" accept=".xlsx,.xls" hidden @change="onExcelFileSelected" />
          <button v-if="isAdmin" type="button" class="lite-btn" @click="excelInputRef?.click()">
            📂 Nhập Excel
          </button>
          <button type="button" class="lite-btn" @click="handleExportExcel">
            ⬇️ Xuất Excel
          </button>
          <button v-if="canCreate" type="button" class="lite-btn lite-btn-primary" @click="openCreate">
            ➕ Tạo mới
          </button>
        </div>
      </div>

      <!-- 4A. BẢNG MÁY TÍNH -->
      <div v-if="!isMobile" class="lite-table-scroll">
        <table class="lite-table">
          <thead>
            <tr>
              <th>#</th>
              <th
                style="cursor: pointer; color: var(--accent);"
                title="Nhấn để đảo thứ tự sắp xếp Ngày"
                @click="toggleDateSort"
              >
                Ngày {{ dateSortOrder === 'desc' ? '↓' : '↑' }}
              </th>
              <th>Công đoạn</th>
              <th>Model</th>
              <th>Máy</th>
              <th>SL</th>
              <th>Lỗi</th>
              <th>Tỷ lệ</th>
              <th>Ảnh</th>
              <th>Mô tả lỗi</th>
              <th>Chịu TN</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in pagedReports" :key="r.id">
              <td>{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td style="white-space: nowrap; font-weight: 600;">{{ formatDisplayDate(r.date) }}</td>
              <td><span class="lite-pill medium">{{ r.process }}</span></td>
              <td>
                <strong style="color: var(--accent); cursor: pointer;" @click="openDetail(r)">
                  {{ r.productModel }}
                </strong>
              </td>
              <td>{{ r.machine || '—' }}</td>
              <td>{{ Number(r.quantity || 0).toLocaleString() }}</td>
              <td style="color: #f87171; font-weight: 700;">
                {{ Number(r.defectQuantity || 0).toLocaleString() }}
              </td>
              <td>
                <span class="lite-pill" :class="getDefectRateLevel(r.defectRate).severity">
                  {{ r.defectRate }}
                </span>
              </td>
              <td>
                <img
                  v-if="getReportImageCount(r) > 0"
                  :src="getPrimaryReportImage(r)"
                  class="lite-thumb"
                  loading="lazy"
                  @click="openDetail(r)"
                />
                <span v-else>—</span>
              </td>
              <td>
                <div class="lite-desc-pre" @click="openDetail(r)">{{ r.defectDescription }}</div>
              </td>
              <td>{{ r.responsiblePerson }}</td>
              <td>
                <span class="lite-pill" :class="statusClass(r.status)">
                  {{ statusLabels[r.status] || r.status }}
                </span>
              </td>
              <td style="white-space: nowrap;">
                <button class="lite-btn" style="padding: 4px 8px;" @click="openDetail(r)">👁️</button>
                <button
                  v-if="canEdit"
                  class="lite-btn"
                  style="padding: 4px 8px; margin-left: 4px;"
                  @click="openEdit(r)"
                >
                  ✏️
                </button>
                <button
                  v-if="canDelete"
                  class="lite-btn lite-btn-danger"
                  style="padding: 4px 8px; margin-left: 4px;"
                  @click="removeReport(r)"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 4B. THẺ ĐIỆN THOẠI (MOBILE VIEW TỐI ƯU HIỆN ĐẠI, DỄ NHÌN) -->
      <div v-else class="lite-mobile-list">
        <div v-if="pagedReports.length === 0 && !isFirestoreLoading" style="text-align: center; padding: 32px 12px; color: var(--text-sub);">
          Không tìm thấy báo cáo nào phù hợp.
        </div>

        <div v-for="(r, idx) in pagedReports" :key="r.id" class="lite-mcard">
          <!-- Dòng 1: STT + Công đoạn + Tên Model + Tỷ lệ lỗi -->
          <div class="lite-mcard-top">
            <div class="lite-mcard-title-wrap" @click="openDetail(r)">
              <span class="lite-mcard-index">#{{ (currentPage - 1) * pageSize + idx + 1 }}</span>
              <span class="lite-pill medium">{{ r.process }}</span>
              <strong class="lite-mcard-model">{{ r.productModel }}</strong>
            </div>
            <span class="lite-pill" :class="getDefectRateLevel(r.defectRate).severity">
              {{ r.defectRate }}
            </span>
          </div>

          <!-- Dòng 2: Ảnh Thumbnail + Mô tả lỗi 3 ngôn ngữ + Ngày tháng -->
          <div class="lite-mcard-body" @click="openDetail(r)">
            <div v-if="getReportImageCount(r) > 0" class="lite-mcard-img-wrap">
              <img :src="getPrimaryReportImage(r)" class="lite-mcard-img" loading="lazy" />
              <span v-if="getReportImageCount(r) > 1" class="lite-mcard-img-count">
                +{{ getReportImageCount(r) - 1 }}
              </span>
            </div>
            <div class="lite-mcard-info">
              <div class="lite-mcard-desc">{{ r.defectDescription }}</div>
              <div class="lite-mcard-submeta">
                <span>📅 {{ formatDisplayDate(r.date) }}</span>
                <span v-if="r.machine">⚙️ {{ r.machine }}</span>
              </div>
            </div>
          </div>

          <!-- Dòng 3: 3 ô thông số gọn gàng -->
          <div class="lite-mcard-metrics">
            <div class="m-metric">
              <span>SL Kiểm</span>
              <strong>{{ Number(r.quantity || 0).toLocaleString() }}</strong>
            </div>
            <div class="m-metric">
              <span>SL Lỗi</span>
              <strong style="color: #f87171;">{{ Number(r.defectQuantity || 0).toLocaleString() }}</strong>
            </div>
            <div class="m-metric">
              <span>Chịu TN</span>
              <strong class="truncate-text">{{ r.responsiblePerson || '—' }}</strong>
            </div>
          </div>

          <!-- Dòng 4: 3 Nút thao tác cảm ứng to rõ trên điện thoại -->
          <div class="lite-mcard-actions">
            <button type="button" class="lite-m-btn" @click="openDetail(r)">
              👁️ Chi tiết
            </button>
            <button v-if="canEdit" type="button" class="lite-m-btn edit" @click="openEdit(r)">
              ✏️ Sửa
            </button>
            <button v-if="canDelete" type="button" class="lite-m-btn danger" @click="removeReport(r)">
              🗑️ Xoá
            </button>
          </div>
        </div>
      </div>

      <!-- 5. THANH PHÂN TRANG -->
      <div class="lite-pagination-bar">
        <span style="font-size: 12px; color: var(--text-sub);">
          Trang <b>{{ currentPage }}</b> / {{ totalPages }} ({{ filteredReports.length }} dòng)
        </span>
        <div style="display: flex; gap: 6px;">
          <button
            class="lite-btn"
            :disabled="currentPage <= 1 || isPageSwitching"
            @click="changePage(currentPage - 1)"
          >
            ← Trước
          </button>
          <button
            class="lite-btn"
            :disabled="currentPage >= totalPages || isPageSwitching"
            @click="changePage(currentPage + 1)"
          >
            Sau →
          </button>
        </div>
      </div>
    </div>

    <!-- NÚT TRÒN NỔI (+) TẠO BÁO CÁO NHANH TRÊN ĐIỆN THOẠI -->
    <button
      v-if="isMobile && canCreate"
      type="button"
      class="lite-mobile-fab"
      title="Tạo báo cáo mới"
      @click="openCreate"
    >
      ＋
    </button>

    <!-- MODAL CHI TIẾT -->
    <Teleport to="body">
      <div v-if="isDetailOpen && selectedReport" class="lite-modal-backdrop" @click.self="closeDetail">
        <div class="lite-modal-card">
          <div class="lite-modal-header">
            <h3>
              📌 {{ selectedReport.productModel }} · {{ selectedReport.process }} ({{
                formatDisplayDate(selectedReport.date)
              }})
            </h3>
            <button class="lite-close-btn" @click="closeDetail">✕</button>
          </div>
          <div class="lite-modal-body">
            <div class="lite-mcard-metrics" style="margin-bottom: 12px;">
              <div class="m-metric">
                <span>SL Kiểm</span>
                <strong>{{ Number(selectedReport.quantity || 0).toLocaleString() }}</strong>
              </div>
              <div class="m-metric">
                <span>SL Lỗi</span>
                <strong style="color: #f87171;">{{ Number(selectedReport.defectQuantity || 0).toLocaleString() }}</strong>
              </div>
              <div class="m-metric">
                <span>Tỷ lệ lỗi</span>
                <strong>{{ selectedReport.defectRate }}</strong>
              </div>
            </div>

            <div
              style="
                background: var(--bg-elevated);
                padding: 12px;
                border-radius: 8px;
                white-space: pre-line;
                margin-bottom: 12px;
                font-size: 13px;
              "
            >
              {{ selectedReport.defectDescription }}
            </div>

            <div
              v-if="isDetailImagesLoading"
              style="
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12.5px;
                color: var(--accent);
                margin-bottom: 8px;
              "
            >
              <div class="lite-spinner-sm" style="width: 18px; height: 18px; border-width: 2px;"></div>
              <span>Đang tải ảnh gốc HD sắc nét...</span>
            </div>

            <div
              v-if="detailHdImages.length"
              style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;"
            >
              <img
                v-for="(img, i) in detailHdImages"
                :key="i"
                :src="img.url"
                style="
                  width: 100%;
                  height: 140px;
                  object-fit: cover;
                  border-radius: 8px;
                  cursor: zoom-in;
                  border: 1px solid var(--border-strong);
                "
                @click="lightboxUrl = img.url"
              />
            </div>
          </div>
          <div class="lite-modal-footer">
            <button v-if="canEdit" class="lite-btn lite-btn-primary" @click="openEdit(selectedReport)">
              ✏️ Chỉnh sửa
            </button>
            <button v-if="canDelete" class="lite-btn lite-btn-danger" @click="removeReport(selectedReport)">
              🗑️ Xoá
            </button>
            <button class="lite-btn" @click="closeDetail">Đóng</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL TẠO / SỬA -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="lite-modal-backdrop" @click.self="isModalOpen = false">
        <div class="lite-modal-card lite-modal-lg">
          <div class="lite-modal-header">
            <h3>{{ isEditing ? '✏️ Chỉnh sửa Báo cáo' : '➕ Tạo Báo cáo Mới' }}</h3>
            <button class="lite-close-btn" @click="isModalOpen = false">✕</button>
          </div>
          <div class="lite-modal-body">
            <div class="lite-form-grid">
              <div class="lite-field">
                <label>Ngày</label>
                <input v-model="form.date" type="date" class="lite-input" />
              </div>
              <div class="lite-field">
                <label>Công đoạn</label>
                <select v-model="form.process" class="lite-select">
                  <option v-for="p in commonProcesses" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>
            <div class="lite-form-grid">
              <div class="lite-field">
                <label>Model Sản phẩm</label>
                <input v-model="form.productModel" type="text" class="lite-input" />
              </div>
              <div class="lite-field">
                <label>Máy / Chuyền</label>
                <input v-model="form.machine" type="text" class="lite-input" />
              </div>
            </div>
            <div class="lite-form-grid-3">
              <div class="lite-field">
                <label>Số lượng kiểm</label>
                <input
                  v-model.number="form.quantity"
                  type="number"
                  class="lite-input"
                  @input="onQuantityOrDefectChange"
                />
              </div>
              <div class="lite-field">
                <label>Số lượng lỗi</label>
                <input
                  v-model.number="form.defectQuantity"
                  type="number"
                  class="lite-input"
                  @input="onQuantityOrDefectChange"
                />
              </div>
              <div class="lite-field">
                <label>Tỷ lệ lỗi</label>
                <input :value="form.defectRate" type="text" class="lite-input" readonly />
              </div>
            </div>

            <div class="lite-field" style="margin-bottom: 12px;">
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 6px;
                  gap: 6px;
                  flex-wrap: wrap;
                "
              >
                <label style="margin: 0;">Mô tả lỗi (Gõ Tiếng Việt + Ctrl+Enter để dịch 3 ngôn ngữ)</label>
                <button
                  type="button"
                  class="lite-btn lite-btn-trilingual"
                  :disabled="isTranslatingDesc"
                  @click="handleTranslateDefectDesc"
                >
                  {{ isTranslatingDesc ? '⏳ Đang dịch...' : '🌐 Dịch 3 ngôn ngữ (Anh - Trung - Việt)' }}
                </button>
              </div>
              <textarea
                v-model="form.defectDescription"
                rows="4"
                class="lite-textarea"
                placeholder="Nhập tiếng Việt (VD: Vị trí R5062 linh kiện chưa cắm kịch) rồi nhấn Ctrl+Enter..."
                @keydown.ctrl.enter.prevent="handleTranslateDefectDesc"
              ></textarea>
              <select
                class="lite-select"
                style="margin-top: 6px; font-size: 12px;"
                @change="applyPresetDefect"
              >
                <option value="">-- Hoặc chọn mẫu câu 3 ngôn ngữ chuẩn nhà máy --</option>
                <option v-for="(p, i) in DEFECT_PRESETS" :key="i" :value="i">{{ p.label }}</option>
              </select>
            </div>

            <div class="lite-form-grid">
              <div class="lite-field">
                <label>Người chịu trách nhiệm</label>
                <input v-model="form.responsiblePerson" type="text" class="lite-input" />
              </div>
              <div class="lite-field">
                <label>Người phụ trách</label>
                <input v-model="form.assignee" type="text" class="lite-input" />
              </div>
            </div>

            <div class="lite-field">
              <label>Ảnh đính kèm ({{ totalImagesCount }} ảnh)</label>
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept="image/*"
                hidden
                @change="
                  (e) => {
                    if (e.target.files?.length) handleImagesSelected(e.target.files)
                    e.target.value = ''
                  }
                "
              />
              <div style="display: flex; gap: 8px; margin-top: 4px;">
                <button type="button" class="lite-btn" @click="fileInputRef?.click()">
                  📷 Chọn / Chụp ảnh
                </button>
                <button
                  v-if="totalImagesCount > 0"
                  type="button"
                  class="lite-btn lite-btn-danger"
                  @click="clearAllImages"
                >
                  Xoá hết ảnh
                </button>
              </div>

              <div
                v-if="totalImagesCount > 0"
                style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;"
              >
                <div
                  v-for="(img, idx) in existingImages"
                  :key="'ex_' + idx"
                  style="position: relative;"
                >
                  <img
                    :src="img.url"
                    style="width: 72px; height: 72px; object-fit: cover; border-radius: 8px;"
                  />
                  <button
                    type="button"
                    style="
                      position: absolute;
                      top: -6px;
                      right: -6px;
                      background: #ef4444;
                      color: #fff;
                      border: none;
                      border-radius: 50%;
                      width: 20px;
                      height: 20px;
                      cursor: pointer;
                    "
                    @click="removeExistingImage(idx)"
                  >
                    ✕
                  </button>
                </div>
                <div
                  v-for="(item, idx) in selectedFiles"
                  :key="item.id"
                  style="position: relative;"
                >
                  <img
                    :src="item.previewUrl"
                    style="width: 72px; height: 72px; object-fit: cover; border-radius: 8px;"
                  />
                  <button
                    type="button"
                    style="
                      position: absolute;
                      top: -6px;
                      right: -6px;
                      background: #ef4444;
                      color: #fff;
                      border: none;
                      border-radius: 50%;
                      width: 20px;
                      height: 20px;
                      cursor: pointer;
                    "
                    @click="removeSelectedFile(idx)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="lite-modal-footer">
            <button class="lite-btn" @click="isModalOpen = false">Hủy</button>
            <button class="lite-btn lite-btn-primary" :disabled="isSaving" @click="saveReport">
              {{ isSaving ? '⏳ Đang lưu...' : '💾 Lưu Báo cáo' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL XOÁ -->
    <Teleport to="body">
      <div v-if="showDeleteModal && reportToDelete" class="lite-modal-backdrop" @click.self="cancelDelete">
        <div class="lite-modal-card" style="max-width: 400px;">
          <div class="lite-modal-header">
            <h3>⚠️ Xác nhận xoá</h3>
            <button class="lite-close-btn" @click="cancelDelete">✕</button>
          </div>
          <div class="lite-modal-body">
            Bạn có chắc chắn muốn xoá báo cáo Model
            <strong>{{ reportToDelete.productModel }}</strong> ({{ reportToDelete.process }})?
          </div>
          <div class="lite-modal-footer">
            <button class="lite-btn" @click="cancelDelete">Hủy</button>
            <button class="lite-btn lite-btn-danger" :disabled="isDeleting" @click="executeDelete">
              {{ isDeleting ? '⏳ Đang xoá...' : '🗑️ Xác nhận Xoá' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- LIGHTBOX PHÓNG TO ẢNH HD -->
    <Teleport to="body">
      <div v-if="lightboxUrl" class="lite-modal-backdrop" @click="lightboxUrl = ''">
        <img
          :src="lightboxUrl"
          style="max-width: 96vw; max-height: 92vh; object-fit: contain; border-radius: 8px;"
        />
      </div>
    </Teleport>
  </div>
</template>
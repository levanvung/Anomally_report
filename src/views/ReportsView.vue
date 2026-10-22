<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  useReports, getDefectRateLevel, getPrimaryReportImage, getReportImageCount, commonProcesses
} from '../composables/useReports'
import { useAuth } from '../composables/useAuth'
import { exportReportsToExcel, parseExcelReportFile } from '../utils/excelService'
import { DEFECT_PRESETS, translateViToTrilingual } from '../utils/aiHelper'

const { isAdmin, canCreate, canEdit, canDelete } = useAuth()
const {
  searchText, statusFilter, processFilter, dateRange, activeStat, currentPage, pageSize,
  isModalOpen, isEditing, isSaving, showDeleteModal, reportToDelete, isDeleting,
  cancelDelete, executeDelete, isDetailOpen, selectedReport, form, existingImages, selectedFiles,
  totalImagesCount, handleImagesSelected, removeExistingImage, removeSelectedFile, clearAllImages,
  getReportImages, onQuantityOrDefectChange, filteredReports, pagedReports, stats, processStats,
  toggleProcessFilter, filterByStat, reports, resetFilters, openCreate, openEdit, openDetail,
  closeDetail, saveReport, removeReport, batchImportReports, changePage, statusLabels, statusClass,
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
  dateRange.value = (dateFrom.value || dateTo.value) ? [dateFrom.value || dateTo.value, dateTo.value || dateFrom.value] : null
  currentPage.value = 1
}

function handleResetAll() {
  dateFrom.value = ''
  dateTo.value = ''
  resetFilters()
}

function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize, { passive: true }))
onUnmounted(() => window.removeEventListener('resize', onResize))

const totalPages = computed(() => Math.max(1, Math.ceil(filteredReports.value.length / pageSize)))

function handleExportExcel() {
  const list = filteredReports.value.length ? filteredReports.value : reports.value
  if (!list.length) return alert('Không có dữ liệu để xuất!')
  exportReportsToExcel(list)
}

async function onExcelFileSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const records = await parseExcelReportFile(file)
    if (!records.length) return alert('Không tìm thấy dòng dữ liệu hợp lệ trong file Excel!')
    await batchImportReports(records)
    alert(`Đã nhập thành công ${records.length} báo cáo từ file Excel!`)
  } catch (err) {
    alert('Lỗi đọc file Excel: ' + err.message)
  }
}

function applyPresetDefect(e) {
  const idx = e.target.value
  if (idx !== '' && DEFECT_PRESETS[idx]) form.defectDescription = DEFECT_PRESETS[idx].text
  e.target.value = ''
}

async function handleTranslateDefectDesc() {
  if (!form.defectDescription?.trim()) return alert('Vui lòng gõ mô tả lỗi bằng tiếng Việt trước!')
  isTranslatingDesc.value = true
  try {
    form.defectDescription = await translateViToTrilingual(form.defectDescription, {
      process: form.process, model: form.productModel
    })
  } catch (err) {
    alert(err.message)
  } finally {
    isTranslatingDesc.value = false
  }
}
</script>

<template>
  <div class="lite-container">
    <!-- 4 THẺ CÔNG ĐOẠN -->
    <div v-memo="[processStats, processFilter]" class="lite-stats-grid">
      <div class="lite-stat-card" :class="{ active: processFilter === 'SMT' }" @click="toggleProcessFilter('SMT')">
        <div class="lite-stat-head"><span>⚙️ SMT</span><span>{{ processStats.smtPercent }}%</span></div>
        <div class="lite-stat-num">{{ processStats.smt }}</div>
        <div class="lite-stat-meta">
          <span>SL: {{ Number(processStats.smtDetails?.totalQty || 0).toLocaleString() }}</span>
          <span style="color:#f87171">Lỗi: {{ Number(processStats.smtDetails?.totalDefect || 0).toLocaleString() }}</span>
        </div>
      </div>
      <div class="lite-stat-card" :class="{ active: processFilter === 'AI' }" @click="toggleProcessFilter('AI')">
        <div class="lite-stat-head"><span>⚡ AI</span><span>{{ processStats.aiPercent }}%</span></div>
        <div class="lite-stat-num">{{ processStats.ai }}</div>
        <div class="lite-stat-meta">
          <span>SL: {{ Number(processStats.aiDetails?.totalQty || 0).toLocaleString() }}</span>
          <span style="color:#f87171">Lỗi: {{ Number(processStats.aiDetails?.totalDefect || 0).toLocaleString() }}</span>
        </div>
      </div>
      <div class="lite-stat-card" :class="{ active: processFilter === 'DIP' }" @click="toggleProcessFilter('DIP')">
        <div class="lite-stat-head"><span>🔌 DIP</span><span>{{ processStats.dipPercent }}%</span></div>
        <div class="lite-stat-num">{{ processStats.dip }}</div>
        <div class="lite-stat-meta">
          <span>SL: {{ Number(processStats.dipDetails?.totalQty || 0).toLocaleString() }}</span>
          <span style="color:#f87171">Lỗi: {{ Number(processStats.dipDetails?.totalDefect || 0).toLocaleString() }}</span>
        </div>
      </div>
      <div class="lite-stat-card" :class="{ active: processFilter === 'AVR' }" @click="toggleProcessFilter('AVR')">
        <div class="lite-stat-head"><span>🔊 AVR / MP</span><span>{{ processStats.avrPercent }}%</span></div>
        <div class="lite-stat-num">{{ processStats.avr }}</div>
        <div class="lite-stat-meta">
          <span>SL: {{ Number(processStats.avrDetails?.totalQty || 0).toLocaleString() }}</span>
          <span style="color:#f87171">Lỗi: {{ Number(processStats.avrDetails?.totalDefect || 0).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- THANH LỌC -->
    <div class="lite-filter-bar">
      <div class="lite-filter-row">
        <div class="lite-search-wrap">
          <input v-model="searchText" type="text" class="lite-input" placeholder="🔍 Tìm Model, Công đoạn, Mô tả lỗi..." />
          <button v-if="isMobile" type="button" class="lite-btn" @click="showMobileFilters = !showMobileFilters">🌪️ Lọc</button>
        </div>
        <template v-if="!isMobile || showMobileFilters">
          <select v-model="processFilter" class="lite-select" style="width:auto" @change="currentPage = 1">
            <option value="all">Tất cả công đoạn</option>
            <option v-for="p in commonProcesses" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="statusFilter" class="lite-select" style="width:auto" @change="currentPage = 1">
            <option value="all">Tất cả trạng thái</option>
            <option value="open">Chưa xử lý</option>
            <option value="investigating">Đang điều tra</option>
            <option value="resolved">Đã hoàn thành</option>
          </select>
          <input v-model="dateFrom" type="date" class="lite-input" style="width:auto" @change="onDateChange" />
          <input v-model="dateTo" type="date" class="lite-input" style="width:auto" @change="onDateChange" />
          <button type="button" class="lite-btn" @click="handleResetAll">🔄 Xoá lọc</button>
        </template>
      </div>
      <div class="lite-chips">
        <button class="lite-chip" :class="{ active: activeStat === 'all' && processFilter === 'all' }" @click="handleResetAll">Tất cả ({{ stats.total }})</button>
        <button class="lite-chip" :class="{ active: activeStat === 'attention' }" @click="filterByStat('attention')">🔥 Cần xử lý ({{ stats.open + stats.investigating }})</button>
        <button class="lite-chip" :class="{ active: activeStat === 'resolved' }" @click="filterByStat('resolved')">✅ Đã hoàn thành ({{ stats.resolved }})</button>
      </div>
    </div>

    <!-- DANH SÁCH BÁO CÁO -->
    <div class="lite-table-card">
      <div class="lite-table-toolbar">
        <strong>📋 Báo cáo Bất thường ({{ filteredReports.length }})</strong>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <input ref="excelInputRef" type="file" accept=".xlsx,.xls" hidden @change="onExcelFileSelected" />
          <button v-if="isAdmin" type="button" class="lite-btn" @click="excelInputRef?.click()">📂 Nhập Excel</button>
          <button type="button" class="lite-btn" @click="handleExportExcel">⬇️ Xuất Excel</button>
          <button v-if="canCreate" type="button" class="lite-btn lite-btn-primary" @click="openCreate">➕ Tạo mới</button>
        </div>
      </div>

      <!-- BẢNG MÁY TÍNH -->
      <div v-if="!isMobile" class="lite-table-scroll">
        <table class="lite-table">
          <thead>
            <tr>
              <th>#</th><th>Ngày</th><th>Công đoạn</th><th>Model</th><th>Máy</th><th>SL</th><th>Lỗi</th><th>Tỷ lệ</th><th>Ảnh</th><th>Mô tả lỗi</th><th>Chịu TN</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in pagedReports" :key="r.id">
              <td>{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td>{{ r.date }}</td>
              <td><strong>{{ r.process }}</strong></td>
              <td><strong style="color:var(--accent); cursor:pointer" @click="openDetail(r)">{{ r.productModel }}</strong></td>
              <td>{{ r.machine || '—' }}</td>
              <td>{{ Number(r.quantity || 0).toLocaleString() }}</td>
              <td style="color:#f87171; font-weight:700">{{ Number(r.defectQuantity || 0).toLocaleString() }}</td>
              <td><span class="lite-pill" :class="getDefectRateLevel(r.defectRate).severity">{{ r.defectRate }}</span></td>
              <td>
                <img v-if="getReportImageCount(r) > 0" :src="getPrimaryReportImage(r)" class="lite-thumb" loading="lazy" @click="openDetail(r)" />
                <span v-else>—</span>
              </td>
              <td><div class="lite-desc-pre" @click="openDetail(r)">{{ r.defectDescription }}</div></td>
              <td>{{ r.responsiblePerson }}</td>
              <td><span class="lite-pill" :class="statusClass(r.status)">{{ statusLabels[r.status] || r.status }}</span></td>
              <td style="white-space:nowrap">
                <button class="lite-btn" style="padding:4px 8px" @click="openDetail(r)">👁️</button>
                <button v-if="canEdit" class="lite-btn" style="padding:4px 8px; margin-left:4px" @click="openEdit(r)">✏️</button>
                <button v-if="canDelete" class="lite-btn lite-btn-danger" style="padding:4px 8px; margin-left:4px" @click="removeReport(r)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- THẺ MOBILE GỌN ĐẸP -->
      <div v-else class="lite-mobile-list">
        <div v-for="(r, idx) in pagedReports" :key="r.id" class="lite-mcard">
          <div class="lite-mcard-top">
            <div>
              <span style="font-size:11px; color:var(--text-sub)">#{{ (currentPage - 1) * pageSize + idx + 1 }} · {{ r.process }}</span>
              <strong style="margin-left:6px; color:var(--accent)" @click="openDetail(r)">{{ r.productModel }}</strong>
            </div>
            <span class="lite-pill" :class="getDefectRateLevel(r.defectRate).severity">{{ r.defectRate }}</span>
          </div>
          <div class="lite-mcard-body" @click="openDetail(r)">
            <img v-if="getReportImageCount(r) > 0" :src="getPrimaryReportImage(r)" class="lite-mcard-img" loading="lazy" />
            <div style="flex:1; min-width:0">
              <div class="lite-mcard-desc">{{ r.defectDescription }}</div>
              <div style="font-size:11px; color:var(--text-sub)">📅 {{ r.date }} · 👤 {{ r.responsiblePerson }}</div>
            </div>
          </div>
          <div class="lite-mcard-metrics">
            <div>SL: <strong>{{ Number(r.quantity || 0).toLocaleString() }}</strong></div>
            <div>Lỗi: <strong style="color:#f87171">{{ Number(r.defectQuantity || 0).toLocaleString() }}</strong></div>
            <div><span class="lite-pill" :class="statusClass(r.status)">{{ statusLabels[r.status] }}</span></div>
          </div>
          <div class="lite-mcard-foot">
            <span>⚙️ {{ r.machine || 'N/A' }}</span>
            <div style="display:flex; gap:6px">
              <button class="lite-btn" style="padding:4px 10px" @click="openDetail(r)">Chi tiết</button>
              <button v-if="canEdit" class="lite-btn" style="padding:4px 10px" @click="openEdit(r)">Sửa</button>
              <button v-if="canDelete" class="lite-btn lite-btn-danger" style="padding:4px 10px" @click="removeReport(r)">Xoá</button>
            </div>
          </div>
        </div>
      </div>

      <!-- PHÂN TRANG -->
      <div class="lite-table-toolbar" style="border-top:1px solid var(--border-strong); border-bottom:none">
        <span style="font-size:12px; color:var(--text-sub)">Trang {{ currentPage }} / {{ totalPages }}</span>
        <div style="display:flex; gap:6px">
          <button class="lite-btn" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">← Trước</button>
          <button class="lite-btn" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">Sau →</button>
        </div>
      </div>
    </div>

    <!-- MODAL CHI TIẾT -->
    <Teleport to="body">
      <div v-if="isDetailOpen && selectedReport" class="lite-modal-backdrop" @click.self="closeDetail">
        <div class="lite-modal-card">
          <div class="lite-modal-header">
            <h3>📌 {{ selectedReport.productModel }} · {{ selectedReport.process }}</h3>
            <button class="lite-close-btn" @click="closeDetail">✕</button>
          </div>
          <div class="lite-modal-body">
            <div style="background:var(--bg-elevated); padding:12px; border-radius:8px; white-space:pre-line; margin-bottom:12px;">
              {{ selectedReport.defectDescription }}
            </div>
            <div v-if="getReportImages(selectedReport).length" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:8px;">
              <img v-for="(img, i) in getReportImages(selectedReport)" :key="i" :src="img.url" style="width:100%; height:120px; object-fit:cover; border-radius:8px; cursor:zoom-in" @click="lightboxUrl = img.url" />
            </div>
          </div>
          <div class="lite-modal-footer">
            <button v-if="canEdit" class="lite-btn lite-btn-primary" @click="openEdit(selectedReport)">✏️ Chỉnh sửa</button>
            <button class="lite-btn" @click="closeDetail">Đóng</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL TẠO / SỬA (TÍCH HỢP DỊCH 3 NGÔN NGỮ Ở CỘT MÔ TẢ LỖI) -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="lite-modal-backdrop" @click.self="isModalOpen = false">
        <div class="lite-modal-card lite-modal-lg">
          <div class="lite-modal-header">
            <h3>{{ isEditing ? '✏️ Chỉnh sửa Báo cáo' : '➕ Tạo Báo cáo Mới' }}</h3>
            <button class="lite-close-btn" @click="isModalOpen = false">✕</button>
          </div>
          <div class="lite-modal-body">
            <div class="lite-form-grid">
              <div class="lite-field"><label>Ngày</label><input v-model="form.date" type="date" class="lite-input" /></div>
              <div class="lite-field">
                <label>Công đoạn</label>
                <select v-model="form.process" class="lite-select">
                  <option v-for="p in commonProcesses" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>
            <div class="lite-form-grid">
              <div class="lite-field"><label>Model Sản phẩm</label><input v-model="form.productModel" type="text" class="lite-input" /></div>
              <div class="lite-field"><label>Máy / Chuyền</label><input v-model="form.machine" type="text" class="lite-input" /></div>
            </div>
            <div class="lite-form-grid-3">
              <div class="lite-field"><label>Số lượng kiểm</label><input v-model.number="form.quantity" type="number" class="lite-input" @input="onQuantityOrDefectChange" /></div>
              <div class="lite-field"><label>Số lượng lỗi</label><input v-model.number="form.defectQuantity" type="number" class="lite-input" @input="onQuantityOrDefectChange" /></div>
              <div class="lite-field"><label>Tỷ lệ lỗi</label><input :value="form.defectRate" type="text" class="lite-input" readonly /></div>
            </div>

            <div class="lite-field" style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:6px; flex-wrap:wrap;">
                <label style="margin:0">Mô tả lỗi (Gõ Tiếng Việt + Ctrl+Enter để dịch Anh - Trung - Việt)</label>
                <button type="button" class="lite-btn lite-btn-trilingual" :disabled="isTranslatingDesc" @click="handleTranslateDefectDesc">
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
              <select class="lite-select" style="margin-top:6px; font-size:12px" @change="applyPresetDefect">
                <option value="">-- Hoặc chọn mẫu câu 3 ngôn ngữ chuẩn nhà máy --</option>
                <option v-for="(p, i) in DEFECT_PRESETS" :key="i" :value="i">{{ p.label }}</option>
              </select>
            </div>

            <div class="lite-form-grid">
              <div class="lite-field"><label>Người chịu trách nhiệm</label><input v-model="form.responsiblePerson" type="text" class="lite-input" /></div>
              <div class="lite-field"><label>Người phụ trách</label><input v-model="form.assignee" type="text" class="lite-input" /></div>
            </div>

            <div class="lite-field">
              <label>Ảnh đính kèm ({{ totalImagesCount }} ảnh)</label>
              <input ref="fileInputRef" type="file" multiple accept="image/*" hidden @change="e => { if(e.target.files?.length) handleImagesSelected(e.target.files); e.target.value='' }" />
              <div style="display:flex; gap:8px; margin-top:4px;">
                <button type="button" class="lite-btn" @click="fileInputRef?.click()">📷 Chọn / Chụp ảnh</button>
                <button v-if="totalImagesCount > 0" type="button" class="lite-btn lite-btn-danger" @click="clearAllImages">Xoá hết ảnh</button>
              </div>
            </div>
          </div>
          <div class="lite-modal-footer">
            <button class="lite-btn" @click="isModalOpen = false">Hủy</button>
            <button class="lite-btn lite-btn-primary" :disabled="isSaving" @click="saveReport">{{ isSaving ? 'Đang lưu...' : '💾 Lưu Báo cáo' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL XOÁ -->
    <Teleport to="body">
      <div v-if="showDeleteModal && reportToDelete" class="lite-modal-backdrop" @click.self="cancelDelete">
        <div class="lite-modal-card" style="max-width:400px">
          <div class="lite-modal-header"><h3>⚠️ Xác nhận xoá</h3><button class="lite-close-btn" @click="cancelDelete">✕</button></div>
          <div class="lite-modal-body">Xoá báo cáo Model <strong>{{ reportToDelete.productModel }}</strong>?</div>
          <div class="lite-modal-footer">
            <button class="lite-btn" @click="cancelDelete">Hủy</button>
            <button class="lite-btn lite-btn-danger" :disabled="isDeleting" @click="executeDelete">Xoá</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- LIGHTBOX -->
    <Teleport to="body">
      <div v-if="lightboxUrl" class="lite-modal-backdrop" @click="lightboxUrl = ''">
        <img :src="lightboxUrl" style="max-width:95vw; max-height:92vh; object-fit:contain; border-radius:8px;" />
      </div>
    </Teleport>
  </div>
</template>

<template>
  <a-modal
    :open="visible"
    title="Nhập dữ liệu Báo cáo từ Excel (IPQC Import Wizard)"
    width="980px"
    :footer="null"
    :destroy-on-close="true"
    wrap-class-name="excel-import-modal"
    @cancel="handleClose"
  >
    <div class="excel-import-container">
      <!-- Bước 1: Chọn hoặc kéo thả file Excel -->
      <div v-if="!parsedData" class="import-upload-section">
        <div
          class="import-dropzone"
          :class="{ 'is-dragging': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDropFile"
          @click="triggerFileInput"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx, .xls"
            class="hidden-file-input"
            @change="onFileChange"
          />
          <div class="dropzone-content">
            <div class="dropzone-icon">
              <FileExcelOutlined v-if="!isParsing" />
              <LoadingOutlined v-else spin />
            </div>
            <div class="dropzone-title">
              {{ isParsing ? 'Đang đọc và phân tích cấu trúc file Excel...' : 'Kéo thả file Excel vào đây hoặc nhấp để tải lên' }}
            </div>
            <div class="dropzone-hint">
              Hỗ trợ định dạng .xlsx, .xls theo chuẩn báo cáo IPQC Anomaly Report
            </div>
          </div>
        </div>

        <!-- Thanh tải file mẫu chuẩn -->
        <div class="template-download-bar">
          <div class="template-info">
            <InfoCircleOutlined />
            <span>Chưa có file mẫu chuẩn 18 cột của xưởng?</span>
          </div>
          <a
            href="/Anomaly_report_17092026_1.xlsx"
            download="Anomaly_report_Template.xlsx"
            class="template-download-link"
          >
            <DownloadOutlined /> Tải file mẫu chuẩn xưởng (.xlsx)
          </a>
        </div>
      </div>

      <!-- Bước 2: Xem trước và cấu hình Sheet muốn Import -->
      <div v-else class="import-preview-section">
        <!-- Thanh tóm tắt kết quả phân tích -->
        <div class="import-summary-bar">
          <div class="file-meta">
            <FileExcelFilled class="excel-icon" />
            <div>
              <div class="file-name">{{ parsedData.fileName }}</div>
              <div class="file-stats">
                Phát hiện <b>{{ parsedData.sheetNames.length }} sheet</b> | Tổng cộng <b>{{ totalAvailableRecords }} bản ghi</b>
              </div>
            </div>
          </div>

          <!-- Bộ chọn Sheet -->
          <div class="sheet-selector-wrap">
            <span class="sheet-label">Sheet nhập:</span>
            <a-select
              v-model:value="selectedSheet"
              style="min-width: 260px;"
              @change="onSheetChange"
            >
              <a-select-option value="__all__">
                🌐 Nhập tất cả các sheet ({{ totalAvailableRecords }} bản ghi)
              </a-select-option>
              <a-select-option
                v-for="sName in parsedData.sheetNames"
                :key="sName"
                :value="sName"
              >
                📄 {{ sName }} ({{ (parsedData.sheetsMap[sName] || []).length }} dòng)
              </a-select-option>
            </a-select>
          </div>

          <a-button class="re-upload-btn" @click="resetUpload">
            <ReloadOutlined /> Chọn file khác
          </a-button>
        </div>

        <!-- Thanh cấu hình & Cơ chế xử lý trùng lặp dữ liệu -->
        <div class="duplicate-setting-panel">
          <div class="duplicate-panel-header">
            <div class="duplicate-panel-title">
              <SafetyCertificateOutlined class="panel-icon" />
              <span>Cơ chế xử lý khi trùng lặp dữ liệu (Cùng Ngày + Model + Công đoạn + Mô tả lỗi):</span>
            </div>
            <div class="duplicate-stats-chips">
              <span class="chip-count-new" title="Số lượng bản ghi hoàn toàn mới">
                <CheckCircleOutlined /> {{ newCount }} mới
              </span>
              <span v-if="duplicateCount > 0" class="chip-count-dup" title="Số lượng bản ghi trùng khớp với hệ thống">
                <ExclamationCircleOutlined /> {{ duplicateCount }} trùng khớp
              </span>
              <span v-else class="chip-count-none">
                <CheckOutlined /> Không trùng lặp
              </span>
            </div>
          </div>

          <a-radio-group v-model:value="duplicateMode" class="duplicate-radio-group">
            <a-radio value="overwrite" class="dup-radio-card" :class="{ 'is-selected': duplicateMode === 'overwrite' }">
              <div class="dup-radio-content">
                <div class="dup-radio-title">
                  🔄 <b>Ghi đè & Cập nhật</b>
                  <span class="badge-recommended">Mặc định khuyên dùng</span>
                </div>
                <div class="dup-radio-desc">
                  Cập nhật số lượng, tỷ lệ, nguyên nhân, tiến độ từ Excel & <b>bảo toàn 100% ảnh/vẽ marker đã tải lên</b>.
                </div>
              </div>
            </a-radio>

            <a-radio value="skip" class="dup-radio-card" :class="{ 'is-selected': duplicateMode === 'skip' }">
              <div class="dup-radio-content">
                <div class="dup-radio-title">
                  ⏭️ <b>Bỏ qua bản ghi trùng</b>
                </div>
                <div class="dup-radio-desc">
                  Chỉ nhập <b>{{ newCount }}</b> báo cáo mới chưa có trong hệ thống, giữ nguyên các bản ghi cũ.
                </div>
              </div>
            </a-radio>

            <a-radio value="add_all" class="dup-radio-card" :class="{ 'is-selected': duplicateMode === 'add_all' }">
              <div class="dup-radio-content">
                <div class="dup-radio-title">
                  ➕ <b>Thêm mới tất cả</b>
                </div>
                <div class="dup-radio-desc">
                  Tạo báo cáo mới cho tất cả các dòng, không đối chiếu hay ghi đè.
                </div>
              </div>
            </a-radio>
          </a-radio-group>
        </div>

        <!-- Bảng Preview dữ liệu -->
        <div class="preview-table-container">
          <div class="preview-header">
            <span class="preview-title">
              Xem trước danh sách (Hiển thị {{ previewList.length }} / {{ currentDisplayRecords.length }} bản ghi hợp lệ):
            </span>
            <div class="preview-stats-badges">
              <span class="preview-badge total">{{ currentDisplayRecords.length }} bản ghi</span>
              <span v-if="duplicateCount > 0 && duplicateMode === 'overwrite'" class="preview-badge dup">
                {{ duplicateCount }} sẽ ghi đè
              </span>
              <span v-else-if="duplicateCount > 0 && duplicateMode === 'skip'" class="preview-badge skip">
                {{ duplicateCount }} sẽ bỏ qua
              </span>
            </div>
          </div>

          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  <th style="width: 45px;">STT</th>
                  <th style="width: 90px;">Đối chiếu</th>
                  <th style="width: 90px;">Ngày</th>
                  <th style="width: 80px;">Công đoạn</th>
                  <th style="width: 130px;">Model</th>
                  <th style="width: 70px;">SL Kiểm</th>
                  <th style="width: 65px;">SL Lỗi</th>
                  <th style="width: 70px;">Tỷ lệ lỗi</th>
                  <th>Mô tả khuyết tật</th>
                  <th style="width: 90px;">Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in previewList" :key="idx">
                  <td class="text-center">{{ idx + 1 }}</td>
                  <td>
                    <span v-if="isDuplicateRecord(item)" class="badge-dup-tag" :class="duplicateMode">
                      {{ duplicateMode === 'overwrite' ? 'Ghi đè' : (duplicateMode === 'skip' ? 'Bỏ qua' : 'Tạo mới') }}
                    </span>
                    <span v-else class="badge-new-tag">
                      Mới
                    </span>
                  </td>
                  <td>{{ item.date }}</td>
                  <td>
                    <span class="process-tag" :class="item.process.toLowerCase()">
                      {{ item.process }}
                    </span>
                  </td>
                  <td class="font-bold">{{ item.productModel }}</td>
                  <td class="text-right">{{ item.quantity }}</td>
                  <td class="text-right text-danger font-bold">{{ item.defectQuantity }}</td>
                  <td class="text-right font-bold">{{ item.defectRate }}</td>
                  <td class="desc-cell" :title="item.defectDescription">
                    {{ item.defectDescription }}
                  </td>
                  <td>
                    <span class="status-badge" :class="item.status">
                      {{ item.status === 'resolved' ? 'Đã xong' : (item.status === 'investigating' ? 'Đang xử lý' : 'Mới') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="import-footer">
          <div class="import-status-text">
            <CheckCircleFilled style="color: #10b981; margin-right: 6px;" />
            <span v-if="duplicateMode === 'overwrite'">
              Sẵn sàng: Thêm mới <b>{{ newCount }}</b> bản ghi, Cập nhật ghi đè <b>{{ duplicateCount }}</b> bản ghi cũ
            </span>
            <span v-else-if="duplicateMode === 'skip'">
              Sẵn sàng: Thêm mới <b>{{ newCount }}</b> bản ghi (Bỏ qua <b>{{ duplicateCount }}</b> bản ghi trùng)
            </span>
            <span v-else>
              Sẵn sàng: Tạo mới toàn bộ <b>{{ currentDisplayRecords.length }}</b> bản ghi vào hệ thống
            </span>
          </div>
          <div class="footer-btns">
            <a-button @click="handleClose">Huỷ bỏ</a-button>
            <a-button
              type="primary"
              :loading="isImporting"
              class="confirm-import-btn"
              @click="confirmImport"
            >
              <UploadOutlined /> Xác nhận Nhập dữ liệu
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  FileExcelOutlined,
  FileExcelFilled,
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { parseExcelReportFile } from '../utils/excelService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  existingReports: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:visible', 'imported'])

const fileInputRef = ref(null)
const isDragging = ref(false)
const isParsing = ref(false)
const isImporting = ref(false)
const parsedData = ref(null)
const selectedSheet = ref('__all__')
const duplicateMode = ref('overwrite') // 'overwrite' | 'skip' | 'add_all'

const norm = (str) => (str || '').toString().trim().toLowerCase()

function isDuplicateRecord(item) {
  if (!props.existingReports || props.existingReports.length === 0) return false
  return props.existingReports.some((r) => {
    return (
      norm(r.date) === norm(item.date) &&
      norm(r.productModel) === norm(item.productModel) &&
      norm(r.process) === norm(item.process) &&
      norm(r.defectDescription) === norm(item.defectDescription)
    )
  })
}

const totalAvailableRecords = computed(() => {
  if (!parsedData.value) return 0
  return parsedData.value.totalRecords || 0
})

const currentDisplayRecords = computed(() => {
  if (!parsedData.value) return []
  if (selectedSheet.value === '__all__') {
    let all = []
    for (const sName of parsedData.value.sheetNames) {
      all = all.concat(parsedData.value.sheetsMap[sName] || [])
    }
    return all
  }
  return parsedData.value.sheetsMap[selectedSheet.value] || []
})

const duplicateCount = computed(() => {
  return currentDisplayRecords.value.filter(isDuplicateRecord).length
})

const newCount = computed(() => {
  return Math.max(0, currentDisplayRecords.value.length - duplicateCount.value)
})

// Giới hạn hiển thị preview tối đa 50 dòng để mượt mà
const previewList = computed(() => {
  return currentDisplayRecords.value.slice(0, 50)
})

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

async function processFile(file) {
  if (!file) return
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    message.error('Vui lòng chọn file định dạng Excel (.xlsx hoặc .xls)')
    return
  }

  isParsing.value = true
  try {
    const result = await parseExcelReportFile(file)
    if (result.totalRecords === 0) {
      message.warning('Không tìm thấy dòng dữ liệu báo cáo nào hợp lệ trong file Excel')
      return
    }

    parsedData.value = result
    selectedSheet.value = result.sheetNames.length > 1 ? '__all__' : result.sheetNames[0]
    message.success(`Đã đọc thành công ${result.totalRecords} báo cáo từ ${result.sheetNames.length} sheet!`)
  } catch (err) {
    console.error('Lỗi phân tích Excel:', err)
    message.error('Lỗi khi đọc file Excel: ' + (err.message || ''))
  } finally {
    isParsing.value = false
  }
}

function onFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (file) {
    processFile(file)
  }
  if (e.target) e.target.value = ''
}

function onDropFile(e) {
  isDragging.value = false
  const file = e.dataTransfer.files && e.dataTransfer.files[0]
  if (file) {
    processFile(file)
  }
}

function resetUpload() {
  parsedData.value = null
  selectedSheet.value = '__all__'
  duplicateMode.value = 'overwrite'
}

function handleClose() {
  resetUpload()
  emit('update:visible', false)
}

async function confirmImport() {
  const recordsToImport = currentDisplayRecords.value
  if (!recordsToImport || recordsToImport.length === 0) {
    message.warning('Không có bản ghi nào để nhập')
    return
  }

  isImporting.value = true
  try {
    emit('imported', {
      records: recordsToImport,
      mode: duplicateMode.value,
    })
    handleClose()
  } catch (err) {
    console.error('Lỗi khi import:', err)
  } finally {
    isImporting.value = false
  }
}
</script>

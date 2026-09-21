<template>
  <a-modal
    :open="visible"
    title="Trình biên tập ảnh QC Studio Chuyên nghiệp (Fabric.js Pro)"
    width="70%"
    :footer="null"
    :destroy-on-close="true"
    wrap-class-name="image-marker-modal"
    @cancel="handleClose"
  >
    <div class="marker-editor-container">
      <!-- Ribbon Tabs Menu chuyển đổi nhóm tính năng -->
      <div class="marker-ribbon-tabs">
        <div class="ribbon-tabs-nav">
          <button
            type="button"
            class="ribbon-tab-btn"
            :class="{ active: activeTab === 'annotate' }"
            @click="switchTab('annotate')"
          >
            <span class="tab-icon">✏️</span>
            <span class="tab-label">Chú thích & QC</span>
          </button>

          <button
            type="button"
            class="ribbon-tab-btn"
            :class="{ active: activeTab === 'crop_transform' }"
            @click="switchTab('crop_transform')"
          >
            <span class="tab-icon">✂️</span>
            <span class="tab-label">Cắt cúp & Xoay</span>
          </button>

          <button
            type="button"
            class="ribbon-tab-btn"
            :class="{ active: activeTab === 'adjust_privacy' }"
            @click="switchTab('adjust_privacy')"
          >
            <span class="tab-icon">☀️</span>
            <span class="tab-label">Chỉnh sáng & Bảo mật</span>
          </button>
        </div>

        <!-- Các nút tác vụ nhanh (luôn cố định bên phải) -->
        <div class="ribbon-tab-actions">
          <button
            v-if="hasActiveObject"
            type="button"
            class="marker-action-btn delete-selected"
            title="Xoá hình đang chọn (Delete)"
            @click="deleteSelected"
          >
            <DeleteOutlined /> Xoá hình
          </button>
          <button
            type="button"
            class="marker-action-btn"
            :disabled="historyIndex <= 0"
            title="Hoàn tác nét trước (Ctrl+Z)"
            @click="undo"
          >
            <RollbackOutlined /> Hoàn tác
          </button>
          <button
            type="button"
            class="marker-action-btn danger"
            title="Xoá tất cả nét vẽ"
            @click="clearAll"
          >
            <ClearOutlined /> Xoá hết
          </button>
        </div>
      </div>

      <!-- NỘI DUNG THANH CÔNG CỤ THEO TAB -->
      <div class="marker-toolbar">
        <!-- TAB 1: CHÚ THÍCH & CÔNG CỤ QC -->
        <template v-if="activeTab === 'annotate'">
          <!-- Nhóm 1: Công cụ hình & vẽ -->
          <div class="marker-tool-group">
            <span class="tool-group-label">Vẽ:</span>

            <button
              type="button"
              class="marker-tool-btn select-tool"
              :class="{ active: currentTool === 'select' }"
              title="Chọn & Di chuyển hình (xoay 360°, co giãn 8 chốt)"
              @click="setTool('select')"
            >
              <span class="tool-icon">👆</span>
              <span class="tool-name">Chọn</span>
            </button>

            <button
              type="button"
              class="marker-tool-btn"
              :class="{ active: currentTool === 'rect' }"
              title="Vẽ khung chữ nhật khoanh vùng lỗi"
              @click="setTool('rect')"
            >
              <span class="tool-icon">🔲</span>
              <span class="tool-name">Khung</span>
            </button>

            <button
              type="button"
              class="marker-tool-btn"
              :class="{ active: currentTool === 'circle' }"
              title="Vẽ hình tròn khoanh điểm lỗi"
              @click="setTool('circle')"
            >
              <span class="tool-icon">⭕</span>
              <span class="tool-name">Tròn</span>
            </button>

            <button
              type="button"
              class="marker-tool-btn"
              :class="{ active: currentTool === 'arrow' }"
              title="Vẽ mũi tên chỉ điểm lỗi"
              @click="setTool('arrow')"
            >
              <span class="tool-icon">➡️</span>
              <span class="tool-name">Mũi tên</span>
            </button>

            <button
              type="button"
              class="marker-tool-btn"
              :class="{ active: currentTool === 'pen' }"
              title="Bút vẽ tự do theo viền nứt/hở"
              @click="setTool('pen')"
            >
              <span class="tool-icon">✏️</span>
              <span class="tool-name">Bút</span>
            </button>

            <button
              type="button"
              class="marker-tool-btn"
              :class="{ active: currentTool === 'highlighter' }"
              title="Bút dạ quang (Highlight bán trong suốt để làm nổi bật đường mạch)"
              @click="setTool('highlighter')"
            >
              <span class="tool-icon">🖍️</span>
              <span class="tool-name">Dạ quang</span>
            </button>

            <button
              type="button"
              class="marker-tool-btn"
              :class="{ active: currentTool === 'text' }"
              title="Nhấp để chèn văn bản (nhấp đúp để sửa chữ)"
              @click="setTool('text')"
            >
              <span class="tool-icon">🔤</span>
              <span class="tool-name">Chữ</span>
            </button>
          </div>

          <div class="marker-toolbar-divider"></div>

          <!-- Nhóm 2: Công cụ QC Chuyên dụng (Huy hiệu số, Đo kích thước, Icon) -->
          <div class="marker-tool-group">
            <span class="tool-group-label">QC:</span>

            <!-- Nút tạo huy hiệu số lỗi ① ② ③ -->
            <div class="badge-creator-btn-wrap">
              <button
                type="button"
                class="marker-tool-btn qc-badge-btn"
                :title="`Bấm để thêm huy hiệu số lỗi ${nextBadgeNumber}`"
                @click="addNumberedBadge()"
              >
                <span class="badge-num-preview">{{ nextBadgeNumber }}</span>
                <span class="tool-name">Đánh số</span>
              </button>
              <div class="badge-counter-stepper">
                <button
                  type="button"
                  title="Giảm số đếm"
                  :disabled="nextBadgeNumber <= 1"
                  @click="nextBadgeNumber--"
                >-</button>
                <button
                  type="button"
                  title="Tăng số đếm"
                  @click="nextBadgeNumber++"
                >+</button>
              </div>
            </div>

            <!-- Nút Thước đo kích thước -->
            <button
              type="button"
              class="marker-tool-btn"
              title="Thêm thước đo kích thước lỗi (<-- 0.5mm -->)"
              @click="addMeasureCallout()"
            >
              <span class="tool-icon">📏</span>
              <span class="tool-name">Đo mm</span>
            </button>

            <!-- Menu thả icon nhãn QC -->
            <div class="qc-stickers-group">
              <button
                type="button"
                class="marker-tool-btn sticker-btn warning"
                title="Dán nhãn Cảnh báo ⚠️"
                @click="addQcIcon('⚠️', 'CẢNH BÁO', '#f59e0b')"
              >
                ⚠️ Cảnh báo
              </button>
              <button
                type="button"
                class="marker-tool-btn sticker-btn danger"
                title="Dán nhãn Lỗi NG ❌"
                @click="addQcIcon('❌', 'LỖI NG', '#ef4444')"
              >
                ❌ Lỗi NG
              </button>
              <button
                type="button"
                class="marker-tool-btn sticker-btn success"
                title="Dán nhãn Đạt OK ✔️"
                @click="addQcIcon('✔️', 'ĐẠT OK', '#10b981')"
              >
                ✔️ Đạt OK
              </button>
              <button
                type="button"
                class="marker-tool-btn sticker-btn short"
                title="Dán nhãn Chập điện / Ngắn mạch ⚡"
                @click="addQcIcon('⚡', 'CHẬP MẠCH', '#eab308')"
              >
                ⚡ Chập
              </button>
            </div>
          </div>

          <div class="marker-toolbar-divider"></div>

          <!-- Nhóm 3: Màu sắc & Nét vẽ -->
          <div class="marker-tool-group">
            <span class="tool-group-label">Màu:</span>
            <div class="marker-color-palette">
              <button
                v-for="c in colorOptions"
                :key="c.value"
                type="button"
                class="color-dot"
                :class="{ active: currentColor === c.value }"
                :style="{ backgroundColor: c.value }"
                :title="c.label"
                @click="changeColor(c.value)"
              ></button>
            </div>
          </div>

          <div class="marker-toolbar-divider"></div>

          <div class="marker-tool-group stroke-slider-group">
            <span class="tool-group-label">Nét:</span>
            <div class="stroke-slider-wrap">
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                :value="currentStroke"
                class="marker-stroke-range"
                title="Kéo thanh trượt để điều chỉnh nét dày hoặc mỏng (1px - 24px)"
                @input="handleStrokeInput($event.target.value)"
              />
              <span class="stroke-val-badge">{{ currentStroke }}px</span>
              <span
                class="stroke-dot-preview"
                :style="{
                  width: Math.min(18, Math.max(3, currentStroke)) + 'px',
                  height: Math.min(18, Math.max(3, currentStroke)) + 'px',
                  backgroundColor: currentColor
                }"
                title="Xem trước độ dày nét vẽ"
              ></span>
            </div>
          </div>
        </template>


        <!-- TAB 2: CẮT CÚP & XOAY ẢNH -->
        <template v-else-if="activeTab === 'crop_transform'">
          <!-- Công cụ Cắt ảnh (Crop) -->
          <div class="marker-tool-group">
            <span class="tool-group-label">Cắt cúp:</span>
            <template v-if="!isCropMode">
              <button
                type="button"
                class="marker-tool-btn crop-start-btn"
                title="Bật khung cắt cúp (Crop) để phóng to khu vực cần soi chi tiết"
                @click="startCrop"
              >
                <ScissorOutlined /> Bắt đầu Cắt cúp (Crop)
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="marker-tool-btn crop-apply-btn"
                title="Áp dụng vùng cắt"
                @click="applyCrop"
              >
                <CheckOutlined /> Xác nhận Cắt
              </button>
              <button
                type="button"
                class="marker-tool-btn crop-cancel-btn"
                title="Huỷ bỏ thao tác cắt"
                @click="cancelCrop"
              >
                ✕ Huỷ cắt
              </button>
            </template>
          </div>

          <div class="marker-toolbar-divider"></div>

          <!-- Công cụ Xoay 90 độ -->
          <div class="marker-tool-group">
            <span class="tool-group-label">Xoay 90°:</span>
            <button
              type="button"
              class="marker-tool-btn"
              title="Xoay 90 độ sang phải (theo chiều kim đồng hồ)"
              @click="transformBaseImage(90)"
            >
              <RotateRightOutlined /> Xoay phải 90°
            </button>
            <button
              type="button"
              class="marker-tool-btn"
              title="Xoay 90 độ sang trái (ngược chiều kim đồng hồ)"
              @click="transformBaseImage(-90)"
            >
              <RotateLeftOutlined /> Xoay trái 90°
            </button>
            <button
              type="button"
              class="marker-tool-btn"
              title="Xoay ngược 180 độ"
              @click="transformBaseImage(180)"
            >
              <SwapOutlined /> Lộn ngược 180°
            </button>
          </div>

          <div class="marker-toolbar-divider"></div>

          <!-- Công cụ Lật ảnh -->
          <div class="marker-tool-group">
            <span class="tool-group-label">Lật ảnh:</span>
            <button
              type="button"
              class="marker-tool-btn"
              title="Lật gương ngang (Flip Horizontal)"
              @click="transformBaseImage('flipX')"
            >
              ↔️ Lật ngang
            </button>
            <button
              type="button"
              class="marker-tool-btn"
              title="Lật gương dọc (Flip Vertical)"
              @click="transformBaseImage('flipY')"
            >
              ↕️ Lật dọc
            </button>
          </div>
        </template>

        <!-- TAB 3: CHỈNH SÁNG & BẢO MẬT -->
        <template v-else-if="activeTab === 'adjust_privacy'">
          <!-- Nhóm thanh trượt Độ sáng & Độ tương phản -->
          <div class="marker-tool-group sliders-group">
            <span class="tool-group-label">Ánh sáng:</span>

            <div class="slider-control-item">
              <span class="slider-label">Độ sáng: {{ Math.round(brightnessVal * 100) }}%</span>
              <input
                type="range"
                min="-0.4"
                max="0.4"
                step="0.05"
                :value="brightnessVal"
                class="marker-slider"
                @input="handleBrightnessChange($event.target.value)"
              />
            </div>

            <div class="slider-control-item">
              <span class="slider-label">Tương phản: {{ Math.round(contrastVal * 100) }}%</span>
              <input
                type="range"
                min="-0.4"
                max="0.4"
                step="0.05"
                :value="contrastVal"
                class="marker-slider"
                @input="handleContrastChange($event.target.value)"
              />
            </div>

            <button
              type="button"
              class="marker-tool-btn"
              title="Đặt lại độ sáng và tương phản về ban đầu"
              @click="resetFilters"
            >
              ↺ Đặt lại sáng
            </button>
          </div>

          <div class="marker-toolbar-divider"></div>

          <!-- Che thông tin bảo mật -->
          <div class="marker-tool-group">
            <span class="tool-group-label">Bảo mật:</span>
            <button
              type="button"
              class="marker-tool-btn redact-blackout-btn"
              title="Tạo khung che đen để giấu số Serial, mã QR, linh kiện độc quyền"
              @click="addRedactBlackout()"
            >
              <EyeInvisibleOutlined /> Che Serial / QR (Blackout)
            </button>
          </div>
        </template>
      </div>

      <!-- Trạng thái hướng dẫn thông minh -->
      <div class="marker-status-bar">
        <div v-if="isCropMode" class="status-selected-info crop-hint">
          <span class="status-badge crop">CHẾ ĐỘ CẮT CÚP</span>
          <span class="status-desc">
            👉 Kéo di chuyển và kéo 8 chốt của khung nét đứt màu vàng để chọn khu vực muốn cắt. Bấm "Xác nhận Cắt" để hoàn tất.
          </span>
        </div>
        <div v-else-if="hasActiveObject" class="status-selected-info">
          <span class="status-badge">Đang chọn: {{ activeObjectDescription }}</span>
          <span class="status-desc">
            Kéo để di chuyển | Kéo 8 chốt để co giãn | Chốt xoay phía trên để quay góc | Bấm Delete để xoá
          </span>
        </div>
        <div v-else class="status-mode-hint">
          <span v-if="currentTool === 'pan'">✋ <b>Chế độ Bàn tay:</b> Nhấn giữ chuột và kéo để trượt xem các góc ảnh khi phóng to.</span>
          <span v-else-if="currentTool === 'select'">👉 Nhấp chọn bất kỳ hình nào để kéo di chuyển, xoay góc hoặc đổi màu sắc/nét vẽ.</span>
          <span v-else-if="currentTool === 'highlighter'">🖍️ <b>Bút dạ quang:</b> Vẽ vệt bán trong suốt làm nổi bật đường mạch/linh kiện mà không che khuất chi tiết.</span>
          <span v-else-if="currentTool === 'text'">👉 Nhấp chuột lên ảnh để chèn chữ. Nhấp đúp vào chữ để sửa nội dung.</span>
          <span v-else-if="currentTool === 'arrow'">👉 Nhấn giữ và kéo để vẽ mũi tên chỉ điểm. Vẽ xong có thể xoay và co giãn tự do.</span>
          <span v-else-if="currentTool === 'pen'">👉 Vẽ nét tự do theo khuyết tật trên ảnh.</span>
          <span v-else>👉 Nhấn giữ và kéo để vẽ khung. Vẽ xong khung có sẵn các chốt điều khiển để bạn chỉnh sửa.</span>
        </div>
      </div>

      <!-- Khu vực vẽ Canvas Fabric.js & Floating Zoom Bar -->
      <div class="marker-canvas-viewport" ref="viewportRef">
        <div v-if="isLoading" class="marker-loading-overlay">
          <LoadingOutlined spin class="loading-icon" />
          <span>Đang nạp ảnh và khởi tạo công cụ QC Studio...</span>
        </div>

        <div class="fabric-canvas-container" :style="containerStyle">
          <canvas ref="canvasEl"></canvas>
        </div>

        <!-- Floating Zoom & Pan Control Bar -->
        <div class="marker-floating-zoom-bar">
          <button
            type="button"
            class="zoom-btn"
            title="Thu nhỏ (-)"
            :disabled="zoomLevel <= 0.5"
            @click="zoomOut"
          >
            <MinusOutlined />
          </button>

          <span class="zoom-value" title="Tỉ lệ phóng to">{{ Math.round(zoomLevel * 100) }}%</span>

          <button
            type="button"
            class="zoom-btn"
            title="Phóng to (+)"
            :disabled="zoomLevel >= 5.0"
            @click="zoomIn"
          >
            <PlusOutlined />
          </button>

          <div class="zoom-divider"></div>

          <button
            type="button"
            class="zoom-btn text"
            title="Khôi phục tỉ lệ 100%"
            @click="resetZoom"
          >
            100%
          </button>

          <button
            type="button"
            class="zoom-btn pan-toggle"
            :class="{ active: currentTool === 'pan' }"
            title="Bật/Tắt Bàn tay kéo ảnh (Pan) khi soi chi tiết linh kiện"
            @click="togglePanMode"
          >
            ✋ Pan
          </button>
        </div>
      </div>

      <!-- Footer điều khiển lưu ảnh -->
      <div class="marker-footer">
        <div class="marker-hints">
          <InfoCircleOutlined />
          <span>QC Studio Pro: Hỗ trợ Cắt cúp, Xoay 90°, Chỉnh sáng, Đánh số lỗi ①②③, Thước đo và Che bảo mật.</span>
        </div>
        <div class="marker-footer-btns">
          <a-button @click="handleClose">Huỷ bỏ</a-button>
          <a-button type="primary" :loading="isExporting" @click="applyAndSave">
            <CheckOutlined /> Áp dụng & Lưu ảnh
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { fabric } from 'fabric'
import {
  RollbackOutlined,
  DeleteOutlined,
  ClearOutlined,
  CheckOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  ScissorOutlined,
  RotateRightOutlined,
  RotateLeftOutlined,
  SwapOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { compressImage } from '../utils/imageCompressor'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  imageUrl: {
    type: String,
    default: '',
  },
  imageName: {
    type: String,
    default: 'annotated_image.jpg',
  },
})

const emit = defineEmits(['update:visible', 'apply'])

// Quản lý Tab ribbon
const activeTab = ref('annotate') // 'annotate' | 'crop_transform' | 'adjust_privacy'

// Cấu hình công cụ & màu sắc
const currentTool = ref('rect') // 'select' | 'rect' | 'circle' | 'arrow' | 'pen' | 'highlighter' | 'text' | 'pan'
const currentColor = ref('#ef4444') // Đỏ cảnh báo mặc định
const currentStroke = ref(4) // 2 | 4 | 6 | 8
const currentFontSize = ref(18) // 14 | 18 | 24 | 32

// Quản lý huy hiệu số thứ tự lỗi
const nextBadgeNumber = ref(1)

// Quản lý Zoom & Pan
const zoomLevel = ref(1)

// Quản lý Crop
const isCropMode = ref(false)
let cropRect = null

// Quản lý bộ lọc ánh sáng
const brightnessVal = ref(0) // -0.4 đến 0.4
const contrastVal = ref(0) // -0.4 đến 0.4

const colorOptions = [
  { label: 'Đỏ cảnh báo', value: '#ef4444' },
  { label: 'Vàng chú ý', value: '#f59e0b' },
  { label: 'Xanh lá đạt', value: '#10b981' },
  { label: 'Xanh dương', value: '#3b82f6' },
  { label: 'Tím nổi bật', value: '#8b5cf6' },
  { label: 'Trắng', value: '#ffffff' },
  { label: 'Đen', value: '#000000' },
]

const strokeOptions = [
  { label: '2px', value: 2 },
  { label: '4px', value: 4 },
  { label: '6px', value: 6 },
  { label: '8px', value: 8 },
]

// Canvas DOM & Dimensions
const canvasEl = ref(null)
const viewportRef = ref(null)
let fabricCanvas = null
let currentNaturalImg = null
const currentImageSource = ref('')

const isLoading = ref(true)
const isExporting = ref(false)

const imgWidth = ref(800)
const imgHeight = ref(600)
const displayWidth = ref(800)
const displayHeight = ref(600)

const containerStyle = computed(() => ({
  width: `${displayWidth.value}px`,
  height: `${displayHeight.value}px`,
}))

// Theo dõi đối tượng đang chọn trên Fabric
const hasActiveObject = ref(false)
const activeObjectDescription = ref('')

// Quản lý lịch sử Undo (Lưu snapshot JSON của canvas)
const history = ref([])
const historyIndex = ref(-1)
let isHistoryAction = false

function switchTab(tab) {
  if (isCropMode.value && tab !== 'crop_transform') {
    cancelCrop()
  }
  activeTab.value = tab
}

function saveHistoryState() {
  if (!fabricCanvas || isHistoryAction || isCropMode.value) return
  const json = JSON.stringify(fabricCanvas.toJSON(['selectable', 'hasControls', 'hasBorders', 'isArrow', 'isBadge', 'isDimension', 'isRedact']))
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(json)
  historyIndex.value = history.value.length - 1
}

function undo() {
  if (historyIndex.value > 0 && fabricCanvas) {
    isHistoryAction = true
    historyIndex.value--
    const state = history.value[historyIndex.value]
    fabricCanvas.loadFromJSON(state, () => {
      fabricCanvas.renderAll()
      isHistoryAction = false
      syncActiveObjectState()
    })
  }
}

function clearAll() {
  if (!fabricCanvas) return
  const objects = fabricCanvas.getObjects()
  while (objects.length > 0) {
    fabricCanvas.remove(objects[0])
  }
  fabricCanvas.discardActiveObject()
  fabricCanvas.renderAll()
  saveHistoryState()
}

function deleteSelected() {
  if (!fabricCanvas) return
  const activeObjects = fabricCanvas.getActiveObjects()
  if (activeObjects && activeObjects.length > 0) {
    activeObjects.forEach((obj) => fabricCanvas.remove(obj))
    fabricCanvas.discardActiveObject()
    fabricCanvas.renderAll()
    saveHistoryState()
    message.info('Đã xoá hình đã chọn')
  }
}

// Chuyển đổi công cụ
function setTool(tool) {
  currentTool.value = tool
  if (!fabricCanvas) return

  if (tool === 'pen') {
    fabricCanvas.isDrawingMode = true
    fabricCanvas.freeDrawingBrush.color = currentColor.value
    fabricCanvas.freeDrawingBrush.width = currentStroke.value
    fabricCanvas.discardActiveObject()
    fabricCanvas.defaultCursor = 'crosshair'
  } else if (tool === 'highlighter') {
    fabricCanvas.isDrawingMode = true
    // Màu dạ quang vàng hoặc theo màu hiện tại với độ trong suốt 0.45
    fabricCanvas.freeDrawingBrush.color = 'rgba(250, 204, 21, 0.48)'
    fabricCanvas.freeDrawingBrush.width = 18
    fabricCanvas.discardActiveObject()
    fabricCanvas.defaultCursor = 'crosshair'
  } else {
    fabricCanvas.isDrawingMode = false
  }

  if (tool === 'select') {
    fabricCanvas.selection = true
    fabricCanvas.defaultCursor = 'default'
    fabricCanvas.forEachObject((obj) => {
      if (!obj.isCropRect) {
        obj.selectable = true
        obj.evented = true
      }
    })
  } else if (tool === 'pan') {
    fabricCanvas.selection = false
    fabricCanvas.defaultCursor = 'grab'
    fabricCanvas.forEachObject((obj) => {
      obj.selectable = false
      obj.evented = false
    })
  } else {
    fabricCanvas.selection = false
    fabricCanvas.defaultCursor = 'crosshair'
  }

  fabricCanvas.renderAll()
}

// Đổi màu sắc
function changeColor(color) {
  currentColor.value = color
  if (!fabricCanvas) return

  if (currentTool.value === 'pen') {
    fabricCanvas.freeDrawingBrush.color = color
  }

  const active = fabricCanvas.getActiveObject()
  if (active) {
    if (active.type === 'i-text' || active.type === 'text') {
      active.set('fill', color)
    } else if (active.type === 'group' && active.isArrow) {
      active.forEachObject((o) => {
        if (o.type === 'line') o.set('stroke', color)
        if (o.type === 'triangle') o.set('fill', color)
      })
    } else if (active.type === 'group' && active.isBadge) {
      const circle = active.item(0)
      if (circle) circle.set('fill', color)
    } else {
      active.set({
        stroke: color,
        fill: color + '20',
      })
    }
    fabricCanvas.renderAll()
    saveHistoryState()
  }
}

// Đổi độ dày nét vẽ (kéo thanh range)
function handleStrokeInput(val) {
  const stroke = parseInt(val, 10) || 1
  changeStroke(stroke)
}

function changeStroke(stroke) {
  currentStroke.value = stroke
  if (!fabricCanvas) return

  if (currentTool.value === 'pen') {
    fabricCanvas.freeDrawingBrush.width = stroke
  }

  const active = fabricCanvas.getActiveObject()
  if (active) {
    if (active.type === 'group' && active.isArrow) {
      active.forEachObject((o) => {
        if (o.type === 'line') o.set('strokeWidth', stroke)
        if (o.type === 'triangle') {
          const sz = Math.max(14, stroke * 3.5)
          o.set({ width: sz, height: sz })
        }
      })
    } else if (active.type === 'group' && active.isDimension) {
      active.forEachObject((o) => {
        if (o.type === 'line') o.set('strokeWidth', stroke)
      })
    } else if (active.type !== 'i-text' && active.type !== 'text') {
      active.set('strokeWidth', stroke)
    }
    fabricCanvas.renderAll()
    saveHistoryState()
  }
}


// Style chuẩn cho đối tượng mới tạo
function applyDefaultStyles(obj) {
  obj.set({
    cornerColor: '#0ea5e9',
    cornerStrokeColor: '#ffffff',
    borderColor: '#0ea5e9',
    cornerSize: 9,
    transparentCorners: false,
    cornerStyle: 'circle',
    padding: 4,
    hasBorders: true,
    hasControls: true,
    selectable: true,
  })
}

// Tạo mũi tên
function createArrow(points, color, strokeWidth) {
  const [x1, y1, x2, y2] = points
  const headSize = Math.max(14, strokeWidth * 3.8)
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90

  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLineCap: 'round',
    originX: 'center',
    originY: 'center',
    selectable: false,
  })

  const triangle = new fabric.Triangle({
    left: x2,
    top: y2,
    originX: 'center',
    originY: 'center',
    angle: angle,
    width: headSize,
    height: headSize,
    fill: color,
    selectable: false,
  })

  const group = new fabric.Group([line, triangle], {
    selectable: true,
    hasControls: true,
    hasBorders: true,
  })
  group.isArrow = true
  applyDefaultStyles(group)
  return group
}

// Thêm Huy hiệu số lỗi ① ② ③...
function addNumberedBadge() {
  if (!fabricCanvas) return
  const num = nextBadgeNumber.value
  const cx = displayWidth.value / 2 + (Math.random() * 60 - 30)
  const cy = displayHeight.value / 2 + (Math.random() * 60 - 30)

  const circle = new fabric.Circle({
    radius: 16,
    fill: currentColor.value,
    stroke: '#ffffff',
    strokeWidth: 2.5,
    originX: 'center',
    originY: 'center',
    shadow: new fabric.Shadow({
      color: 'rgba(0,0,0,0.4)',
      blur: 6,
      offsetX: 2,
      offsetY: 2,
    }),
  })

  const text = new fabric.Text(String(num), {
    fontSize: 16,
    fontWeight: 'bold',
    fill: '#ffffff',
    originX: 'center',
    originY: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  })

  const group = new fabric.Group([circle, text], {
    left: cx,
    top: cy,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
  })
  group.isBadge = true
  group.badgeNum = num
  applyDefaultStyles(group)

  fabricCanvas.add(group)
  fabricCanvas.setActiveObject(group)
  fabricCanvas.renderAll()
  saveHistoryState()

  nextBadgeNumber.value++
  setTool('select')
  message.success(`Đã thêm huy hiệu số lỗi ${num}`)
}

// Thêm Thước đo kích thước lỗi (<-- 0.5mm -->)
function addMeasureCallout() {
  if (!fabricCanvas) return
  const cx = displayWidth.value / 2
  const cy = displayHeight.value / 2
  const len = 120

  const mainLine = new fabric.Line([cx - len / 2, cy, cx + len / 2, cy], {
    stroke: currentColor.value,
    strokeWidth: 2.5,
    selectable: false,
  })

  const tick1 = new fabric.Line([cx - len / 2, cy - 8, cx - len / 2, cy + 8], {
    stroke: currentColor.value,
    strokeWidth: 2.5,
    selectable: false,
  })

  const tick2 = new fabric.Line([cx + len / 2, cy - 8, cx + len / 2, cy + 8], {
    stroke: currentColor.value,
    strokeWidth: 2.5,
    selectable: false,
  })

  const text = new fabric.IText('0.5 mm', {
    left: cx,
    top: cy - 14,
    originX: 'center',
    originY: 'bottom',
    fontSize: 13,
    fontWeight: 'bold',
    fill: '#ffffff',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    padding: 3,
    selectable: false,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  })

  const group = new fabric.Group([mainLine, tick1, tick2, text], {
    left: cx,
    top: cy,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
  })
  group.isDimension = true
  applyDefaultStyles(group)

  fabricCanvas.add(group)
  fabricCanvas.setActiveObject(group)
  fabricCanvas.renderAll()
  saveHistoryState()

  setTool('select')
  message.success('Đã thêm thước đo kích thước (Nhấp đúp vào số đo để sửa số liệu)')
}

// Thêm Icon nhãn dán QC
function addQcIcon(symbol, label, color) {
  if (!fabricCanvas) return
  const cx = displayWidth.value / 2 + (Math.random() * 50 - 25)
  const cy = displayHeight.value / 2 + (Math.random() * 50 - 25)

  const bg = new fabric.Rect({
    width: 86,
    height: 32,
    rx: 6,
    ry: 6,
    fill: color,
    stroke: '#ffffff',
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
    shadow: new fabric.Shadow({
      color: 'rgba(0,0,0,0.35)',
      blur: 6,
      offsetY: 2,
    }),
  })

  const text = new fabric.Text(`${symbol} ${label}`, {
    fontSize: 12,
    fontWeight: 'bold',
    fill: '#ffffff',
    originX: 'center',
    originY: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  })

  const group = new fabric.Group([bg, text], {
    left: cx,
    top: cy,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
  })
  applyDefaultStyles(group)

  fabricCanvas.add(group)
  fabricCanvas.setActiveObject(group)
  fabricCanvas.renderAll()
  saveHistoryState()

  setTool('select')
  message.success(`Đã thêm nhãn QC: ${symbol} ${label}`)
}

// Thêm Khung che đen thông tin nhạy cảm (Redact Blackout)
function addRedactBlackout() {
  if (!fabricCanvas) return
  const cx = displayWidth.value / 2
  const cy = displayHeight.value / 2

  const box = new fabric.Rect({
    width: 170,
    height: 46,
    rx: 4,
    ry: 4,
    fill: '#000000',
    stroke: '#475569',
    strokeWidth: 1.5,
    originX: 'center',
    originY: 'center',
    shadow: new fabric.Shadow({
      color: 'rgba(0,0,0,0.6)',
      blur: 8,
    }),
  })

  const text = new fabric.Text('🔒 CHE BẢO MẬT', {
    fontSize: 11,
    fontWeight: 'bold',
    fill: '#94a3b8',
    originX: 'center',
    originY: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  })

  const group = new fabric.Group([box, text], {
    left: cx,
    top: cy,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
  })
  group.isRedact = true
  applyDefaultStyles(group)

  fabricCanvas.add(group)
  fabricCanvas.setActiveObject(group)
  fabricCanvas.renderAll()
  saveHistoryState()

  setTool('select')
  message.success('Đã tạo khung che đen thông tin bảo mật')
}

// Xử lý Cắt cúp ảnh (Crop)
function startCrop() {
  if (!fabricCanvas) return
  isCropMode.value = true
  fabricCanvas.discardActiveObject()

  const cropW = displayWidth.value * 0.75
  const cropH = displayHeight.value * 0.75
  const cropLeft = (displayWidth.value - cropW) / 2
  const cropTop = (displayHeight.value - cropH) / 2

  cropRect = new fabric.Rect({
    left: cropLeft,
    top: cropTop,
    width: cropW,
    height: cropH,
    fill: 'rgba(0, 0, 0, 0.4)',
    stroke: '#f59e0b',
    strokeWidth: 2.5,
    strokeDashArray: [6, 4],
    cornerColor: '#f59e0b',
    cornerStrokeColor: '#ffffff',
    borderColor: '#f59e0b',
    cornerSize: 11,
    transparentCorners: false,
    cornerStyle: 'rect',
    hasRotatingPoint: false,
    selectable: true,
  })
  cropRect.isCropRect = true

  fabricCanvas.add(cropRect)
  fabricCanvas.setActiveObject(cropRect)
  fabricCanvas.renderAll()
}

function cancelCrop() {
  if (!fabricCanvas) return
  if (cropRect) {
    fabricCanvas.remove(cropRect)
    cropRect = null
  }
  isCropMode.value = false
  fabricCanvas.renderAll()
}

function applyCrop() {
  if (!fabricCanvas || !cropRect || !currentNaturalImg) return

  const rect = cropRect.getBoundingRect(true, true)
  fabricCanvas.remove(cropRect)
  cropRect = null
  isCropMode.value = false

  const scaleX = currentNaturalImg.naturalWidth / displayWidth.value
  const scaleY = currentNaturalImg.naturalHeight / displayHeight.value

  const cropX = Math.max(0, rect.left * scaleX)
  const cropY = Math.max(0, rect.top * scaleY)
  const cropW = Math.min(currentNaturalImg.naturalWidth - cropX, rect.width * scaleX)
  const cropH = Math.min(currentNaturalImg.naturalHeight - cropY, rect.height * scaleY)

  if (cropW < 20 || cropH < 20) {
    message.warning('Vùng cắt quá nhỏ, vui lòng chọn lại')
    return
  }

  const offCanvas = document.createElement('canvas')
  offCanvas.width = cropW
  offCanvas.height = cropH
  const ctx = offCanvas.getContext('2d')
  ctx.drawImage(currentNaturalImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  const croppedDataUrl = offCanvas.toDataURL('image/jpeg', 0.95)
  currentImageSource.value = croppedDataUrl
  reloadCanvasWithImage(croppedDataUrl)
  message.success('Đã cắt cúp ảnh thành công!')
}

// Xoay 90° và Lật ảnh
function transformBaseImage(type) {
  if (!currentNaturalImg) return
  const offCanvas = document.createElement('canvas')
  const ctx = offCanvas.getContext('2d')
  const w = currentNaturalImg.naturalWidth || currentNaturalImg.width
  const h = currentNaturalImg.naturalHeight || currentNaturalImg.height

  if (type === 90 || type === -90) {
    offCanvas.width = h
    offCanvas.height = w
    ctx.translate(h / 2, w / 2)
    ctx.rotate((type * Math.PI) / 180)
    ctx.drawImage(currentNaturalImg, -w / 2, -h / 2)
  } else if (type === 180) {
    offCanvas.width = w
    offCanvas.height = h
    ctx.translate(w / 2, h / 2)
    ctx.rotate(Math.PI)
    ctx.drawImage(currentNaturalImg, -w / 2, -h / 2)
  } else if (type === 'flipX') {
    offCanvas.width = w
    offCanvas.height = h
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(currentNaturalImg, 0, 0)
  } else if (type === 'flipY') {
    offCanvas.width = w
    offCanvas.height = h
    ctx.translate(0, h)
    ctx.scale(1, -1)
    ctx.drawImage(currentNaturalImg, 0, 0)
  }

  const transformedUrl = offCanvas.toDataURL('image/jpeg', 0.95)
  currentImageSource.value = transformedUrl
  reloadCanvasWithImage(transformedUrl)
  message.success('Đã biến đổi ảnh thành công!')
}

// Xử lý bộ lọc Ánh sáng (Brightness & Contrast)
function handleBrightnessChange(val) {
  brightnessVal.value = parseFloat(val)
  applyImageFilters()
}

function handleContrastChange(val) {
  contrastVal.value = parseFloat(val)
  applyImageFilters()
}

function applyImageFilters() {
  if (!fabricCanvas) return
  const bgImg = fabricCanvas.backgroundImage
  if (!bgImg) return

  bgImg.filters = []
  if (brightnessVal.value !== 0) {
    bgImg.filters.push(new fabric.Image.filters.Brightness({ brightness: brightnessVal.value }))
  }
  if (contrastVal.value !== 0) {
    bgImg.filters.push(new fabric.Image.filters.Contrast({ contrast: contrastVal.value }))
  }

  bgImg.applyFilters()
  fabricCanvas.renderAll()
}

function resetFilters() {
  brightnessVal.value = 0
  contrastVal.value = 0
  applyImageFilters()
  message.info('Đã đặt lại độ sáng & tương phản về chuẩn')
}

// Xử lý Zoom & Pan
function setZoom(val) {
  if (!fabricCanvas) return
  const z = Math.max(0.5, Math.min(5.0, val))
  zoomLevel.value = Math.round(z * 100) / 100

  const center = { x: displayWidth.value / 2, y: displayHeight.value / 2 }
  fabricCanvas.zoomToPoint(center, z)
  fabricCanvas.renderAll()
}

function zoomIn() {
  setZoom(zoomLevel.value + 0.25)
}

function zoomOut() {
  setZoom(zoomLevel.value - 0.25)
}

function resetZoom() {
  if (!fabricCanvas) return
  zoomLevel.value = 1
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
  fabricCanvas.renderAll()
}

function togglePanMode() {
  if (currentTool.value === 'pan') {
    setTool('select')
  } else {
    setTool('pan')
  }
}

// Đồng bộ trạng thái khi click chọn đối tượng trên canvas
function syncActiveObjectState() {
  if (!fabricCanvas) return
  const active = fabricCanvas.getActiveObject()
  if (active && !active.isCropRect) {
    hasActiveObject.value = true
    const type = active.type
    if (active.isArrow) {
      activeObjectDescription.value = 'Mũi tên'
    } else if (active.isBadge) {
      activeObjectDescription.value = `Huy hiệu số lỗi (${active.badgeNum || 'QC'})`
    } else if (active.isDimension) {
      activeObjectDescription.value = 'Thước đo kích thước'
    } else if (active.isRedact) {
      activeObjectDescription.value = 'Khung che bảo mật'
    } else if (type === 'rect') {
      activeObjectDescription.value = 'Khung vuông'
    } else if (type === 'circle') {
      activeObjectDescription.value = 'Hình tròn'
    } else if (type === 'i-text' || type === 'text') {
      activeObjectDescription.value = 'Ghi chú chữ'
    } else if (type === 'path') {
      activeObjectDescription.value = 'Nét vẽ tự do'
    } else {
      activeObjectDescription.value = 'Hình vẽ QC'
    }

    if (active.stroke) currentColor.value = active.stroke
    if (active.fill && (active.type === 'i-text' || active.type === 'text')) currentColor.value = active.fill

    if (active.isArrow && active.forEachObject) {
      active.forEachObject((o) => {
        if (o.type === 'line' && o.strokeWidth) currentStroke.value = Math.round(o.strokeWidth)
      })
    } else if (active.strokeWidth) {
      currentStroke.value = Math.round(active.strokeWidth)
    }
  } else {
    hasActiveObject.value = false
    activeObjectDescription.value = ''
  }
}

// Tải lại Canvas với ảnh mới (dùng sau Crop, Xoay hoặc lật)
function reloadCanvasWithImage(imgSrc) {
  if (!fabricCanvas) return
  isLoading.value = true

  const imgObj = new Image()
  imgObj.crossOrigin = 'anonymous'
  imgObj.onload = () => {
    currentNaturalImg = imgObj
    imgWidth.value = imgObj.naturalWidth || imgObj.width
    imgHeight.value = imgObj.naturalHeight || imgObj.height

    const maxW = viewportRef.value && viewportRef.value.clientWidth > 300
      ? Math.floor(viewportRef.value.clientWidth - 24)
      : 980
    const maxH = 540
    let w = imgWidth.value
    let h = imgHeight.value
    const ratio = w / h
    if (w > maxW) {
      w = maxW
      h = Math.round(w / ratio)
    }
    if (h > maxH) {
      h = maxH
      w = Math.round(h * ratio)
    }

    displayWidth.value = w
    displayHeight.value = h

    fabricCanvas.setWidth(w)
    fabricCanvas.setHeight(h)

    fabric.Image.fromURL(
      imgSrc,
      (bgImg) => {
        bgImg.scaleToWidth(w)
        bgImg.scaleToHeight(h)
        fabricCanvas.setBackgroundImage(bgImg, () => {
          applyImageFilters()
          resetZoom()
          isLoading.value = false
          saveHistoryState()
        })
      },
      { crossOrigin: 'anonymous' }
    )
  }

  imgObj.onerror = () => {
    isLoading.value = false
    message.error('Không thể nạp ảnh đã chỉnh sửa')
  }

  imgObj.src = imgSrc
}

// Khởi tạo Fabric Canvas ban đầu
function initFabricCanvas() {
  if (!canvasEl.value || !props.imageUrl) return
  isLoading.value = true
  history.value = []
  historyIndex.value = -1
  nextBadgeNumber.value = 1
  brightnessVal.value = 0
  contrastVal.value = 0
  zoomLevel.value = 1
  isCropMode.value = false
  cropRect = null
  currentImageSource.value = props.imageUrl

  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }

  const imgObj = new Image()
  imgObj.crossOrigin = 'anonymous'
  imgObj.onload = () => {
    currentNaturalImg = imgObj
    imgWidth.value = imgObj.naturalWidth || imgObj.width
    imgHeight.value = imgObj.naturalHeight || imgObj.height

    const maxW = viewportRef.value && viewportRef.value.clientWidth > 300
      ? Math.floor(viewportRef.value.clientWidth - 24)
      : 980
    const maxH = 540
    let w = imgWidth.value
    let h = imgHeight.value
    const ratio = w / h
    if (w > maxW) {
      w = maxW
      h = Math.round(w / ratio)
    }
    if (h > maxH) {
      h = maxH
      w = Math.round(h * ratio)
    }

    displayWidth.value = w
    displayHeight.value = h

    nextTick(() => {
      fabricCanvas = new fabric.Canvas(canvasEl.value, {
        width: w,
        height: h,
        selection: true,
        preserveObjectStacking: true,
      })

      fabric.Image.fromURL(
        props.imageUrl,
        (bgImg) => {
          bgImg.scaleToWidth(w)
          bgImg.scaleToHeight(h)
          fabricCanvas.setBackgroundImage(bgImg, fabricCanvas.renderAll.bind(fabricCanvas))
          isLoading.value = false
          saveHistoryState()
          setupDrawingInteractions()
        },
        { crossOrigin: 'anonymous' }
      )
    })
  }

  imgObj.onerror = () => {
    isLoading.value = false
    message.error('Không thể tải ảnh vào trình biên tập QC Studio')
  }

  imgObj.src = props.imageUrl
}

// Cài đặt tương tác chuột vẽ & Pan
function setupDrawingInteractions() {
  if (!fabricCanvas) return

  let isMouseDown = false
  let isDraggingPan = false
  let lastPosX = 0
  let lastPosY = 0
  let origX = 0
  let origY = 0
  let activeShape = null

  // Hỗ trợ cuộn chuột phóng to / thu nhỏ cực nhạy
  fabricCanvas.on('mouse:wheel', (opt) => {
    const delta = opt.e.deltaY
    let zoom = fabricCanvas.getZoom()
    zoom *= 0.999 ** delta
    if (zoom > 5) zoom = 5
    if (zoom < 0.5) zoom = 0.5
    fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)
    opt.e.preventDefault()
    opt.e.stopPropagation()
    zoomLevel.value = Math.round(zoom * 100) / 100
  })

  fabricCanvas.on('mouse:down', (o) => {
    // Nếu đang ở chế độ Bàn tay kéo (Pan)
    if (currentTool.value === 'pan') {
      isDraggingPan = true
      lastPosX = o.e.clientX
      lastPosY = o.e.clientY
      fabricCanvas.defaultCursor = 'grabbing'
      return
    }

    // Nếu đang cắt ảnh hoặc vẽ tự do hoặc select thì không vẽ hình khối
    if (isCropMode.value || currentTool.value === 'select' || currentTool.value === 'pen' || currentTool.value === 'highlighter') return

    // Nếu click vào object có sẵn
    if (o.target) return

    isMouseDown = true
    const pointer = fabricCanvas.getPointer(o.e)
    origX = pointer.x
    origY = pointer.y

    if (currentTool.value === 'rect') {
      activeShape = new fabric.Rect({
        left: origX,
        top: origY,
        originX: 'left',
        originY: 'top',
        width: 0,
        height: 0,
        fill: currentColor.value + '20',
        stroke: currentColor.value,
        strokeWidth: currentStroke.value,
      })
      applyDefaultStyles(activeShape)
      fabricCanvas.add(activeShape)
    } else if (currentTool.value === 'circle') {
      activeShape = new fabric.Circle({
        left: origX,
        top: origY,
        originX: 'left',
        originY: 'top',
        radius: 0,
        fill: currentColor.value + '20',
        stroke: currentColor.value,
        strokeWidth: currentStroke.value,
      })
      applyDefaultStyles(activeShape)
      fabricCanvas.add(activeShape)
    } else if (currentTool.value === 'arrow') {
      activeShape = new fabric.Line([origX, origY, origX, origY], {
        stroke: currentColor.value,
        strokeWidth: currentStroke.value,
        selectable: false,
      })
      fabricCanvas.add(activeShape)
    } else if (currentTool.value === 'text') {
      isMouseDown = false
      const text = new fabric.IText('Ghi chú lỗi...', {
        left: origX,
        top: origY,
        fill: currentColor.value,
        fontSize: currentFontSize.value,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontWeight: 'bold',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: 6,
      })
      applyDefaultStyles(text)
      fabricCanvas.add(text)
      fabricCanvas.setActiveObject(text)
      text.enterEditing()
      text.selectAll()
      fabricCanvas.renderAll()
      saveHistoryState()
      setTool('select')
    }
  })

  fabricCanvas.on('mouse:move', (o) => {
    if (isDraggingPan && currentTool.value === 'pan') {
      const deltaX = o.e.clientX - lastPosX
      const deltaY = o.e.clientY - lastPosY
      fabricCanvas.relativePan(new fabric.Point(deltaX, deltaY))
      lastPosX = o.e.clientX
      lastPosY = o.e.clientY
      return
    }

    if (!isMouseDown || !activeShape) return
    const pointer = fabricCanvas.getPointer(o.e)

    if (currentTool.value === 'rect') {
      const w = Math.abs(origX - pointer.x)
      const h = Math.abs(origY - pointer.y)
      activeShape.set({
        left: Math.min(origX, pointer.x),
        top: Math.min(origY, pointer.y),
        width: w,
        height: h,
      })
    } else if (currentTool.value === 'circle') {
      const rx = Math.abs(origX - pointer.x) / 2
      const ry = Math.abs(origY - pointer.y) / 2
      const radius = Math.max(rx, ry)
      activeShape.set({
        left: Math.min(origX, pointer.x),
        top: Math.min(origY, pointer.y),
        radius: radius,
      })
    } else if (currentTool.value === 'arrow') {
      activeShape.set({
        x2: pointer.x,
        y2: pointer.y,
      })
    }

    fabricCanvas.renderAll()
  })

  fabricCanvas.on('mouse:up', (o) => {
    if (isDraggingPan) {
      isDraggingPan = false
      fabricCanvas.defaultCursor = 'grab'
      return
    }

    if (!isMouseDown) return
    isMouseDown = false

    if (currentTool.value === 'arrow' && activeShape) {
      const pointer = fabricCanvas.getPointer(o.e)
      fabricCanvas.remove(activeShape)
      const dist = Math.hypot(pointer.x - origX, pointer.y - origY)
      if (dist > 10) {
        const arrow = createArrow([origX, origY, pointer.x, pointer.y], currentColor.value, currentStroke.value)
        fabricCanvas.add(arrow)
        fabricCanvas.setActiveObject(arrow)
      }
      activeShape = null
    } else if (activeShape) {
      if (activeShape.width < 5 && activeShape.height < 5 && activeShape.radius < 5) {
        fabricCanvas.remove(activeShape)
      } else {
        fabricCanvas.setActiveObject(activeShape)
      }
      activeShape = null
    }

    fabricCanvas.renderAll()
    saveHistoryState()
    setTool('select')
  })

  fabricCanvas.on('selection:created', syncActiveObjectState)
  fabricCanvas.on('selection:updated', syncActiveObjectState)
  fabricCanvas.on('selection:cleared', syncActiveObjectState)

  fabricCanvas.on('path:created', () => {
    saveHistoryState()
  })

  fabricCanvas.on('object:modified', () => {
    saveHistoryState()
  })
}

// Xuất ảnh độ phân giải gốc và nén tối ưu
async function applyAndSave() {
  if (!fabricCanvas) return
  isExporting.value = true

  try {
    if (isCropMode.value) {
      cancelCrop()
    }

    // Tạm thời khôi phục viewport transform về gốc (100% không pan) để chụp toàn bộ ảnh
    const currentVpt = fabricCanvas.viewportTransform
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    fabricCanvas.discardActiveObject()
    fabricCanvas.renderAll()

    const multiplier = imgWidth.value / displayWidth.value

    const dataUrl = fabricCanvas.toDataURL({
      format: 'jpeg',
      quality: 0.92,
      multiplier: multiplier,
    })

    // Khôi phục lại viewport cho người dùng
    fabricCanvas.setViewportTransform(currentVpt)
    fabricCanvas.renderAll()

    const res = await fetch(dataUrl)
    const blob = await res.blob()

    const newFileName = props.imageName.replace(/\.[^.]+$/, '') + '_marked.jpg'
    const newRawFile = new File([blob], newFileName, { type: 'image/jpeg' })

    const compressed = await compressImage(newRawFile, 1080, 1080, 0.72)

    const finalFile = compressed.file
    const finalBase64 = compressed.base64
    const finalPreviewUrl = URL.createObjectURL(finalFile)

    message.success('Đã hoàn tất chỉnh sửa & lưu ảnh thành công!')
    emit('apply', {
      file: finalFile,
      base64: finalBase64,
      previewUrl: finalPreviewUrl,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      name: newFileName,
    })
    handleClose()
  } catch (err) {
    console.error('Lỗi khi xuất ảnh Fabric.js:', err)
    message.error('Lỗi khi lưu ảnh: ' + (err.message || ''))
  } finally {
    isExporting.value = false
  }
}

function handleClose() {
  if (fabricCanvas) {
    fabricCanvas.discardActiveObject()
  }
  emit('update:visible', false)
}

function handleKeyDown(e) {
  if (!props.visible) return

  const active = fabricCanvas?.getActiveObject()
  if (active && active.isEditing) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelected()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    undo()
  } else if (e.key === 'Escape') {
    handleClose()
  }
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        initFabricCanvas()
      })
      window.addEventListener('keydown', handleKeyDown)
    } else {
      if (fabricCanvas) {
        fabricCanvas.dispose()
        fabricCanvas = null
      }
      window.removeEventListener('keydown', handleKeyDown)
    }
  }
)

onUnmounted(() => {
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

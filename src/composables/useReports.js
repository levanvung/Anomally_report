import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage, isFirebaseConfigured, isStorageEnabled } from '../firebase/config.js'
import { useAuth } from './useAuth.js'
import { useI18n } from './useI18n.js'
import { compressImage, formatFileSize } from '../utils/imageCompressor.js'

export { formatFileSize }

const LOCAL_STORAGE_KEY = 'sentinel_reports_manufacturing_v3'

export function calculateDefectRate(defectQty, totalQty) {
  const d = Number(defectQty) || 0
  const q = Number(totalQty) || 0
  if (q <= 0) return '0.00%'
  return ((d / q) * 100).toFixed(2) + '%'
}

export function getDefectRateLevel(rateStrOrNum) {
  const rate = typeof rateStrOrNum === 'string' ? parseFloat(rateStrOrNum) : (Number(rateStrOrNum) || 0)
  if (rate >= 10) return { label: 'Rất cao (>10%)', severity: 'critical', color: 'var(--critical)', bg: 'var(--critical-bg)' }
  if (rate >= 5) return { label: 'Cao (>5%)', severity: 'high', color: 'var(--high)', bg: 'var(--high-bg)' }
  if (rate >= 1) return { label: 'Cần lưu ý', severity: 'medium', color: 'var(--medium)', bg: 'var(--medium-bg)' }
  return { label: 'Ổn định (<1%)', severity: 'low', color: 'var(--low)', bg: 'var(--low-bg)' }
}

const initialReports = [
  {
    id: 'ANOM-2401',
    date: '2026-09-18',
    process: 'SMT',
    productModel: 'MDL-PRO-X1',
    machine: 'SMT-LINE-01',
    quantity: 1200,
    defectQuantity: 48,
    defectRate: '4.00%',
    responsiblePerson: 'Phan Đình Tuấn (Trưởng ca 1)',
    assignee: 'Lê Hoàng (Kỹ sư QA)',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    imagePath: '',
    defectDescription: 'Chân hàn chip IC U12 bị dính thiếc ngắn mạch (Solder bridge), lệch vị trí đặt 0.2mm trên bo mạch chính.',
    progressNote: 'Đã tạm dừng chuyền 15 phút để vệ sinh đầu hút mounter, căn chỉnh camera quang học và test lại mẻ 50 pcs đạt chuẩn.',
    creator: 'Nguyễn Minh (QC Leader)',
    status: 'investigating',
    severity: 'high',
    createdAt: '18/09/2026',
  },
  {
    id: 'ANOM-2402',
    date: '2026-09-18',
    process: 'Đúc ép nhựa',
    productModel: 'SAM-S24-FRAME',
    machine: 'INJ-MOLD-04',
    quantity: 2500,
    defectQuantity: 12,
    defectRate: '0.48%',
    responsiblePerson: 'Vũ Văn Hùng (Quản lý Line)',
    assignee: 'Trần An (Kỹ thuật Khuôn)',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    imagePath: '',
    defectDescription: 'Bề mặt vỏ khung có vệt bọt khí li ti và đường hàn nhựa (weld line) rõ nét ở góc cạnh trên.',
    progressNote: 'Tăng nhiệt độ lòng khuôn thêm 4°C và hiệu chỉnh áp lực nạp keo. Kiểm tra 100 sản phẩm tiếp theo không còn lỗi.',
    creator: 'Lê Hoàng (QA)',
    status: 'resolved',
    severity: 'low',
    createdAt: '18/09/2026',
  },
  {
    id: 'ANOM-2403',
    date: '2026-09-17',
    process: 'Lắp ráp',
    productModel: 'PCB-MAIN-V2',
    machine: 'ASSY-CELL-02',
    quantity: 850,
    defectQuantity: 65,
    defectRate: '7.65%',
    responsiblePerson: 'Nguyễn Hải Đăng (Trưởng xưởng)',
    assignee: 'Phạm Linh (Chuyên viên QC)',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    imagePath: '',
    defectDescription: 'Lực siết ốc vít mặt đáy không đạt tiêu chuẩn 1.8 N.m dẫn đến lỏng khung gá và kẹt nút bấm bên hông.',
    progressNote: 'Đã thay mới đầu tuốc-nơ-vít điện tự ngắt lực và tái đào tạo thao tác công nhân ca 2 trước giờ bàn giao ca.',
    creator: 'Trần An (PE)',
    status: 'investigating',
    severity: 'high',
    createdAt: '17/09/2026',
  },
  {
    id: 'ANOM-2404',
    date: '2026-09-17',
    process: 'Hàn bo mạch',
    productModel: 'SMART-MTR-09',
    machine: 'WELD-BOT-05',
    quantity: 3200,
    defectQuantity: 8,
    defectRate: '0.25%',
    responsiblePerson: 'Trần Văn Bảo (Tổ trưởng Hàn)',
    assignee: 'Nguyễn Minh (Kỹ sư Quá trình)',
    imageUrl: '',
    imagePath: '',
    defectDescription: 'Mối hàn robot xuất hiện bọt khí vi mô và thiếu ngấu nhẹ ở cực âm tụ điện nguồn C4.',
    progressNote: 'Đã bổ sung dung môi trợ hàn (Flux) và làm sạch mũi hàn robot. Tỷ lệ lỗi giảm về ngưỡng kiểm soát an toàn.',
    creator: 'Vũ Hải (Kỹ thuật viên)',
    status: 'resolved',
    severity: 'low',
    createdAt: '17/09/2026',
  },
  {
    id: 'ANOM-2405',
    date: '2026-09-16',
    process: 'Gia công CNC',
    productModel: 'CAM-LENS-F4',
    machine: 'CNC-MILL-03',
    quantity: 1500,
    defectQuantity: 115,
    defectRate: '7.67%',
    responsiblePerson: 'Hoàng Minh Tâm (Trưởng nhóm CNC)',
    assignee: 'Đỗ Vân (Kỹ sư Cơ khí)',
    imageUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
    imagePath: '',
    defectDescription: 'Độ sâu rãnh ren vượt quá dung sai cho phép ±0.03mm do mòn dao phay carbide sau chu kỳ 1200 sản phẩm.',
    progressNote: 'Đã tiến hành lập biên bản thu hồi cách ly lô 115 pcs lỗi, thay dao phay mới và cập nhật quy trình thay dao sớm ở mốc 1000 pcs.',
    creator: 'Lê Hoàng (QA)',
    status: 'open',
    severity: 'critical',
    createdAt: '16/09/2026',
  },
  {
    id: 'ANOM-2406',
    date: '2026-09-16',
    process: 'Sơn bề mặt',
    productModel: 'AUTO-ECU-200',
    machine: 'PAINT-LINE-01',
    quantity: 600,
    defectQuantity: 3,
    defectRate: '0.50%',
    responsiblePerson: 'Đỗ Kim Oanh (Tổ trưởng Sơn)',
    assignee: 'Vũ Hải (Kỹ thuật Sơn)',
    imageUrl: '',
    imagePath: '',
    defectDescription: 'Bụi sơn bám bề mặt nắp che nhôm ở góc dưới mẻ sơn số 14.',
    progressNote: 'Đã thay màng lọc phòng sơn tĩnh điện và vệ sinh sàn khử bụi ca sáng.',
    creator: 'Đỗ Vân (QC)',
    status: 'closed',
    severity: 'low',
    createdAt: '16/09/2026',
  },
  {
    id: 'ANOM-2407',
    date: '2026-09-15',
    process: 'Kiểm tra FQC',
    productModel: 'ROBOT-ARM-C1',
    machine: 'FQC-STATION-01',
    quantity: 2000,
    defectQuantity: 30,
    defectRate: '1.50%',
    responsiblePerson: 'Bùi Thanh Tùng (Trưởng phòng QC)',
    assignee: 'Phan Anh (Giám sát QC)',
    imageUrl: '',
    imagePath: '',
    defectDescription: 'Kiểm tra chức năng giao tiếp CAN-Bus không phản hồi trên 30 thiết bị kiểm thử cuối chuyền.',
    progressNote: 'Nguyên nhân do lỗi nạp firmware phiên bản v1.2.0 chưa hoàn tất verify checksum. Đã flash lại firmware v1.2.1.',
    creator: 'Bùi Thanh Tùng (QC)',
    status: 'resolved',
    severity: 'medium',
    createdAt: '15/09/2026',
  },
  {
    id: 'ANOM-2408',
    date: '2026-09-15',
    process: 'Đóng gói',
    productModel: 'BOX-POWER-500',
    machine: 'PACK-LINE-03',
    quantity: 4500,
    defectQuantity: 9,
    defectRate: '0.20%',
    responsiblePerson: 'Lưu Gia Huy (Quản lý Đóng gói)',
    assignee: 'Đinh Nam (Kỹ thuật viên QC)',
    imageUrl: '',
    imagePath: '',
    defectDescription: 'Tem nhãn mã vạch QR in bị mờ nét, máy quét laser trượt nhận diện ở 9 hộp carton.',
    progressNote: 'Đã thay ruy-băng mực in máy dán nhãn Zebra và vệ sinh đầu in nhiệt.',
    creator: 'Lưu Gia Huy',
    status: 'closed',
    severity: 'low',
    createdAt: '15/09/2026',
  },
]

function loadLocalReports() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (data !== null) {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Fallback
    }
  }
  // Chỉ nạp dữ liệu mẫu ban đầu nếu hệ thống chưa từng khởi tạo
  if (!localStorage.getItem('sentinel_initialized_flag')) {
    localStorage.setItem('sentinel_initialized_flag', 'true')
    saveLocalReports(initialReports)
    return initialReports
  }
  return []
}

function saveLocalReports(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('localStorage vượt hạn mức (QuotaExceeded), tự động tối ưu ảnh:', err)
    try {
      // Giữ lại 1 ảnh đầu tiên cho mỗi báo cáo để luôn vừa vặn 5MB của localStorage
      const compact = data.map((r) => ({
        ...r,
        images: r.images && r.images.length > 0 ? [{ id: r.images[0].id, url: r.images[0].url, name: r.images[0].name }] : [],
      }))
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(compact))
    } catch (e2) {
      console.error('Không thể lưu localStorage fallback:', e2)
    }
  }
}

const reports = ref(loadLocalReports())
const isFirestoreLoading = ref(false)
const isImportingReports = ref(false)

// Khởi tạo Firestore realtime listener kết nối dữ liệu thật
if (isFirebaseConfigured && db) {
  isFirestoreLoading.value = true
  try {
    const colRef = collection(db, 'manufacturing_reports')
    onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          // Sắp xếp báo cáo mới nhất lên đầu (theo timestamp hoặc date)
          list.sort((a, b) => {
            const timeA = a.createdAtTimestamp?.toMillis ? a.createdAtTimestamp.toMillis() : new Date(a.date || a.createdAt || 0).getTime()
            const timeB = b.createdAtTimestamp?.toMillis ? b.createdAtTimestamp.toMillis() : new Date(b.date || b.createdAt || 0).getTime()
            return timeB - timeA
          })
          reports.value = list
          saveLocalReports(list)
        } else {
          // Khi người dùng đã xoá toàn bộ báo cáo, giữ trạng thái rỗng, KHÔNG tự động tạo lại
          reports.value = []
          saveLocalReports([])
        }
        isFirestoreLoading.value = false
      },
      (error) => {
        console.warn('Firestore realtime error, fallback to local:', error)
        reports.value = loadLocalReports()
        isFirestoreLoading.value = false
      }
    )
  } catch (err) {
    console.warn('Failed to attach Firestore listener:', err)
    reports.value = loadLocalReports()
    isFirestoreLoading.value = false
  }
}

async function seedInitialFirestoreData() {
  // Hoàn toàn vô hiệu hoá tự động nạp lại mẫu khi xoá hết
  return
}

const severityClass = (severity) => `severity-${severity}`
const statusClass = (status) => `status-${status}`

// Helper chuẩn hoá chuỗi ngày tháng an toàn theo múi giờ địa phương (tránh lỗi lệch ngày UTC)
export function normalizeToDateString(val) {
  if (!val) return ''
  // Hỗ trợ Dayjs hoặc Moment object
  if (typeof val === 'object' && typeof val.format === 'function') {
    return val.format('YYYY-MM-DD')
  }
  // Hỗ trợ Firestore Timestamp (có phương thức toDate)
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    const d = val.toDate()
    if (d instanceof Date && !isNaN(d.getTime())) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
  // Hỗ trợ đối tượng Date chuẩn JavaScript
  if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear()
    const month = String(val.getMonth() + 1).padStart(2, '0')
    const day = String(val.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10)
  }
  const parts = str.split(/[\/\-]/)
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return ''
}

// Kiểm tra xem ngày của báo cáo có nằm trong khoảng ngày được lọc hay không
export function isDateInRange(reportDateVal, range) {
  if (!range) return true
  let start = ''
  let end = ''
  if (Array.isArray(range)) {
    if (range.length === 0) return true
    if (range[0]) start = normalizeToDateString(range[0])
    if (range[1]) end = normalizeToDateString(range[1])
  } else if (typeof range === 'string' || (range && typeof range.format === 'function')) {
    start = normalizeToDateString(range)
    end = start
  }

  if (!start && !end) return true

  const rDate = normalizeToDateString(reportDateVal)
  if (!rDate) return false

  if (start && end) {
    const minD = start <= end ? start : end
    const maxD = start <= end ? end : start
    return rDate >= minD && rDate <= maxD
  }
  if (start) return rDate >= start
  if (end) return rDate <= end
  return true
}

export const commonProcesses = [
  'SMT',
  'AI',
  'DIP',
  'AVR',
]

// Trích xuất danh sách tất cả ảnh của báo cáo một cách an toàn và tương thích ngược
export function getReportImages(report) {
  if (!report) return []
  if (Array.isArray(report.images) && report.images.length > 0) {
    return report.images
      .map((img, idx) => {
        if (typeof img === 'string') {
          return { url: img, path: '', name: `Ảnh ${idx + 1}` }
        }
        return {
          url: img.url || '',
          path: img.path || '',
          name: img.name || `Ảnh ${idx + 1}`,
        }
      })
      .filter((img) => Boolean(img.url))
  }
  if (report.imageUrl) {
    return [{ url: report.imageUrl, path: report.imagePath || '', name: 'Ảnh đính kèm' }]
  }
  return []
}

export function getPrimaryReportImage(report) {
  if (!report) return ''
  if (Array.isArray(report.images) && report.images.length > 0) {
    const firstImage = report.images[0]
    return typeof firstImage === 'string' ? firstImage : (firstImage?.url || '')
  }
  return report.imageUrl || ''
}

export function getReportImageCount(report) {
  if (!report) return 0
  if (Array.isArray(report.images) && report.images.length > 0) {
    return report.images.filter((image) => typeof image === 'string' ? Boolean(image) : Boolean(image?.url)).length
  }
  return report.imageUrl ? 1 : 0
}

export function useReports() {
  const { user } = useAuth()
  const { t, severityLabels, statusLabels, categoryOptions } = useI18n()

  const searchText = ref('')
  const statusFilter = ref('all')
  const severityFilter = ref('all')
  const processFilter = ref('all')
  const dateRange = ref(null)
  const activeStat = ref('all')
  const currentPage = ref(1)
  const pageSize = 8

  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const isSaving = ref(false)

  const showDeleteModal = ref(false)
  const reportToDelete = ref(null)
  const isDeleting = ref(false)

  const isDetailOpen = ref(false)
  const selectedReport = ref(null)

  // Quản lý nhiều ảnh: Ảnh đã có sẵn từ trước + Ảnh mới chọn chờ upload
  const existingImages = ref([]) // [{ url, path, name }]
  const selectedFiles = ref([]) // [{ file, originalFile, previewUrl, name, originalSize, compressedSize, savings, isCompressing, id }]
  const totalImagesCount = computed(() => existingImages.value.length + selectedFiles.value.length)

  // Thống kê nén ảnh tự động cho các ảnh mới chọn
  const compressionSummary = computed(() => {
    if (selectedFiles.value.length === 0) return null
    let totalOrig = 0
    let totalComp = 0
    let isCompressingAny = false
    for (const item of selectedFiles.value) {
      totalOrig += item.originalSize || 0
      totalComp += item.compressedSize || 0
      if (item.isCompressing) isCompressingAny = true
    }
    const saved = Math.max(0, totalOrig - totalComp)
    const ratio = totalOrig > 0 ? Math.round((saved / totalOrig) * 100) : 0
    return {
      count: selectedFiles.value.length,
      totalOrig,
      totalComp,
      saved,
      ratio,
      isCompressingAny,
      formattedOrig: formatFileSize(totalOrig),
      formattedComp: formatFileSize(totalComp),
      formattedSaved: formatFileSize(saved),
    }
  })

  // Backward compatibility refs
  const selectedImageFile = ref(null)
  const imagePreviewUrl = ref('')

  const emptyForm = () => {
    const today = new Date().toISOString().split('T')[0]
    return {
      date: today,
      process: 'SMT',
      productModel: '',
      machine: '',
      quantity: 1000,
      defectQuantity: 0,
      defectRate: '0.00%',
      responsiblePerson: 'Phan Đình Tuấn (Trưởng ca 1)',
      assignee: user.value ? (user.value.displayName || user.value.email) : 'Lê Hoàng (Kỹ sư QA)',
      defectDescription: '',
      progressNote: '',
      creator: user.value ? (user.value.displayName || user.value.email) : 'Admin',
      status: 'open',
      severity: 'low',
      images: [],
      imageUrl: '',
      imagePath: '',
    }
  }

  const form = reactive(emptyForm())

  function onQuantityOrDefectChange() {
    form.defectRate = calculateDefectRate(form.defectQuantity, form.quantity)
    const rateVal = parseFloat(form.defectRate) || 0
    if (rateVal >= 10) form.severity = 'critical'
    else if (rateVal >= 5) form.severity = 'high'
    else if (rateVal >= 1) form.severity = 'medium'
    else form.severity = 'low'
  }

  // Danh sách báo cáo đã được lọc theo khoảng ngày (hoặc tất cả nếu không chọn ngày)
  const dateFilteredReports = computed(() => {
    if (!dateRange.value) return reports.value || []
    return (reports.value || []).filter((r) => isDateInRange(r.date || r.createdAt, dateRange.value))
  })

  // Thống kê theo trạng thái (Open, Investigating, Resolved, Critical) - tự động đồng bộ theo ngày lọc
  const stats = computed(() => {
    const list = dateFilteredReports.value
    return {
      total: list.length,
      open: list.filter((r) => r.status === 'open').length,
      investigating: list.filter((r) => r.status === 'investigating').length,
      resolved: list.filter((r) => ['resolved', 'closed'].includes(r.status)).length,
      critical: list.filter((r) => r.severity === 'critical' || parseFloat(r.defectRate) >= 10).length,
    }
  })

  // Thống kê số lượng theo 4 công đoạn chính: SMT, AI, DIP, AVR
  // Tự động đồng bộ theo khoảng ngày được lọc và tổng hợp cả Sản lượng (Quantity) & Số lỗi (Defect quantity)
  const processStats = computed(() => {
    const list = dateFilteredReports.value
    const total = list.length

    const getProcessData = (name) => {
      const target = name.toUpperCase()
      const matched = list.filter((r) => {
        if (!r.process) return false
        const proc = r.process.toString().trim().toUpperCase()
        return proc === target || proc.startsWith(target + ' ') || proc.startsWith(target + '-')
      })

      const count = matched.length
      const totalQty = matched.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
      const totalDefect = matched.reduce((sum, r) => sum + (Number(r.defectQuantity) || 0), 0)
      const defectRate = totalQty > 0 ? ((totalDefect / totalQty) * 100).toFixed(2) + '%' : '0.00%'

      return {
        count,
        totalQty,
        totalDefect,
        defectRate,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    }

    const smt = getProcessData('SMT')
    const ai = getProcessData('AI')
    const dip = getProcessData('DIP')
    const avr = getProcessData('AVR')

    const totalQtyAll = list.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
    const totalDefectAll = list.reduce((sum, r) => sum + (Number(r.defectQuantity) || 0), 0)
    const overallDefectRate = totalQtyAll > 0 ? ((totalDefectAll / totalQtyAll) * 100).toFixed(2) + '%' : '0.00%'

    return {
      total,
      // Số lượng báo cáo theo từng công đoạn (giữ tương thích ngược hoàn toàn)
      smt: smt.count,
      ai: ai.count,
      dip: dip.count,
      avr: avr.count,
      // Tỷ lệ % báo cáo
      smtPercent: smt.percent,
      aiPercent: ai.percent,
      dipPercent: dip.percent,
      avrPercent: avr.percent,
      // Chi tiết sản lượng & số lượng lỗi của từng công đoạn
      smtDetails: smt,
      aiDetails: ai,
      dipDetails: dip,
      avrDetails: avr,
      // Tổng sản lượng và tổng số lỗi của toàn bộ báo cáo trong khoảng ngày lọc
      totalQuantity: totalQtyAll,
      totalDefectQuantity: totalDefectAll,
      overallDefectRate,
      // Cờ báo hiệu đang có bộ lọc ngày hoạt động
      isDateFiltered: Boolean(
        dateRange.value &&
        (Array.isArray(dateRange.value)
          ? dateRange.value.some((d) => Boolean(d))
          : Boolean(dateRange.value))
      ),
    }
  })

  // Chuỗi hiển thị khoảng ngày lọc thân thiện cho người dùng (ví dụ: '18/09/2026' hoặc '15/09 - 18/09/2026')
  const dateRangeDisplay = computed(() => {
    if (!dateRange.value) return ''
    if (Array.isArray(dateRange.value)) {
      const d0 = dateRange.value[0] ? normalizeToDateString(dateRange.value[0]) : ''
      const d1 = dateRange.value[1] ? normalizeToDateString(dateRange.value[1]) : ''
      if (d0 && d1) {
        if (d0 === d1) {
          const [y, m, d] = d0.split('-')
          return `${d}/${m}/${y}`
        }
        const [y0, m0, d0p] = d0.split('-')
        const [y1, m1, d1p] = d1.split('-')
        return `${d0p}/${m0}/${y0} - ${d1p}/${m1}/${y1}`
      }
      if (d0) {
        const [y, m, d] = d0.split('-')
        return `Từ ${d}/${m}/${y}`
      }
      if (d1) {
        const [y, m, d] = d1.split('-')
        return `Đến ${d}/${m}/${y}`
      }
    }
    const single = normalizeToDateString(dateRange.value)
    if (single) {
      const [y, m, d] = single.split('-')
      return `${d}/${m}/${y}`
    }
    return String(dateRange.value)
  })

  function setDateToday() {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    dateRange.value = [dateStr, dateStr]
    currentPage.value = 1
  }

  function setDateYesterday() {
    const yest = new Date()
    yest.setDate(yest.getDate() - 1)
    const y = yest.getFullYear()
    const m = String(yest.getMonth() + 1).padStart(2, '0')
    const d = String(yest.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    dateRange.value = [dateStr, dateStr]
    currentPage.value = 1
  }

  function setDateLast7Days() {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    const format = (dt) => {
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    dateRange.value = [format(start), format(end)]
    currentPage.value = 1
  }

  const filteredReports = computed(() =>
    dateFilteredReports.value.filter((report) => {
      const keyword = searchText.value.toLowerCase().trim()
      const matchesSearch =
        !keyword ||
        [
          report.id,
          report.productModel,
          report.process,
          report.machine,
          report.defectDescription,
          report.responsiblePerson,
          report.assignee,
          report.creator,
          report.progressNote,
        ].some((v) => (v ? String(v).toLowerCase().includes(keyword) : false))

      let matchesStat = true
      if (activeStat.value === 'attention') {
        matchesStat = report.status === 'open' || report.status === 'investigating'
      } else if (activeStat.value === 'investigating') {
        matchesStat = report.status === 'investigating'
      } else if (activeStat.value === 'resolved') {
        matchesStat = report.status === 'resolved' || report.status === 'closed'
      }

      let matchesStatus = true
      if (statusFilter.value !== 'all') {
        matchesStatus = report.status === statusFilter.value
      }

      let matchesSeverity = true
      if (severityFilter.value !== 'all') {
        matchesSeverity = report.severity === severityFilter.value
      }

      let matchesProcess = true
      if (processFilter.value !== 'all') {
        const target = processFilter.value.toUpperCase()
        const proc = (report.process || '').toString().trim().toUpperCase()
        matchesProcess = proc === target || proc.startsWith(target + ' ') || proc.startsWith(target + '-')
      }

      return matchesSearch && matchesStat && matchesStatus && matchesSeverity && matchesProcess
    })
  )

  const pagedReports = computed(() =>
    filteredReports.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
  )

  function filterByStat(statKey) {
    if (activeStat.value === statKey) {
      activeStat.value = 'all'
    } else {
      activeStat.value = statKey
    }
    currentPage.value = 1
  }

  function toggleProcessFilter(proc) {
    if (processFilter.value === proc) {
      processFilter.value = 'all'
    } else {
      processFilter.value = proc
    }
    currentPage.value = 1
  }

  function resetFilters() {
    searchText.value = ''
    statusFilter.value = 'all'
    severityFilter.value = 'all'
    processFilter.value = 'all'
    dateRange.value = null
    activeStat.value = 'all'
    currentPage.value = 1
  }

  function handleImagesSelected(files) {
    if (!files) return
    const fileList = Array.from(files).filter((f) => f && f.type && f.type.startsWith('image/'))
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn các tệp hình ảnh hợp lệ (JPG, PNG, WEBP)')
      return
    }
    for (const file of fileList) {
      const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const previewUrl = URL.createObjectURL(file)
      const itemObj = reactive({
        file,
        originalFile: file,
        previewUrl,
        name: file.name,
        originalSize: file.size,
        compressedSize: file.size,
        compressedBase64: '',
        savings: 0,
        isCompressing: true,
        id: fileId,
      })
      selectedFiles.value.push(itemObj)

      // Kích hoạt nén ảnh client-side tự động ngay khi người dùng chọn
      compressImage(file, 1280, 1280, 0.78)
        .then((res) => {
          itemObj.file = res.file
          itemObj.compressedSize = res.compressedSize
          itemObj.compressedBase64 = res.base64
          itemObj.savings = Math.max(0, Math.round((1 - res.compressedSize / res.originalSize) * 100))
          itemObj.isCompressing = false
        })
        .catch((err) => {
          console.warn('Lỗi nén ảnh:', err)
          itemObj.isCompressing = false
        })
    }
    if (selectedFiles.value.length > 0) {
      selectedImageFile.value = selectedFiles.value[0].file
      imagePreviewUrl.value = selectedFiles.value[0].previewUrl
    }
  }

  function handleImageSelected(file) {
    if (file) handleImagesSelected([file])
  }

  function removeExistingImage(index) {
    existingImages.value.splice(index, 1)
  }

  function removeSelectedFile(index) {
    const item = selectedFiles.value[index]
    if (item && item.previewUrl && item.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl)
    }
    selectedFiles.value.splice(index, 1)
    if (selectedFiles.value.length > 0) {
      selectedImageFile.value = selectedFiles.value[0].file
      imagePreviewUrl.value = selectedFiles.value[0].previewUrl
    } else {
      selectedImageFile.value = null
      imagePreviewUrl.value = ''
    }
  }

  function updateAnnotatedImage(target, updatedData) {
    if (!target || !updatedData) return

    if (target.type === 'selected' && selectedFiles.value[target.index]) {
      const item = selectedFiles.value[target.index]
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl)
      }
      item.file = updatedData.file
      item.originalFile = updatedData.file
      item.previewUrl = updatedData.previewUrl
      item.compressedBase64 = updatedData.base64
      item.compressedSize = updatedData.compressedSize
      item.originalSize = updatedData.originalSize
      item.name = updatedData.name
      item.savings = Math.max(0, Math.round((1 - updatedData.compressedSize / updatedData.originalSize) * 100))
      item.isCompressing = false

      if (target.index === 0) {
        selectedImageFile.value = updatedData.file
        imagePreviewUrl.value = updatedData.previewUrl
      }
    } else if (target.type === 'existing' && existingImages.value[target.index]) {
      existingImages.value[target.index] = {
        ...existingImages.value[target.index],
        url: updatedData.base64 || updatedData.previewUrl,
        path: '',
        name: updatedData.name,
      }
      if (target.index === 0) {
        form.imageUrl = updatedData.base64 || updatedData.previewUrl
        imagePreviewUrl.value = updatedData.previewUrl || updatedData.base64
      }
    }
  }

  function clearAllImages() {
    for (const item of selectedFiles.value) {
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl)
      }
    }
    selectedFiles.value = []
    existingImages.value = []
    selectedImageFile.value = null
    imagePreviewUrl.value = ''
    form.images = []
    form.imageUrl = ''
    form.imagePath = ''
  }

  function removeAttachedImage() {
    clearAllImages()
  }

  function openCreate() {
    Object.assign(form, emptyForm())
    clearAllImages()
    editingId.value = null
    isEditing.value = false
    isModalOpen.value = true
  }

  function openEdit(report) {
    Object.assign(form, {
      ...emptyForm(),
      ...report,
    })
    existingImages.value = [...getReportImages(report)]
    selectedFiles.value = []
    selectedImageFile.value = null
    imagePreviewUrl.value = report.imageUrl || ''
    editingId.value = report.id
    isEditing.value = true
    isModalOpen.value = true
    if (isDetailOpen.value) {
      isDetailOpen.value = false
    }
  }

  function openDetail(report) {
    selectedReport.value = report
    isDetailOpen.value = true
  }

  function closeDetail() {
    isDetailOpen.value = false
    selectedReport.value = null
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  // Cờ báo hiệu cảnh báo về Storage để chỉ hiển thị 1 lần cho người dùng
  let storageWarningShown = false
  let isStorageAvailable = true

  async function uploadImageFile(itemOrFile) {
    if (!itemOrFile) return { url: '', path: '' }

    let file = itemOrFile.file || itemOrFile
    let compressedBase64 = itemOrFile.compressedBase64 || ''
    const fileName = itemOrFile.name || file.name || 'image.jpg'

    // Nếu chưa có kết quả nén (hoặc truyền raw file đơn lẻ), nén ngay
    if (!compressedBase64) {
      try {
        const compressed = await compressImage(file, 1280, 1280, 0.78)
        file = compressed.file
        compressedBase64 = compressed.base64
      } catch (compressErr) {
        console.warn('Không thể nén ảnh trước khi tải lên, dùng ảnh gốc:', compressErr)
      }
    }

    // 2. Chế độ Miễn phí 100% (Gói Spark): Lưu ảnh nén trực tiếp vào Firestore mà không cần Firebase Storage
    // Bỏ qua hoàn toàn việc gọi Storage để tránh phát sinh lỗi 404 / CORS và thời gian chờ
    if (!isStorageEnabled) {
      const base64 = compressedBase64 || (await fileToBase64(file))
      return { url: base64, path: '' }
    }

    // 3. Chỉ tải lên Firebase Storage khi được bật (khi đã nâng cấp gói Blaze)
    if (isFirebaseConfigured && storage && isStorageAvailable) {
      try {
        const safeName = fileName
          ? fileName
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9._-]/g, '_')
          : 'image.jpg'
        const filePath = `reports/${Date.now()}_${safeName}`
        const fileRef = storageRef(storage, filePath)
        const snapshot = await uploadBytes(fileRef, file)
        const downloadUrl = await getDownloadURL(snapshot.ref)
        return { url: downloadUrl, path: filePath }
      } catch (err) {
        console.warn('Upload Firebase Storage thất bại, tự động fallback Base64 đã nén:', err)
        isStorageAvailable = false
      }
    }

    // Fallback an toàn: Dùng chuỗi Base64 đã được nén tối ưu (< 200KB)
    try {
      const base64 = compressedBase64 || (await fileToBase64(file))
      return { url: base64, path: '' }
    } catch (e) {
      console.error('Lỗi chuyển ảnh sang Base64:', e)
      return { url: '', path: '' }
    }
  }

  async function updateStatus(reportId, newStatus) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'manufacturing_reports', reportId)
        await updateDoc(docRef, { status: newStatus })
      } catch (err) {
        console.error('Lỗi cập nhật trạng thái Firestore:', err)
      }
    }

    const r = reports.value.find((item) => item.id === reportId)
    if (r) {
      r.status = newStatus
      if (selectedReport.value && selectedReport.value.id === reportId) {
        selectedReport.value.status = newStatus
      }
      saveLocalReports(reports.value)
    }
  }

  async function saveReport() {
    isSaving.value = true

    try {
      // Tải lên tất cả các ảnh mới chọn lên Firebase Storage (sử dụng ảnh đã nén sẵn)
      const uploadedImages = []
      for (const item of selectedFiles.value) {
        const uploadRes = await uploadImageFile(item)
        if (uploadRes.url) {
          uploadedImages.push({
            url: uploadRes.url,
            path: uploadRes.path,
            name: item.name,
          })
        }
      }

      const finalImages = [...existingImages.value, ...uploadedImages]
      const primaryUrl = finalImages.length > 0 ? finalImages[0].url : ''
      const primaryPath = finalImages.length > 0 ? finalImages[0].path : ''

      const calculatedRate = calculateDefectRate(form.defectQuantity, form.quantity)

      const reportPayload = {
        date: form.date || new Date().toISOString().split('T')[0],
        process: form.process || 'SMT',
        productModel: form.productModel ? form.productModel.trim() : 'MDL-GEN',
        machine: form.machine ? form.machine.trim() : 'LINE-01',
        quantity: Number(form.quantity) || 0,
        defectQuantity: Number(form.defectQuantity) || 0,
        defectRate: calculatedRate,
        responsiblePerson: form.responsiblePerson ? form.responsiblePerson.trim() : 'Quản lý chuyền',
        assignee: form.assignee ? form.assignee.trim() : (user.value ? user.value.displayName : 'QA Engineer'),
        defectDescription: form.defectDescription ? form.defectDescription.trim() : 'Chưa có mô tả chi tiết',
        progressNote: form.progressNote ? form.progressNote.trim() : '',
        creator: form.creator || (user.value ? (user.value.displayName || user.value.email) : 'Admin'),
        status: form.status || 'open',
        severity: form.severity || 'low',
        images: finalImages,
        imageUrl: primaryUrl,
        imagePath: primaryPath,
        createdAt: form.createdAt || new Date().toLocaleDateString('vi-VN'),
      }

      if (isEditing.value && editingId.value) {
        if (isFirebaseConfigured && db) {
          const docRef = doc(db, 'manufacturing_reports', editingId.value)
          await updateDoc(docRef, {
            ...reportPayload,
            updatedAt: serverTimestamp(),
          })
        }

        const index = reports.value.findIndex((r) => r.id === editingId.value)
        if (index !== -1) {
          reports.value[index] = { ...reports.value[index], ...reportPayload }
          if (selectedReport.value && selectedReport.value.id === editingId.value) {
            selectedReport.value = { ...reports.value[index] }
          }
          saveLocalReports(reports.value)
        }
        message.success(t('updateSuccess'))
      } else {
        let newDocId = `ANOM-${Date.now().toString().slice(-4)}`

        if (isFirebaseConfigured && db) {
          const docRef = await addDoc(collection(db, 'manufacturing_reports'), {
            ...reportPayload,
            createdAtTimestamp: serverTimestamp(),
          })
          newDocId = docRef.id
        }

        const newReport = {
          id: newDocId,
          ...reportPayload,
        }

        reports.value.unshift(newReport)
        saveLocalReports(reports.value)
        message.success(t('createSuccess'))
      }

      isModalOpen.value = false
    } catch (err) {
      console.error('Lỗi khi lưu báo cáo:', err)
      message.error('Không thể lưu báo cáo: ' + (err.message || 'Lỗi không xác định'))
    } finally {
      isSaving.value = false
    }
  }

  function promptDelete(report) {
    reportToDelete.value = report
    showDeleteModal.value = true
  }

  function cancelDelete() {
    showDeleteModal.value = false
    reportToDelete.value = null
  }

  async function executeDelete() {
    const report = reportToDelete.value
    if (!report) return

    isDeleting.value = true
    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'manufacturing_reports', report.id))

        if (storage && isStorageEnabled) {
          const imagesToDelete = getReportImages(report)
          for (const img of imagesToDelete) {
            if (img.path) {
              try {
                await deleteObject(storageRef(storage, img.path))
              } catch (e) {
                console.warn('Không thể xoá ảnh trên Storage:', e)
              }
            }
          }
        }
      }

      reports.value = reports.value.filter((item) => item.id !== report.id)
      saveLocalReports(reports.value)

      if (selectedReport.value && selectedReport.value.id === report.id) {
        isDetailOpen.value = false
        selectedReport.value = null
      }

      message.success(t('deleteSuccess'))
      showDeleteModal.value = false
      reportToDelete.value = null
    } catch (err) {
      console.error('Lỗi xoá báo cáo:', err)
      message.error(t('deleteError') + (err.message || 'Lỗi không xác định'))
    } finally {
      isDeleting.value = false
    }
  }

  function removeReport(report) {
    promptDelete(report)
  }

  function changePage(page) {
    currentPage.value = page
  }

  async function batchImportReports(importedList = [], duplicateMode = 'overwrite', onProgress = null) {
    if (!importedList || importedList.length === 0) {
      return { count: 0, added: 0, updated: 0, skipped: 0, summary: 'Không có dữ liệu để nhập' }
    }

    isImportingReports.value = true
    let addedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const total = importedList.length

    const reportProgress = (index, rep, action) => {
      if (typeof onProgress === 'function') {
        const current = index + 1
        const percent = Math.min(100, Math.round((current / total) * 100))
        onProgress({
          current,
          total,
          percent,
          added: addedCount,
          updated: updatedCount,
          skipped: skippedCount,
          statusText: `Đang lưu (${current}/${total}): ${rep.productModel || ''} - ${rep.process || ''} (${action || 'Đang xử lý'})`,
        })
      }
    }

    const norm = (str) => (str || '').toString().trim().toLowerCase()

    const findMatch = (newRep) => {
      return reports.value.find((r) => {
        const sameDate = norm(r.date) === norm(newRep.date)
        const sameModel = norm(r.productModel) === norm(newRep.productModel)
        const sameProcess = norm(r.process) === norm(newRep.process)
        const sameDesc = norm(r.defectDescription) === norm(newRep.defectDescription)
        return sameDate && sameModel && sameProcess && sameDesc
      })
    }

    try {
      if (isFirebaseConfigured && db) {
        for (let i = 0; i < total; i++) {
          const rep = importedList[i]
          const matched = duplicateMode !== 'add_all' ? findMatch(rep) : null

          if (matched && duplicateMode === 'skip') {
            skippedCount++
            reportProgress(i, rep, 'Bỏ qua')
            continue
          }

          // Xử lý ảnh thông minh:
          // 1. Nếu bản ghi cũ đã có ảnh trên hệ thống (đã chụp/vẽ marker) -> Giữ nguyên ảnh cũ.
          // 2. Nếu bản ghi cũ chưa có ảnh hoặc là bản ghi mới -> Lấy toàn bộ ảnh trích xuất từ Excel!
          const existingImgs = matched
            ? (matched.images && matched.images.length > 0
                ? matched.images
                : (matched.imageUrl ? [{ url: matched.imageUrl, path: matched.imagePath || '', name: 'Ảnh đính kèm' }] : []))
            : []
          const importedImgs = rep.images && rep.images.length > 0
            ? rep.images
            : (rep.imageUrl ? [{ url: rep.imageUrl, name: 'Ảnh lỗi' }] : [])

          const finalImages = existingImgs.length > 0 ? existingImgs : importedImgs
          const finalImageUrl = finalImages[0]?.url || matched?.imageUrl || rep.imageUrl || ''
          const finalImagePath = matched?.imagePath || ''

          const payload = {
            date: rep.date || new Date().toISOString().split('T')[0],
            process: rep.process || 'SMT',
            productModel: rep.productModel || 'MDL-GENERIC',
            machine: rep.machine || '',
            quantity: Number(rep.quantity) || 0,
            defectQuantity: Number(rep.defectQuantity) || 0,
            defectRate: rep.defectRate || '0.00%',
            responsiblePerson: rep.responsiblePerson || '',
            assignee: rep.assignee || (user.value ? user.value.displayName : 'QA Engineer'),
            defectDescription: rep.defectDescription || 'Chưa có mô tả chi tiết',
            causes: rep.causes || '',
            improvementMeasures: rep.improvementMeasures || '',
            progressNote: rep.progressNote || '',
            creator: user.value ? (user.value.displayName || user.value.email) : 'Admin (Import)',
            status: rep.status || 'open',
            severity: rep.severity || 'low',
            images: finalImages,
            imageUrl: finalImageUrl,
            imagePath: finalImagePath,
            updatedAt: serverTimestamp(),
          }

          if (matched && duplicateMode === 'overwrite') {
            const docRef = doc(db, 'manufacturing_reports', matched.id)
            await updateDoc(docRef, payload)
            updatedCount++
            reportProgress(i, rep, 'Ghi đè')
          } else {
            await addDoc(collection(db, 'manufacturing_reports'), {
              ...payload,
              createdAt: rep.createdAt || new Date().toLocaleDateString('vi-VN'),
              createdAtTimestamp: serverTimestamp(),
            })
            addedCount++
            reportProgress(i, rep, 'Thêm mới')
          }
        }
      } else {
        for (let i = 0; i < total; i++) {
          const rep = importedList[i]
          const matchedIndex = duplicateMode !== 'add_all'
            ? reports.value.findIndex((r) => {
                return (
                  norm(r.date) === norm(rep.date) &&
                  norm(r.productModel) === norm(rep.productModel) &&
                  norm(r.process) === norm(rep.process) &&
                  norm(r.defectDescription) === norm(rep.defectDescription)
                )
              })
            : -1

          if (matchedIndex !== -1 && duplicateMode === 'skip') {
            skippedCount++
            reportProgress(i, rep, 'Bỏ qua')
            continue
          }

          if (matchedIndex !== -1 && duplicateMode === 'overwrite') {
            const existing = reports.value[matchedIndex]
            const existingImgs = (existing.images && existing.images.length > 0)
              ? existing.images
              : (existing.imageUrl ? [{ url: existing.imageUrl, name: 'Ảnh đính kèm' }] : [])
            const importedImgs = (rep.images && rep.images.length > 0)
              ? rep.images
              : (rep.imageUrl ? [{ url: rep.imageUrl, name: 'Ảnh lỗi' }] : [])
            const finalImages = existingImgs.length > 0 ? existingImgs : importedImgs

            reports.value[matchedIndex] = {
              ...existing,
              ...rep,
              images: finalImages,
              imageUrl: finalImages[0]?.url || existing.imageUrl || rep.imageUrl || '',
            }
            updatedCount++
            reportProgress(i, rep, 'Ghi đè')
          } else {
            reports.value.unshift({
              ...rep,
              images: rep.images || [],
              imageUrl: rep.imageUrl || (rep.images?.[0]?.url || ''),
            })
            addedCount++
            reportProgress(i, rep, 'Thêm mới')
          }
        }
        saveLocalReports(reports.value)
      }

      let summaryMsg = `Đã nhập: Thêm mới ${addedCount}`
      if (updatedCount > 0) summaryMsg += `, Ghi đè cập nhật ${updatedCount}`
      if (skippedCount > 0) summaryMsg += `, Bỏ qua ${skippedCount}`
      message.success(summaryMsg)

      if (typeof onProgress === 'function') {
        onProgress({
          current: total,
          total,
          percent: 100,
          added: addedCount,
          updated: updatedCount,
          skipped: skippedCount,
          statusText: summaryMsg,
        })
      }

      return {
        success: true,
        total: importedList.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount,
        summary: summaryMsg,
      }
    } catch (err) {
      console.error('Lỗi batch import:', err)
      message.error('Lỗi khi lưu dữ liệu import: ' + (err.message || ''))
      throw err
    } finally {
      isImportingReports.value = false
    }
  }

  return {
    reports,
    batchImportReports,
    isFirestoreLoading,
    isImportingReports,
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
    promptDelete,
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
    categoryOptions,
    commonProcesses,
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
    dateRangeDisplay,
    setDateToday,
    setDateYesterday,
    setDateLast7Days,
    changePage,
  }
}

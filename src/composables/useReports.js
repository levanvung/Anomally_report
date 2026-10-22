import { computed, reactive, ref, shallowRef, triggerRef, watch } from 'vue'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/config.js'
import { useAuth } from './useAuth.js'
import { compressImage, formatFileSize } from '../utils/imageCompressor.js'
import { normalizeProcessName, normalizeExcelDate } from '../utils/excelService.js'

export { formatFileSize }
export const commonProcesses = ['SMT', 'AI', 'DIP', 'AVR']

// Trạng thái Loading Toàn Cục & Toast Thông Báo
export const globalLoading = reactive({
  active: false,
  title: 'Đang xử lý dữ liệu...',
  subtext: 'Vui lòng đợi trong giây lát...',
  percent: null,
})

export function showLoading(title, subtext = 'Vui lòng đợi trong giây lát...', percent = null) {
  globalLoading.active = true
  globalLoading.title = title
  globalLoading.subtext = subtext
  globalLoading.percent = percent
}

export function hideLoading() {
  globalLoading.active = false
  globalLoading.percent = null
}

export const toasts = ref([])
let toastId = 1
export function showToast(text, type = 'success') {
  const id = toastId++
  toasts.value.push({ id, text, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3200)
}

export function calculateDefectRate(defectQty, totalQty) {
  const d = Number(defectQty) || 0
  const q = Number(totalQty) || 0
  return q <= 0 ? '0.00%' : ((d / q) * 100).toFixed(2) + '%'
}

export function getDefectRateLevel(rateStrOrNum) {
  const rate = typeof rateStrOrNum === 'string' ? parseFloat(rateStrOrNum) : (Number(rateStrOrNum) || 0)
  if (rate >= 10) return { label: 'Rất cao (>10%)', severity: 'critical' }
  if (rate >= 5) return { label: 'Cao (>5%)', severity: 'high' }
  if (rate >= 1) return { label: 'Cần lưu ý', severity: 'medium' }
  return { label: 'Ổn định (<1%)', severity: 'low' }
}

// Chuyển mọi định dạng ngày về chuẩn YYYY-MM-DD để sắp xếp theo ngày từ trên xuống dưới
export function toSortableISODate(val) {
  if (!val) return '0000-00-00'
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const mDMY = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (mDMY) {
    return `${mDMY[3]}-${mDMY[2].padStart(2, '0')}-${mDMY[1].padStart(2, '0')}`
  }
  return normalizeExcelDate(s) || '0000-00-00'
}

// Hiển thị ngày dạng DD/MM/YYYY thân thiện trên bảng
export function formatDisplayDate(val) {
  const iso = toSortableISODate(val)
  if (!iso || iso === '0000-00-00') return val || '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function getReportImages(report) {
  if (!report) return []
  if (Array.isArray(report.images) && report.images.length > 0) {
    return report.images.map((img, i) => typeof img === 'string' ? { url: img, name: `Ảnh ${i+1}` } : img).filter(i => i.url)
  }
  return report.imageUrl ? [{ url: report.imageUrl, name: 'Ảnh lỗi' }] : []
}

export function getPrimaryReportImage(report) {
  const imgs = getReportImages(report)
  return imgs[0]?.url || ''
}

export function getReportImageCount(report) {
  return getReportImages(report).length
}

const reports = shallowRef([])
const isFirestoreLoading = ref(false)
const isImportingReports = ref(false)
const isPageSwitching = ref(false)
const dateSortOrder = ref('desc') // 'desc' = Mới nhất -> Cũ nhất, 'asc' = Cũ nhất -> Mới nhất

if (isFirebaseConfigured && db) {
  isFirestoreLoading.value = true
  onSnapshot(collection(db, 'manufacturing_reports'), (snap) => {
    if (isImportingReports.value) return
    const list = snap.docs.map((d, idx) => {
      const data = d.data()
      // Tự động sửa lại cả các bản ghi DIP cũ trên Firestore từng bị nhầm sang AVR (do có Responsible là Production-DIP)
      const fixedProcess = normalizeProcessName(data.processRaw || data.process, data.sheetSource, data.responsiblePerson)
      return {
        id: d.id,
        ...data,
        process: fixedProcess,
        _sortDate: toSortableISODate(data.date || data.createdAt),
        _orderIdx: data.orderIndex ?? idx,
      }
    })
    reports.value = list
    isFirestoreLoading.value = false
  }, () => { isFirestoreLoading.value = false })
}

export function useReports() {
  const { user } = useAuth()
  const searchText = ref('')
  const debouncedSearch = ref('')
  const statusFilter = ref('all')
  const processFilter = ref('all')
  const dateRange = ref(null)
  const activeStat = ref('all')
  const currentPage = ref(1)
  const pageSize = 10

  let timer = null
  watch(searchText, (val) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { debouncedSearch.value = val; currentPage.value = 1 }, 200)
  })

  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const isSaving = ref(false)
  const showDeleteModal = ref(false)
  const reportToDelete = ref(null)
  const isDeleting = ref(false)
  const isDetailOpen = ref(false)
  const selectedReport = ref(null)

  const existingImages = ref([])
  const selectedFiles = ref([])
  const totalImagesCount = computed(() => existingImages.value.length + selectedFiles.value.length)

  const emptyForm = () => ({
    date: new Date().toISOString().split('T')[0],
    process: 'DIP',
    productModel: 'ISP3144AF-1A',
    machine: 'DIP HAND INSERT',
    quantity: 250,
    defectQuantity: 1,
    defectRate: '0.40%',
    responsiblePerson: 'Production-DIP',
    assignee: 'Production-DIP',
    defectDescription: '',
    progressNote: '',
    status: 'resolved',
    severity: 'low',
  })

  const form = reactive(emptyForm())

  function onQuantityOrDefectChange() {
    form.defectRate = calculateDefectRate(form.defectQuantity, form.quantity)
    form.severity = getDefectRateLevel(form.defectRate).severity
  }

  const processStats = computed(() => {
    const list = reports.value
    const total = list.length || 1
    const calc = (key) => {
      const sub = list.filter(r => String(r.process || '').toUpperCase() === key)
      const totalQty = sub.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
      const totalDefect = sub.reduce((s, r) => s + (Number(r.defectQuantity) || 0), 0)
      return { count: sub.length, percent: Math.round((sub.length / total) * 100), totalQty, totalDefect }
    }
    const smt = calc('SMT'), ai = calc('AI'), dip = calc('DIP'), avr = calc('AVR')
    return {
      smt: smt.count, smtPercent: smt.percent, smtDetails: smt,
      ai: ai.count, aiPercent: ai.percent, aiDetails: ai,
      dip: dip.count, dipPercent: dip.percent, dipDetails: dip,
      avr: avr.count, avrPercent: avr.percent, avrDetails: avr,
    }
  })

  const stats = computed(() => {
    const list = reports.value
    return {
      total: list.length,
      open: list.filter(r => r.status === 'open').length,
      investigating: list.filter(r => r.status === 'investigating').length,
      resolved: list.filter(r => r.status === 'resolved' || r.status === 'closed').length,
    }
  })

  // Lọc và Sắp xếp dữ liệu theo Ngày từ trên xuống dưới
  const filteredReports = computed(() => {
    const kw = (debouncedSearch.value || '').toLowerCase().trim()
    const filtered = reports.value.filter((r) => {
      if (processFilter.value !== 'all' && String(r.process || '').toUpperCase() !== processFilter.value) return false
      if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
      if (activeStat.value === 'attention' && r.status !== 'open' && r.status !== 'investigating') return false
      if (activeStat.value === 'resolved' && r.status !== 'resolved' && r.status !== 'closed') return false
      if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
        const d = r._sortDate || toSortableISODate(r.date)
        if (d < dateRange.value[0] || d > dateRange.value[1]) return false
      }
      if (kw) {
        const hay = `${r.productModel} ${r.process} ${r.machine} ${r.defectDescription} ${r.responsiblePerson} ${r.progressNote} ${r.date}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })

    const dir = dateSortOrder.value === 'asc' ? 1 : -1
    return filtered.slice().sort((a, b) => {
      const da = a._sortDate || toSortableISODate(a.date)
      const db = b._sortDate || toSortableISODate(b.date)
      if (da !== db) {
        return da > db ? dir : -dir
      }
      return ((a._orderIdx || 0) - (b._orderIdx || 0))
    })
  })

  const pagedReports = computed(() =>
    filteredReports.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
  )

  function toggleDateSort() {
    isPageSwitching.value = true
    dateSortOrder.value = dateSortOrder.value === 'desc' ? 'asc' : 'desc'
    currentPage.value = 1
    setTimeout(() => { isPageSwitching.value = false }, 180)
  }

  function changePage(p) {
    isPageSwitching.value = true
    currentPage.value = p
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => { isPageSwitching.value = false }, 220)
  }

  function handleImagesSelected(files) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const item = reactive({ id: Date.now() + Math.random(), previewUrl: URL.createObjectURL(file), base64: '', name: file.name })
      selectedFiles.value.push(item)
      compressImage(file, 1100, 1100, 0.75).then(res => { item.base64 = res.base64 })
    }
  }

  function removeExistingImage(idx) { existingImages.value.splice(idx, 1) }
  function removeSelectedFile(idx) { selectedFiles.value.splice(idx, 1) }
  function clearAllImages() { existingImages.value = []; selectedFiles.value = [] }

  function openCreate() {
    Object.assign(form, emptyForm())
    clearAllImages()
    isEditing.value = false
    editingId.value = null
    isModalOpen.value = true
  }

  function openEdit(r) {
    Object.assign(form, emptyForm(), r)
    existingImages.value = [...getReportImages(r)]
    selectedFiles.value = []
    editingId.value = r.id
    isEditing.value = true
    isDetailOpen.value = false
    isModalOpen.value = true
  }

  function openDetail(r) { selectedReport.value = r; isDetailOpen.value = true }
  function closeDetail() { isDetailOpen.value = false; selectedReport.value = null }

  async function saveReport() {
    isSaving.value = true
    showLoading('Đang lưu báo cáo...', 'Đang đồng bộ hình ảnh và dữ liệu lên hệ thống...')
    try {
      const uploaded = selectedFiles.value.map(i => ({ url: i.base64 || i.previewUrl, name: i.name }))
      const finalImages = [...existingImages.value, ...uploaded]
      const isoDate = toSortableISODate(form.date)
      const payload = {
        ...form,
        date: isoDate,
        _sortDate: isoDate,
        quantity: Number(form.quantity) || 0,
        defectQuantity: Number(form.defectQuantity) || 0,
        defectRate: calculateDefectRate(form.defectQuantity, form.quantity),
        images: finalImages,
        imageUrl: finalImages[0]?.url || '',
        creator: user.value?.displayName || user.value?.email || 'Admin',
      }

      if (isEditing.value && editingId.value) {
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'manufacturing_reports', editingId.value), { ...payload, updatedAt: serverTimestamp() })
        } else {
          const idx = reports.value.findIndex(x => x.id === editingId.value)
          if (idx !== -1) { reports.value[idx] = { ...reports.value[idx], ...payload }; triggerRef(reports) }
        }
        showToast('✅ Đã cập nhật báo cáo thành công!')
      } else {
        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, 'manufacturing_reports'), { ...payload, createdAtTimestamp: serverTimestamp() })
        } else {
          reports.value = [{ id: 'ANOM-' + Date.now().toString().slice(-4), ...payload }, ...reports.value]
        }
        showToast('✅ Đã tạo báo cáo mới thành công!')
      }
      isModalOpen.value = false
    } finally {
      isSaving.value = false
      hideLoading()
    }
  }

  function removeReport(r) { reportToDelete.value = r; showDeleteModal.value = true }
  function cancelDelete() { showDeleteModal.value = false; reportToDelete.value = null }

  async function executeDelete() {
    if (!reportToDelete.value) return
    isDeleting.value = true
    showLoading('Đang xoá báo cáo...', reportToDelete.value.productModel)
    try {
      const id = reportToDelete.value.id
      if (isFirebaseConfigured && db) await deleteDoc(doc(db, 'manufacturing_reports', id))
      reports.value = reports.value.filter(x => x.id !== id)
      showDeleteModal.value = false
      showToast('🗑️ Đã xoá báo cáo!')
    } finally {
      isDeleting.value = false
      hideLoading()
    }
  }

  async function batchImportReports(list) {
    if (!list?.length) return
    isImportingReports.value = true
    try {
      if (isFirebaseConfigured && db) {
        const BATCH_SIZE = 300
        for (let i = 0; i < list.length; i += BATCH_SIZE) {
          const chunk = list.slice(i, i + BATCH_SIZE)
          const batch = writeBatch(db)
          chunk.forEach((item, idx) => {
            const isoDate = toSortableISODate(item.date)
            batch.set(doc(collection(db, 'manufacturing_reports')), {
              ...item,
              date: isoDate,
              orderIndex: i + idx,
              createdAtTimestamp: serverTimestamp(),
            })
          })
          const pct = 50 + Math.round(((i + chunk.length) / list.length) * 50)
          showLoading(`Đang lưu vào cơ sở dữ liệu (${i + chunk.length}/${list.length})...`, 'Vui lòng không đóng trình duyệt', pct)
          await batch.commit()
        }
      } else {
        const enriched = list.map((item, idx) => ({
          ...item,
          date: toSortableISODate(item.date),
          _sortDate: toSortableISODate(item.date),
          _orderIdx: idx,
        }))
        reports.value = [...enriched, ...reports.value]
      }
      showToast(`✅ Đã nhập thành công ${list.length} báo cáo từ Excel!`)
    } finally {
      isImportingReports.value = false
    }
  }

  return {
    reports, isFirestoreLoading, isPageSwitching, dateSortOrder, toggleDateSort,
    searchText, statusFilter, processFilter, dateRange, activeStat,
    currentPage, pageSize, isModalOpen, isEditing, isSaving, showDeleteModal, reportToDelete, isDeleting,
    cancelDelete, executeDelete, isDetailOpen, selectedReport, form, existingImages, selectedFiles,
    totalImagesCount, handleImagesSelected, removeExistingImage, removeSelectedFile, clearAllImages,
    getReportImages, onQuantityOrDefectChange, filteredReports, pagedReports, stats, processStats,
    toggleProcessFilter: (p) => {
      isPageSwitching.value = true
      processFilter.value = processFilter.value === p ? 'all' : p
      currentPage.value = 1
      setTimeout(() => { isPageSwitching.value = false }, 180)
    },
    filterByStat: (s) => {
      isPageSwitching.value = true
      activeStat.value = activeStat.value === s ? 'all' : s
      currentPage.value = 1
      setTimeout(() => { isPageSwitching.value = false }, 180)
    },
    resetFilters: () => {
      isPageSwitching.value = true
      searchText.value = ''; statusFilter.value = 'all'; processFilter.value = 'all'; dateRange.value = null; activeStat.value = 'all'; currentPage.value = 1
      setTimeout(() => { isPageSwitching.value = false }, 180)
    },
    openCreate, openEdit, openDetail, closeDetail, saveReport, removeReport, batchImportReports,
    changePage,
    statusLabels: { open: 'Chưa xử lý', investigating: 'Đang điều tra', resolved: 'Đã hoàn thành', closed: 'Đã đóng' },
    statusClass: (s) => 'status-' + s,
  }
}

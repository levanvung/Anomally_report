import { computed, reactive, ref, shallowRef, triggerRef, watch } from 'vue'
import {
  collection, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/config.js'
import { useAuth } from './useAuth.js'
import { compressImage, createThumbnailBase64, formatFileSize } from '../utils/imageCompressor.js'
import { normalizeProcessName, normalizeExcelDate } from '../utils/excelService.js'

export { formatFileSize }
export const commonProcesses = ['SMT', 'AI', 'DIP', 'AVR']

const REPORTS_COLLECTION = 'manufacturing_reports'
const IMAGES_COLLECTION = 'manufacturing_report_images'

// Bộ nhớ đệm RAM lưu các ảnh HD đã tải để bấm xem lần 2 không cần tải lại từ mạng
const hdImagesCache = new Map()

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

export function formatDisplayDate(val) {
  const iso = toSortableISODate(val)
  if (!iso || iso === '0000-00-00') return val || '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function getReportImages(report) {
  if (!report) return []
  if (hdImagesCache.has(report.id)) {
    return hdImagesCache.get(report.id)
  }
  if (Array.isArray(report.images) && report.images.length > 0) {
    return report.images
      .map((img, i) => (typeof img === 'string' ? { url: img, name: `Ảnh ${i + 1}` } : img))
      .filter(i => i.url)
  }
  const fallbackUrl = report.imageUrl || report.thumbnailUrl
  return fallbackUrl ? [{ url: fallbackUrl, name: 'Ảnh lỗi' }] : []
}

// Ngoài bảng danh sách: Luôn ưu tiên lấy Thumbnail siêu nhẹ (~5KB) để cuộn bảng mượt 60fps
export function getPrimaryReportImage(report) {
  if (!report) return ''
  if (report.thumbnailUrl) return report.thumbnailUrl
  if (report.imageUrl) return report.imageUrl
  const imgs = getReportImages(report)
  return imgs[0]?.url || ''
}

export function getReportImageCount(report) {
  if (!report) return 0
  if (typeof report.imageCount === 'number') return report.imageCount
  return getReportImages(report).length
}

// Hàm tải ảnh gốc HD từ bảng phụ manufacturing_report_images khi người dùng bấm Xem / Sửa
async function fetchHdImagesForReport(report) {
  if (!report || !report.id) return []
  if (hdImagesCache.has(report.id)) {
    return hdImagesCache.get(report.id)
  }

  // Tương thích ngược: Nếu báo cáo cũ đã lưu sẵn mảng ảnh trong bảng chính
  if (!report.hasExternalImages && Array.isArray(report.images) && report.images.length > 0) {
    const legacy = getReportImages(report)
    hdImagesCache.set(report.id, legacy)
    return legacy
  }

  const count = Number(report.imageCount) || 0
  if (!isFirebaseConfigured || !db || count <= 0) {
    return getReportImages(report)
  }

  try {
    const promises = []
    for (let i = 0; i < count; i++) {
      promises.push(getDoc(doc(db, IMAGES_COLLECTION, `${report.id}_${i}`)))
    }
    const snaps = await Promise.all(promises)
    const loaded = []
    snaps.forEach((snap, idx) => {
      if (snap.exists()) {
        const d = snap.data()
        if (d.url) loaded.push({ url: d.url, name: d.name || `Ảnh HD ${idx + 1}` })
      }
    })

    if (loaded.length > 0) {
      hdImagesCache.set(report.id, loaded)
      return loaded
    }
  } catch (err) {
    console.warn('Không thể tải ảnh HD từ bảng phụ, dùng ảnh dự phòng:', err)
  }
  return getReportImages(report)
}

const reports = shallowRef([])
const isFirestoreLoading = ref(false)
const isImportingReports = ref(false)
const isPageSwitching = ref(false)
const isDetailImagesLoading = ref(false)
const detailHdImages = ref([])
const dateSortOrder = ref('desc')

if (isFirebaseConfigured && db) {
  isFirestoreLoading.value = true
  onSnapshot(collection(db, REPORTS_COLLECTION), (snap) => {
    if (isImportingReports.value) return
    const list = snap.docs.map((d, idx) => {
      const data = d.data()
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
      if (da !== db) return da > db ? dir : -dir
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
      // Nén chuẩn WebP HD 1440px sắc nét
      compressImage(file, 1440, 1440, 0.85).then(res => { item.base64 = res.base64 })
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

  async function openEdit(r) {
    Object.assign(form, emptyForm(), r)
    selectedFiles.value = []
    editingId.value = r.id
    isEditing.value = true
    isDetailOpen.value = false
    isModalOpen.value = true

    // Tải ảnh HD của báo cáo này để chỉnh sửa
    isDetailImagesLoading.value = true
    existingImages.value = [...getReportImages(r)]
    try {
      const hdList = await fetchHdImagesForReport(r)
      existingImages.value = [...hdList]
    } finally {
      isDetailImagesLoading.value = false
    }
  }

  async function openDetail(r) {
    selectedReport.value = r
    // Hiển thị tức thì ảnh thumbnail trong lúc tải ảnh HD
    detailHdImages.value = getReportImages(r)
    isDetailOpen.value = true

    if (r.hasExternalImages || getReportImageCount(r) > 0) {
      isDetailImagesLoading.value = true
      try {
        detailHdImages.value = await fetchHdImagesForReport(r)
      } finally {
        isDetailImagesLoading.value = false
      }
    }
  }

  function closeDetail() {
    isDetailOpen.value = false
    selectedReport.value = null
    detailHdImages.value = []
  }

  // Lưu báo cáo: Chỉ lưu Thumbnail (~5KB) vào bảng chính, đẩy toàn bộ ảnh HD sang bảng phụ
  async function saveReport() {
    isSaving.value = true
    showLoading('Đang lưu báo cáo...', 'Đang tạo Thumbnail & lưu ảnh HD sắc nét...')
    try {
      const uploaded = selectedFiles.value.map(i => ({ url: i.base64 || i.previewUrl, name: i.name }))
      const finalImages = [...existingImages.value, ...uploaded].filter(i => i && i.url)

      const thumbUrl = finalImages.length > 0
        ? await createThumbnailBase64(finalImages[0].url, 180, 0.68)
        : ''

      const isoDate = toSortableISODate(form.date)
      const payload = {
        ...form,
        date: isoDate,
        _sortDate: isoDate,
        quantity: Number(form.quantity) || 0,
        defectQuantity: Number(form.defectQuantity) || 0,
        defectRate: calculateDefectRate(form.defectQuantity, form.quantity),
        thumbnailUrl: thumbUrl,
        imageUrl: thumbUrl,
        imageCount: finalImages.length,
        hasExternalImages: finalImages.length > 0,
        images: [], // Giữ bảng chính nhẹ tuyệt đối
        creator: user.value?.displayName || user.value?.email || 'Admin',
      }

      if (isEditing.value && editingId.value) {
        const targetId = editingId.value
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, REPORTS_COLLECTION, targetId), { ...payload, updatedAt: serverTimestamp() })
          const imgBatch = writeBatch(db)
          finalImages.forEach((img, idx) => {
            imgBatch.set(doc(db, IMAGES_COLLECTION, `${targetId}_${idx}`), {
              reportId: targetId,
              index: idx,
              url: img.url,
              name: img.name || `Ảnh HD ${idx + 1}`,
            })
          })
          await imgBatch.commit()
        } else {
          const idx = reports.value.findIndex(x => x.id === targetId)
          if (idx !== -1) { reports.value[idx] = { ...reports.value[idx], ...payload }; triggerRef(reports) }
        }
        hdImagesCache.set(targetId, finalImages)
        showToast('✅ Đã cập nhật báo cáo & ảnh HD thành công!')
      } else {
        if (isFirebaseConfigured && db) {
          const newDocRef = doc(collection(db, REPORTS_COLLECTION))
          await setDoc(newDocRef, { ...payload, createdAtTimestamp: serverTimestamp() })
          if (finalImages.length > 0) {
            const imgBatch = writeBatch(db)
            finalImages.forEach((img, idx) => {
              imgBatch.set(doc(db, IMAGES_COLLECTION, `${newDocRef.id}_${idx}`), {
                reportId: newDocRef.id,
                index: idx,
                url: img.url,
                name: img.name || `Ảnh HD ${idx + 1}`,
              })
            })
            await imgBatch.commit()
          }
          hdImagesCache.set(newDocRef.id, finalImages)
        } else {
          const localId = 'ANOM-' + Date.now().toString().slice(-4)
          hdImagesCache.set(localId, finalImages)
          reports.value = [{ id: localId, ...payload }, ...reports.value]
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
      const target = reportToDelete.value
      const id = target.id
      if (isFirebaseConfigured && db) {
        const batch = writeBatch(db)
        batch.delete(doc(db, REPORTS_COLLECTION, id))
        const count = Number(target.imageCount) || 0
        for (let i = 0; i < count; i++) {
          batch.delete(doc(db, IMAGES_COLLECTION, `${id}_${i}`))
        }
        await batch.commit()
      }
      hdImagesCache.delete(id)
      reports.value = reports.value.filter(x => x.id !== id)
      showDeleteModal.value = false
      showToast('🗑️ Đã xoá báo cáo!')
    } finally {
      isDeleting.value = false
      hideLoading()
    }
  }

  // Import Excel: Tự động tách Thumbnail (~5KB) vào bảng chính & lưu từng ảnh HD sang bảng phụ
  async function batchImportReports(list) {
    if (!list?.length) return
    isImportingReports.value = true
    try {
      if (isFirebaseConfigured && db) {
        const MAX_OPS_PER_BATCH = 25
        const MAX_BATCH_BYTES = 2 * 1024 * 1024 // 2 MB an toàn tuyệt đối

        let batch = writeBatch(db)
        let currentOps = 0
        let currentBytes = 0

        const commitIfNeeded = async (extraOps, extraBytes, currentIdx) => {
          if (currentOps > 0 && (currentOps + extraOps > MAX_OPS_PER_BATCH || currentBytes + extraBytes > MAX_BATCH_BYTES)) {
            const pct = 50 + Math.round((currentIdx / list.length) * 48)
            showLoading(
              `Đang đồng bộ ảnh HD & dữ liệu (${currentIdx}/${list.length})...`,
              `Đang ghi gói dữ liệu (${(currentBytes / 1024 / 1024).toFixed(1)} MB)...`,
              pct
            )
            await batch.commit()
            batch = writeBatch(db)
            currentOps = 0
            currentBytes = 0
          }
        }

        for (let i = 0; i < list.length; i++) {
          const item = list[i]
          const isoDate = toSortableISODate(item.date)
          const rawImages = Array.isArray(item.images) ? item.images.filter(x => x && x.url) : []

          // Tạo ảnh Thumbnail 180px (~5KB) cho bảng chính
          const thumbUrl = rawImages.length > 0
            ? await createThumbnailBase64(rawImages[0].url, 180, 0.68)
            : ''

          const reportRef = doc(collection(db, REPORTS_COLLECTION))
          const reportPayload = {
            ...item,
            date: isoDate,
            thumbnailUrl: thumbUrl,
            imageUrl: thumbUrl,
            imageCount: rawImages.length,
            hasExternalImages: rawImages.length > 0,
            images: [], // Không lưu mảng ảnh nặng vào bảng chính
            orderIndex: i,
            createdAtTimestamp: serverTimestamp(),
          }

          const repBytes = JSON.stringify(reportPayload).length
          await commitIfNeeded(1, repBytes, i)
          batch.set(reportRef, reportPayload)
          currentOps++
          currentBytes += repBytes

          // Lưu từng bức ảnh HD thành 1 Document riêng trong bảng phụ manufacturing_report_images
          for (let imgIdx = 0; imgIdx < rawImages.length; imgIdx++) {
            const imgDocPayload = {
              reportId: reportRef.id,
              index: imgIdx,
              url: rawImages[imgIdx].url,
              name: rawImages[imgIdx].name || `row_${i + 1}_img_${imgIdx + 1}.webp`,
            }
            const imgBytes = JSON.stringify(imgDocPayload).length
            // Bỏ qua nếu 1 ảnh đơn lẻ vượt quá 950KB
            if (imgBytes > 950 * 1024) continue

            await commitIfNeeded(1, imgBytes, i)
            const imgRef = doc(db, IMAGES_COLLECTION, `${reportRef.id}_${imgIdx}`)
            batch.set(imgRef, imgDocPayload)
            currentOps++
            currentBytes += imgBytes
          }

          if (rawImages.length > 0) {
            hdImagesCache.set(reportRef.id, rawImages)
          }
        }

        if (currentOps > 0) {
          showLoading(`Đang hoàn tất lưu (${list.length}/${list.length})...`, 'Đang đóng gói lô cuối...', 99)
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
      showToast(`✅ Đã nhập thành công ${list.length} báo cáo kèm ảnh HD!`)
    } finally {
      isImportingReports.value = false
    }
  }

  return {
    reports, isFirestoreLoading, isPageSwitching, isDetailImagesLoading, detailHdImages,
    dateSortOrder, toggleDateSort,
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
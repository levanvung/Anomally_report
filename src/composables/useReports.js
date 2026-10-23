import { computed, reactive, ref, shallowRef, triggerRef, watch } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/config.js'
import { useAuth } from './useAuth.js'
import { compressImage, createThumbnailBase64, formatFileSize } from '../utils/imageCompressor.js'
import { normalizeProcessName, normalizeExcelDate } from '../utils/excelService.js'

export { formatFileSize }
export const commonProcesses = ['SMT', 'AI', 'DIP', 'AVR']

const REPORTS_COLLECTION = 'manufacturing_reports'
const IMAGES_COLLECTION = 'manufacturing_report_images'

// Bộ nhớ đệm RAM lưu ảnh HD để không phải tải lại khi bấm xem lần 2
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
    toasts.value = toasts.value.filter((t) => t.id !== id)
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
      .filter((i) => i.url)
  }
  const fallbackUrl = report.imageUrl || report.thumbnailUrl
  return fallbackUrl ? [{ url: fallbackUrl, name: 'Ảnh lỗi' }] : []
}

export function getPrimaryReportImage(report) {
  if (!report) return ''
  if (report.thumbnailUrl) return report.thumbnailUrl
  if (report.imageUrl) return report.imageUrl
  const imgs = getReportImages(report)
  return imgs[0]?.url || ''
}

export function getReportImageCount(report) {
  if (!report) return 0
  if (typeof report.imageCount === 'number' && report.imageCount > 0) return report.imageCount
  if (Array.isArray(report.images) && report.images.length > 0) return report.images.length
  return report.imageUrl || report.thumbnailUrl ? 1 : 0
}

async function fetchHdImagesForReport(report) {
  if (!report || !report.id) return []
  if (hdImagesCache.has(report.id)) {
    return hdImagesCache.get(report.id)
  }

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
    console.warn('Không thể tải ảnh HD từ bảng phụ:', err)
  }
  return getReportImages(report)
}

const reports = shallowRef([])
const isFirestoreLoading = ref(false)
const isBackgroundSyncing = ref(false)
const backgroundLoadedCount = ref(0)
const isImportingReports = ref(false)
const isPageSwitching = ref(false)
const isDetailImagesLoading = ref(false)
const detailHdImages = ref([])
const dateSortOrder = ref('desc')

// Chuẩn hoá 1 Document lấy từ Firestore về dạng nhẹ nhất cho bảng
function transformFirestoreDoc(docSnap, idx) {
  const data = docSnap.data()
  const fixedProcess = normalizeProcessName(
    data.processRaw || data.process,
    data.sheetSource,
    data.responsiblePerson
  )

  // Nếu dữ liệu cũ có chứa mảng images nặng trực tiếp trong bảng chính -> Cất vào cache HD & giải phóng khỏi mảng bảng
  if (Array.isArray(data.images) && data.images.length > 0) {
    const cleanImgs = data.images
      .map((img, i) => (typeof img === 'string' ? { url: img, name: `Ảnh ${i + 1}` } : img))
      .filter((i) => i && i.url)
    if (cleanImgs.length > 0) {
      hdImagesCache.set(docSnap.id, cleanImgs)
    }
  }

  const primaryThumb =
    data.thumbnailUrl ||
    data.imageUrl ||
    (Array.isArray(data.images) && data.images[0]
      ? typeof data.images[0] === 'string'
        ? data.images[0]
        : data.images[0]?.url
      : '')

  const imgCount =
    typeof data.imageCount === 'number'
      ? data.imageCount
      : Array.isArray(data.images) && data.images.length > 0
      ? data.images.length
      : primaryThumb
      ? 1
      : 0

  return {
    id: docSnap.id,
    ...data,
    process: fixedProcess,
    thumbnailUrl: primaryThumb,
    imageUrl: primaryThumb,
    imageCount: imgCount,
    images: [], // Giữ cho object trong bảng nhẹ tuyệt đối
    _sortDate: toSortableISODate(data.date || data.createdAt),
    _orderIdx: data.orderIndex ?? idx,
  }
}

// ============================================================================
// TẢI PHÂN TRANG TỪ DATABASE: LẤY 15 BẢN GHI ĐẦU TIÊN -> TẢI NGẦM 20 BẢN GHI/LẦN
// ============================================================================
let activeSyncSession = 0

export async function loadReportsIncrementally() {
  if (!isFirebaseConfigured || !db) return

  const sessionId = ++activeSyncSession
  isFirestoreLoading.value = true
  isBackgroundSyncing.value = false
  backgroundLoadedCount.value = 0

  const FIRST_BATCH_SIZE = 15
  const BG_BATCH_SIZE = 20
  const colRef = collection(db, REPORTS_COLLECTION)

  try {
    // 1. Tải nhanh 15 bản ghi đầu tiên để hiển thị ngay lập tức
    let firstSnap
    let useDateOrder = true
    try {
      const qFirst = query(colRef, orderBy('date', 'desc'), limit(FIRST_BATCH_SIZE))
      firstSnap = await getDocs(qFirst)
    } catch {
      useDateOrder = false
      const qFallback = query(colRef, limit(FIRST_BATCH_SIZE))
      firstSnap = await getDocs(qFallback)
    }

    if (sessionId !== activeSyncSession) return

    const initialList = firstSnap.docs.map((d, i) => transformFirestoreDoc(d, i))
    reports.value = initialList
    backgroundLoadedCount.value = initialList.length
    isFirestoreLoading.value = false // Mở khóa giao diện ngay sau 15 bản ghi đầu!

    // Nếu tổng số bản ghi < 15 thì đã hết dữ liệu, không cần tải ngầm nữa
    if (firstSnap.docs.length < FIRST_BATCH_SIZE) {
      return
    }

    // 2. Bắt đầu tải ngầm từng cụm 20 bản ghi ở dưới nền
    isBackgroundSyncing.value = true
    let lastVisibleDoc = firstSnap.docs[firstSnap.docs.length - 1]
    let orderCounter = initialList.length

    while (lastVisibleDoc && sessionId === activeSyncSession) {
      // Nghỉ 120ms giữa các đợt để trình duyệt luôn mượt 60fps khi người dùng cuộn/bấm
      await new Promise((r) => setTimeout(r, 120))
      if (sessionId !== activeSyncSession) break

      let nextSnap
      if (useDateOrder) {
        const qNext = query(
          colRef,
          orderBy('date', 'desc'),
          startAfter(lastVisibleDoc),
          limit(BG_BATCH_SIZE)
        )
        nextSnap = await getDocs(qNext)
      } else {
        const qNext = query(colRef, startAfter(lastVisibleDoc), limit(BG_BATCH_SIZE))
        nextSnap = await getDocs(qNext)
      }

      if (sessionId !== activeSyncSession || nextSnap.empty) break

      const nextChunk = nextSnap.docs.map((d, idx) =>
        transformFirestoreDoc(d, orderCounter + idx)
      )
      orderCounter += nextChunk.length

      // Gộp nối tiếp vào danh sách hiện tại (tránh trùng ID nếu vừa tạo mới)
      const existingIds = new Set(reports.value.map((r) => r.id))
      const uniqueChunk = nextChunk.filter((item) => !existingIds.has(item.id))

      if (uniqueChunk.length > 0) {
        reports.value = [...reports.value, ...uniqueChunk]
        backgroundLoadedCount.value = reports.value.length
      }

      if (nextSnap.docs.length < BG_BATCH_SIZE) {
        break // Đã tải hết toàn bộ dữ liệu trong Database
      }
      lastVisibleDoc = nextSnap.docs[nextSnap.docs.length - 1]
    }
  } catch (err) {
    console.error('Lỗi tải phân trang Firestore:', err)
  } finally {
    if (sessionId === activeSyncSession) {
      isFirestoreLoading.value = false
      isBackgroundSyncing.value = false
    }
  }
}

// Kích hoạt tải 15 bản ghi đầu + tải ngầm ngay khi khởi chạy
if (isFirebaseConfigured && db) {
  loadReportsIncrementally()
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
    timer = setTimeout(() => {
      debouncedSearch.value = val
      currentPage.value = 1
    }, 200)
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
      const sub = list.filter((r) => String(r.process || '').toUpperCase() === key)
      const totalQty = sub.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
      const totalDefect = sub.reduce((s, r) => s + (Number(r.defectQuantity) || 0), 0)
      return {
        count: sub.length,
        percent: Math.round((sub.length / total) * 100),
        totalQty,
        totalDefect,
      }
    }
    const smt = calc('SMT')
    const ai = calc('AI')
    const dip = calc('DIP')
    const avr = calc('AVR')
    return {
      smt: smt.count,
      smtPercent: smt.percent,
      smtDetails: smt,
      ai: ai.count,
      aiPercent: ai.percent,
      aiDetails: ai,
      dip: dip.count,
      dipPercent: dip.percent,
      dipDetails: dip,
      avr: avr.count,
      avrPercent: avr.percent,
      avrDetails: avr,
    }
  })

  const stats = computed(() => {
    const list = reports.value
    return {
      total: list.length,
      open: list.filter((r) => r.status === 'open').length,
      investigating: list.filter((r) => r.status === 'investigating').length,
      resolved: list.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
    }
  })

  const filteredReports = computed(() => {
    const kw = (debouncedSearch.value || '').toLowerCase().trim()
    const filtered = reports.value.filter((r) => {
      if (
        processFilter.value !== 'all' &&
        String(r.process || '').toUpperCase() !== processFilter.value
      )
        return false
      if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
      if (
        activeStat.value === 'attention' &&
        r.status !== 'open' &&
        r.status !== 'investigating'
      )
        return false
      if (
        activeStat.value === 'resolved' &&
        r.status !== 'resolved' &&
        r.status !== 'closed'
      )
        return false
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
      return (a._orderIdx || 0) - (b._orderIdx || 0)
    })
  })

  const pagedReports = computed(() =>
    filteredReports.value.slice(
      (currentPage.value - 1) * pageSize,
      currentPage.value * pageSize
    )
  )

  function toggleDateSort() {
    isPageSwitching.value = true
    dateSortOrder.value = dateSortOrder.value === 'desc' ? 'asc' : 'desc'
    currentPage.value = 1
    setTimeout(() => {
      isPageSwitching.value = false
    }, 180)
  }

  function changePage(p) {
    isPageSwitching.value = true
    currentPage.value = p
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      isPageSwitching.value = false
    }, 200)
  }

  function handleImagesSelected(files) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const item = reactive({
        id: Date.now() + Math.random(),
        previewUrl: URL.createObjectURL(file),
        base64: '',
        name: file.name,
      })
      selectedFiles.value.push(item)
      compressImage(file, 1440, 1440, 0.85).then((res) => {
        item.base64 = res.base64
      })
    }
  }

  function removeExistingImage(idx) {
    existingImages.value.splice(idx, 1)
  }
  function removeSelectedFile(idx) {
    selectedFiles.value.splice(idx, 1)
  }
  function clearAllImages() {
    existingImages.value = []
    selectedFiles.value = []
  }

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

  // LƯU / SỬA BÁO CÁO (KÈM ALERT THÔNG BÁO THÀNH CÔNG RÕ RÀNG)
  async function saveReport() {
    isSaving.value = true
    const wasEditing = isEditing.value
    showLoading(
      wasEditing ? 'Đang cập nhật báo cáo...' : 'Đang tạo báo cáo mới...',
      'Đang tạo Thumbnail & lưu ảnh HD sắc nét...'
    )
    try {
      const uploaded = selectedFiles.value.map((i) => ({
        url: i.base64 || i.previewUrl,
        name: i.name,
      }))
      const finalImages = [...existingImages.value, ...uploaded].filter((i) => i && i.url)

      const thumbUrl =
        finalImages.length > 0
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
        images: [],
        creator: user.value?.displayName || user.value?.email || 'Admin',
      }

      if (wasEditing && editingId.value) {
        const targetId = editingId.value
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, REPORTS_COLLECTION, targetId), {
            ...payload,
            updatedAt: serverTimestamp(),
          })
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
        }

        const idx = reports.value.findIndex((x) => x.id === targetId)
        if (idx !== -1) {
          const updatedList = [...reports.value]
          updatedList[idx] = { ...updatedList[idx], ...payload, id: targetId }
          reports.value = updatedList
        }
        hdImagesCache.set(targetId, finalImages)
        isModalOpen.value = false
        hideLoading()
        showToast('✅ Đã sửa báo cáo thành công!')
        setTimeout(() => {
          window.alert('✅ Đã sửa báo cáo thành công!')
        }, 50)
      } else {
        let newId = 'ANOM-' + Date.now().toString().slice(-4)
        if (isFirebaseConfigured && db) {
          const newDocRef = doc(collection(db, REPORTS_COLLECTION))
          newId = newDocRef.id
          await setDoc(newDocRef, { ...payload, createdAtTimestamp: serverTimestamp() })
          if (finalImages.length > 0) {
            const imgBatch = writeBatch(db)
            finalImages.forEach((img, idx) => {
              imgBatch.set(doc(db, IMAGES_COLLECTION, `${newId}_${idx}`), {
                reportId: newId,
                index: idx,
                url: img.url,
                name: img.name || `Ảnh HD ${idx + 1}`,
              })
            })
            await imgBatch.commit()
          }
        }
        hdImagesCache.set(newId, finalImages)
        reports.value = [{ id: newId, ...payload }, ...reports.value]
        isModalOpen.value = false
        hideLoading()
        showToast('✅ Đã thêm báo cáo mới thành công!')
        setTimeout(() => {
          window.alert('✅ Đã thêm báo cáo mới thành công!')
        }, 50)
      }
    } catch (err) {
      hideLoading()
      window.alert('❌ Lỗi khi lưu báo cáo: ' + (err.message || ''))
    } finally {
      isSaving.value = false
      hideLoading()
    }
  }

  function removeReport(r) {
    reportToDelete.value = r
    showDeleteModal.value = true
  }
  function cancelDelete() {
    showDeleteModal.value = false
    reportToDelete.value = null
  }

  // XOÁ BÁO CÁO (KÈM ALERT THÔNG BÁO XOÁ THÀNH CÔNG RÕ RÀNG)
  async function executeDelete() {
    if (!reportToDelete.value) return
    isDeleting.value = true
    const target = reportToDelete.value
    const id = target.id
    const modelName = target.productModel || id
    showLoading('Đang xoá báo cáo...', modelName)

    try {
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
      reports.value = reports.value.filter((x) => x.id !== id)
      if (selectedReport.value?.id === id) {
        isDetailOpen.value = false
        selectedReport.value = null
      }
      showDeleteModal.value = false
      reportToDelete.value = null
      hideLoading()
      showToast('🗑️ Đã xoá báo cáo thành công!')
      setTimeout(() => {
        window.alert(`✅ Đã xoá báo cáo Model "${modelName}" thành công!`)
      }, 50)
    } catch (err) {
      hideLoading()
      window.alert('❌ Lỗi khi xoá báo cáo: ' + (err.message || ''))
    } finally {
      isDeleting.value = false
      hideLoading()
    }
  }

  // IMPORT EXCEL AN TOÀN & CẬP NHẬT DANH SÁCH NGAY LẬP TỨC
  async function batchImportReports(list) {
    if (!list?.length) return
    isImportingReports.value = true
    const newlyImportedItems = []

    try {
      if (isFirebaseConfigured && db) {
        const MAX_OPS_PER_BATCH = 25
        const MAX_BATCH_BYTES = 2 * 1024 * 1024 // 2 MB

        let batch = writeBatch(db)
        let currentOps = 0
        let currentBytes = 0

        const commitIfNeeded = async (extraOps, extraBytes, currentIdx) => {
          if (
            currentOps > 0 &&
            (currentOps + extraOps > MAX_OPS_PER_BATCH ||
              currentBytes + extraBytes > MAX_BATCH_BYTES)
          ) {
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
          const rawImages = Array.isArray(item.images)
            ? item.images.filter((x) => x && x.url)
            : []

          const thumbUrl =
            rawImages.length > 0
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
            images: [],
            orderIndex: i,
            createdAtTimestamp: serverTimestamp(),
          }

          const repBytes = JSON.stringify(reportPayload).length
          await commitIfNeeded(1, repBytes, i)
          batch.set(reportRef, reportPayload)
          currentOps++
          currentBytes += repBytes

          for (let imgIdx = 0; imgIdx < rawImages.length; imgIdx++) {
            const imgDocPayload = {
              reportId: reportRef.id,
              index: imgIdx,
              url: rawImages[imgIdx].url,
              name: rawImages[imgIdx].name || `row_${i + 1}_img_${imgIdx + 1}.webp`,
            }
            const imgBytes = JSON.stringify(imgDocPayload).length
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

          newlyImportedItems.push({
            ...reportPayload,
            id: reportRef.id,
            _sortDate: isoDate,
            _orderIdx: i,
          })
        }

        if (currentOps > 0) {
          showLoading(
            `Đang hoàn tất lưu (${list.length}/${list.length})...`,
            'Đang đóng gói lô cuối...',
            99
          )
          await batch.commit()
        }

        reports.value = [...newlyImportedItems, ...reports.value]
      } else {
        const enriched = list.map((item, idx) => ({
          ...item,
          date: toSortableISODate(item.date),
          _sortDate: toSortableISODate(item.date),
          _orderIdx: idx,
        }))
        reports.value = [...enriched, ...reports.value]
      }
      hideLoading()
      showToast(`✅ Đã nhập thành công ${list.length} báo cáo từ Excel!`)
      setTimeout(() => {
        window.alert(`✅ Đã nhập thành công ${list.length} báo cáo từ file Excel!`)
      }, 50)
    } finally {
      isImportingReports.value = false
    }
  }

  return {
    reports,
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
    toggleProcessFilter: (p) => {
      isPageSwitching.value = true
      processFilter.value = processFilter.value === p ? 'all' : p
      currentPage.value = 1
      setTimeout(() => {
        isPageSwitching.value = false
      }, 180)
    },
    filterByStat: (s) => {
      isPageSwitching.value = true
      activeStat.value = activeStat.value === s ? 'all' : s
      currentPage.value = 1
      setTimeout(() => {
        isPageSwitching.value = false
      }, 180)
    },
    resetFilters: () => {
      isPageSwitching.value = true
      searchText.value = ''
      statusFilter.value = 'all'
      processFilter.value = 'all'
      dateRange.value = null
      activeStat.value = 'all'
      currentPage.value = 1
      setTimeout(() => {
        isPageSwitching.value = false
      }, 180)
    },
    openCreate,
    openEdit,
    openDetail,
    closeDetail,
    saveReport,
    removeReport,
    batchImportReports,
    changePage,
    statusLabels: {
      open: 'Chưa xử lý',
      investigating: 'Đang điều tra',
      resolved: 'Đã hoàn thành',
      closed: 'Đã đóng',
    },
    statusClass: (s) => 'status-' + s,
  }
}
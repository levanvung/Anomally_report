import { computed, reactive, ref, shallowRef, triggerRef, watch } from 'vue'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/config.js'
import { useAuth } from './useAuth.js'
import { compressImage, formatFileSize } from '../utils/imageCompressor.js'

export { formatFileSize }
export const commonProcesses = ['SMT', 'AI', 'DIP', 'AVR']

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

if (isFirebaseConfigured && db) {
  isFirestoreLoading.value = true
  onSnapshot(collection(db, 'manufacturing_reports'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
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
      const sub = list.filter(r => String(r.process || '').toUpperCase().startsWith(key))
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
    return reports.value.filter((r) => {
      if (processFilter.value !== 'all' && !String(r.process || '').toUpperCase().startsWith(processFilter.value)) return false
      if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
      if (activeStat.value === 'attention' && r.status !== 'open' && r.status !== 'investigating') return false
      if (activeStat.value === 'resolved' && r.status !== 'resolved' && r.status !== 'closed') return false
      if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
        const d = String(r.date || '').slice(0, 10)
        if (d < dateRange.value[0] || d > dateRange.value[1]) return false
      }
      if (kw) {
        const hay = `${r.productModel} ${r.process} ${r.machine} ${r.defectDescription} ${r.responsiblePerson} ${r.progressNote}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  })

  const pagedReports = computed(() =>
    filteredReports.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
  )

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
    try {
      const uploaded = selectedFiles.value.map(i => ({ url: i.base64 || i.previewUrl, name: i.name }))
      const finalImages = [...existingImages.value, ...uploaded]
      const payload = {
        ...form,
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
      } else {
        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, 'manufacturing_reports'), { ...payload, createdAtTimestamp: serverTimestamp() })
        } else {
          reports.value = [{ id: 'ANOM-' + Date.now().toString().slice(-4), ...payload }, ...reports.value]
        }
      }
      isModalOpen.value = false
    } finally {
      isSaving.value = false
    }
  }

  function removeReport(r) { reportToDelete.value = r; showDeleteModal.value = true }
  function cancelDelete() { showDeleteModal.value = false; reportToDelete.value = null }

  async function executeDelete() {
    if (!reportToDelete.value) return
    isDeleting.value = true
    try {
      const id = reportToDelete.value.id
      if (isFirebaseConfigured && db) await deleteDoc(doc(db, 'manufacturing_reports', id))
      reports.value = reports.value.filter(x => x.id !== id)
      showDeleteModal.value = false
    } finally {
      isDeleting.value = false
    }
  }

  async function batchImportReports(list) {
    if (!list?.length) return
    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db)
      list.slice(0, 350).forEach(item => {
        batch.set(doc(collection(db, 'manufacturing_reports')), { ...item, createdAtTimestamp: serverTimestamp() })
      })
      await batch.commit()
    } else {
      reports.value = [...list, ...reports.value]
    }
  }

  return {
    reports, isFirestoreLoading, searchText, statusFilter, processFilter, dateRange, activeStat,
    currentPage, pageSize, isModalOpen, isEditing, isSaving, showDeleteModal, reportToDelete, isDeleting,
    cancelDelete, executeDelete, isDetailOpen, selectedReport, form, existingImages, selectedFiles,
    totalImagesCount, handleImagesSelected, removeExistingImage, removeSelectedFile, clearAllImages,
    getReportImages, onQuantityOrDefectChange, filteredReports, pagedReports, stats, processStats,
    toggleProcessFilter: (p) => { processFilter.value = processFilter.value === p ? 'all' : p; currentPage.value = 1 },
    filterByStat: (s) => { activeStat.value = activeStat.value === s ? 'all' : s; currentPage.value = 1 },
    resetFilters: () => { searchText.value = ''; statusFilter.value = 'all'; processFilter.value = 'all'; dateRange.value = null; activeStat.value = 'all'; currentPage.value = 1 },
    openCreate, openEdit, openDetail, closeDetail, saveReport, removeReport, batchImportReports,
    changePage: (p) => { currentPage.value = p },
    statusLabels: { open: 'Chưa xử lý', investigating: 'Đang điều tra', resolved: 'Đã hoàn thành', closed: 'Đã đóng' },
    statusClass: (s) => 'status-' + s,
  }
}

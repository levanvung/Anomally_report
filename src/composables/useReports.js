import { computed, reactive, ref } from 'vue'
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
import { db, storage, isFirebaseConfigured } from '../firebase/config'
import { useAuth } from './useAuth'
import { useI18n } from './useI18n'

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
  if (data) {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].productModel) {
        return parsed
      }
    } catch {
      // Fallback
    }
  }
  saveLocalReports(initialReports)
  return initialReports
}

function saveLocalReports(data) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
}

const reports = ref(loadLocalReports())
const isFirestoreLoading = ref(false)

// Khởi tạo Firestore realtime listener nếu cấu hình Firebase
if (isFirebaseConfigured && db) {
  isFirestoreLoading.value = true
  try {
    const q = query(collection(db, 'manufacturing_reports'), orderBy('createdAtTimestamp', 'desc'))
    onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          reports.value = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        } else {
          seedInitialFirestoreData()
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
  if (!isFirebaseConfigured || !db) return
  try {
    for (const item of initialReports) {
      const { id, ...rest } = item
      await addDoc(collection(db, 'manufacturing_reports'), {
        ...rest,
        code: id,
        createdAtTimestamp: serverTimestamp(),
      })
    }
  } catch (e) {
    console.error('Lỗi khi nạp dữ liệu mẫu vào Firestore:', e)
  }
}

const severityClass = (severity) => `severity-${severity}`
const statusClass = (status) => `status-${status}`

const stats = computed(() => ({
  total: reports.value.length,
  open: reports.value.filter((r) => r.status === 'open').length,
  investigating: reports.value.filter((r) => r.status === 'investigating').length,
  resolved: reports.value.filter((r) => ['resolved', 'closed'].includes(r.status)).length,
  critical: reports.value.filter((r) => r.severity === 'critical' || parseFloat(r.defectRate) >= 10).length,
}))

export const commonProcesses = [
  'SMT',
  'Đúc ép nhựa',
  'Lắp ráp',
  'Hàn bo mạch',
  'Gia công CNC',
  'Sơn bề mặt',
  'Kiểm tra FQC',
  'Đóng gói',
]

export function useReports() {
  const { user } = useAuth()
  const { t, severityLabels, statusLabels, categoryOptions } = useI18n()

  const searchText = ref('')
  const statusFilter = ref('all')
  const severityFilter = ref('all')
  const processFilter = ref('all')
  const activeStat = ref('all')
  const currentPage = ref(1)
  const pageSize = 8

  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const isSaving = ref(false)

  const isDetailOpen = ref(false)
  const selectedReport = ref(null)

  const selectedImageFile = ref(null)
  const imagePreviewUrl = ref('')

  const emptyForm = () => {
    const today = new Date().toISOString().split('T')[0]
    return {
      date: today,
      process: 'Lắp ráp',
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

  const filteredReports = computed(() =>
    reports.value.filter((report) => {
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
        matchesProcess = report.process === processFilter.value
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

  function resetFilters() {
    searchText.value = ''
    statusFilter.value = 'all'
    severityFilter.value = 'all'
    processFilter.value = 'all'
    activeStat.value = 'all'
    currentPage.value = 1
  }

  function handleImageSelected(file) {
    if (!file) return
    selectedImageFile.value = file
    imagePreviewUrl.value = URL.createObjectURL(file)
  }

  function removeAttachedImage() {
    selectedImageFile.value = null
    imagePreviewUrl.value = ''
    form.imageUrl = ''
    form.imagePath = ''
  }

  function openCreate() {
    Object.assign(form, emptyForm())
    selectedImageFile.value = null
    imagePreviewUrl.value = ''
    editingId.value = null
    isEditing.value = false
    isModalOpen.value = true
  }

  function openEdit(report) {
    Object.assign(form, {
      ...emptyForm(),
      ...report,
    })
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

  async function uploadImageFile(file) {
    if (!file) return { url: '', path: '' }

    if (isFirebaseConfigured && storage) {
      try {
        const filePath = `reports/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
        const fileRef = storageRef(storage, filePath)
        const snapshot = await uploadBytes(fileRef, file)
        const downloadUrl = await getDownloadURL(snapshot.ref)
        return { url: downloadUrl, path: filePath }
      } catch (err) {
        console.warn('Upload Firebase Storage thất bại, fallback Base64:', err)
      }
    }

    try {
      const base64 = await fileToBase64(file)
      return { url: base64, path: '' }
    } catch (e) {
      console.error('Lỗi chuyển ảnh:', e)
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
    if (!form.productModel || !form.machine || !form.defectDescription) {
      alert('Vui lòng nhập Product model, Machine và Defect description!')
      return
    }
    isSaving.value = true

    try {
      let finalImageUrl = form.imageUrl
      let finalImagePath = form.imagePath

      if (selectedImageFile.value) {
        const uploadRes = await uploadImageFile(selectedImageFile.value)
        finalImageUrl = uploadRes.url
        finalImagePath = uploadRes.path
      }

      const calculatedRate = calculateDefectRate(form.defectQuantity, form.quantity)

      const reportPayload = {
        date: form.date || new Date().toISOString().split('T')[0],
        process: form.process || 'Lắp ráp',
        productModel: form.productModel.trim(),
        machine: form.machine.trim(),
        quantity: Number(form.quantity) || 0,
        defectQuantity: Number(form.defectQuantity) || 0,
        defectRate: calculatedRate,
        responsiblePerson: form.responsiblePerson || 'Quản lý chuyền',
        assignee: form.assignee || (user.value ? user.value.displayName : 'QA Engineer'),
        defectDescription: form.defectDescription.trim(),
        progressNote: form.progressNote ? form.progressNote.trim() : '',
        creator: form.creator || (user.value ? (user.value.displayName || user.value.email) : 'Admin'),
        status: form.status || 'open',
        severity: form.severity || 'low',
        imageUrl: finalImageUrl || '',
        imagePath: finalImagePath || '',
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
      }

      isModalOpen.value = false
    } catch (err) {
      console.error('Lỗi khi lưu báo cáo:', err)
      alert('Không thể lưu báo cáo: ' + (err.message || 'Lỗi không xác định'))
    } finally {
      isSaving.value = false
    }
  }

  async function removeReport(report) {
    if (!window.confirm(`${t('confirmDelete')} [${report.id}] "${report.productModel} - ${report.process}"?`)) {
      return
    }

    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'manufacturing_reports', report.id))

        if (report.imagePath && storage) {
          try {
            await deleteObject(storageRef(storage, report.imagePath))
          } catch (e) {
            console.warn('Không thể xoá ảnh trên Storage:', e)
          }
        }
      }

      reports.value = reports.value.filter((item) => item.id !== report.id)
      saveLocalReports(reports.value)

      if (selectedReport.value && selectedReport.value.id === report.id) {
        isDetailOpen.value = false
      }
    } catch (err) {
      console.error('Lỗi xoá báo cáo:', err)
      alert('Không thể xoá báo cáo: ' + (err.message || 'Lỗi không xác định'))
    }
  }

  function changePage(page) {
    currentPage.value = page
  }

  return {
    reports,
    isFirestoreLoading,
    searchText,
    statusFilter,
    severityFilter,
    processFilter,
    activeStat,
    currentPage,
    pageSize,
    isModalOpen,
    isEditing,
    editingId,
    isSaving,
    isDetailOpen,
    selectedReport,
    form,
    selectedImageFile,
    imagePreviewUrl,
    handleImageSelected,
    removeAttachedImage,
    onQuantityOrDefectChange,
    filteredReports,
    pagedReports,
    stats,
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
    changePage,
  }
}

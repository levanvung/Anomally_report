import { computed, reactive, ref, onMounted } from 'vue'
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

const LOCAL_STORAGE_KEY = 'sentinel_reports_data'

const initialReports = [
  {
    id: 'ABN-2409',
    title: 'Sai lệch tồn kho khu vực miền Nam',
    category: 'Kho vận',
    severity: 'critical',
    status: 'investigating',
    site: 'Kho Sóng Thần',
    assignee: 'Nguyễn Minh',
    createdAt: '16/09/2026',
    description: 'Số lượng thực tế thấp hơn dữ liệu hệ thống sau đợt kiểm kê cuối ngày. Cần đối soát lại hệ thống quét mã vạch và các phiếu xuất kho trong ca đêm.',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    imagePath: '',
  },
  {
    id: 'ABN-2408',
    title: 'Truy cập bất thường ngoài giờ làm việc',
    category: 'Bảo mật',
    severity: 'high',
    status: 'open',
    site: 'Văn phòng Hà Nội',
    assignee: 'Lê Hoàng',
    createdAt: '16/09/2026',
    description: 'Phát hiện đăng nhập từ dải IP chưa xác thực vào lúc 02:14 sáng với quyền hạn chỉnh sửa cấu hình hệ thống máy chủ.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    imagePath: '',
  },
  {
    id: 'ABN-2407',
    title: 'Nhiệt độ dây chuyền sản xuất vượt ngưỡng',
    category: 'Vận hành',
    severity: 'high',
    status: 'investigating',
    site: 'Nhà máy Bắc Ninh',
    assignee: 'Trần An',
    createdAt: '15/09/2026',
    description: 'Cảm biến IoT ghi nhận nhiệt độ lò sấy vượt 15% ngưỡng an toàn trong 8 phút liên tục, có nguy cơ ngắt tự động toàn tuyến.',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    imagePath: '',
  },
  {
    id: 'ABN-2406',
    title: 'Giao dịch hoàn tiền trùng lặp ví điện tử',
    category: 'Tài chính',
    severity: 'medium',
    status: 'resolved',
    site: 'Hệ thống thanh toán',
    assignee: 'Phạm Linh',
    createdAt: '14/09/2026',
    description: 'Một khách hàng nhận hai yêu cầu hoàn tiền cho cùng một đơn hàng do lỗi nghẽn webhook từ cổng thanh toán.',
    imageUrl: '',
    imagePath: '',
  },
  {
    id: 'ABN-2405',
    title: 'Thiếu chữ ký biên bản bàn giao ca trực',
    category: 'Tuân thủ',
    severity: 'low',
    status: 'closed',
    site: 'Chi nhánh Đà Nẵng',
    assignee: 'Đỗ Vân',
    createdAt: '13/09/2026',
    description: 'Biên bản bàn giao thiết bị phòng máy ca đêm chưa có xác nhận của trưởng nhóm kỹ thuật.',
    imageUrl: '',
    imagePath: '',
  },
  {
    id: 'ABN-2404',
    title: 'Độ trễ đồng bộ dữ liệu khách hàng CRM',
    category: 'Hệ thống',
    severity: 'medium',
    status: 'open',
    site: 'CRM trung tâm',
    assignee: 'Nguyễn Minh',
    createdAt: '12/09/2026',
    description: 'Dữ liệu khách hàng mới đồng bộ chậm hơn cam kết SLA 30 phút do hàng đợi tin nhắn Kafka bị đầy bộ đệm.',
    imageUrl: '',
    imagePath: '',
  },
  {
    id: 'ABN-2403',
    title: 'Nghi ngờ sử dụng tài khoản chia sẻ nội bộ',
    category: 'Bảo mật',
    severity: 'high',
    status: 'resolved',
    site: 'Văn phòng HCM',
    assignee: 'Lê Hoàng',
    createdAt: '11/09/2026',
    description: 'Tài khoản quản lý kho được truy cập đồng thời từ hai địa chỉ MAC khác nhau tại hai tòa nhà.',
    imageUrl: '',
    imagePath: '',
  },
  {
    id: 'ABN-2402',
    title: 'Chênh lệch số liệu kiểm đếm kiện hàng',
    category: 'Kho vận',
    severity: 'low',
    status: 'closed',
    site: 'Kho Long Biên',
    assignee: 'Trần An',
    createdAt: '10/09/2026',
    description: 'Số kiện thực tế trên biên bản giấy và hệ thống phần mềm lệch nhau một đơn vị, đã rà soát và bù chứng từ.',
    imageUrl: '',
    imagePath: '',
  },
]

function loadLocalReports() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (data) {
    try {
      const parsed = JSON.parse(data)
      const hasAnyImage = parsed.some((r) => r.imageUrl)
      if (!hasAnyImage) {
        parsed.forEach((r) => {
          const match = initialReports.find((i) => i.id === r.id)
          if (match && match.imageUrl) r.imageUrl = match.imageUrl
        })
        saveLocalReports(parsed)
      }
      return parsed
    } catch {
      return initialReports
    }
  }
  return initialReports
}

function saveLocalReports(data) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
}

const reports = ref(loadLocalReports())
const isFirestoreLoading = ref(false)

// Khởi tạo Firestore listener nếu đã cấu hình Firebase
if (isFirebaseConfigured && db) {
  isFirestoreLoading.value = true
  try {
    const q = query(collection(db, 'reports'), orderBy('createdAtTimestamp', 'desc'))
    onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          reports.value = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        } else {
          // Nếu Firestore còn trống, tự động nạp dữ liệu mẫu ban đầu
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
      await addDoc(collection(db, 'reports'), {
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
  critical: reports.value.filter((r) => r.severity === 'critical').length,
}))

export function useReports() {
  const { user } = useAuth()
  const { t, severityLabels, statusLabels, categoryOptions } = useI18n()

  const searchText = ref('')
  const statusFilter = ref('all')
  const severityFilter = ref('all')
  const activeStat = ref('all') // 'all' | 'attention' | 'investigating' | 'resolved'
  const currentPage = ref(1)
  const pageSize = 7

  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const isSaving = ref(false)

  const isDetailOpen = ref(false)
  const selectedReport = ref(null)

  // Quản lý file ảnh đính kèm
  const selectedImageFile = ref(null)
  const imagePreviewUrl = ref('')

  const emptyForm = () => ({
    title: '',
    category: 'Vận hành',
    severity: 'medium',
    status: 'open',
    site: '',
    assignee: user.value ? user.value.displayName : 'Nguyễn Minh',
    description: '',
    imageUrl: '',
    imagePath: '',
  })

  const form = reactive(emptyForm())

  const filteredReports = computed(() =>
    reports.value.filter((report) => {
      const keyword = searchText.value.toLowerCase().trim()
      const matchesSearch =
        !keyword ||
        [report.id, report.title, report.site, report.assignee, report.category].some((v) =>
          v ? v.toLowerCase().includes(keyword) : false
        )

      // Stat filter
      let matchesStat = true
      if (activeStat.value === 'attention') {
        matchesStat = report.status === 'open' || report.status === 'investigating'
      } else if (activeStat.value === 'investigating') {
        matchesStat = report.status === 'investigating'
      } else if (activeStat.value === 'resolved') {
        matchesStat = report.status === 'resolved' || report.status === 'closed'
      }

      // Dropdown status filter
      let matchesStatus = true
      if (statusFilter.value !== 'all') {
        matchesStatus = report.status === statusFilter.value
      }

      // Dropdown severity filter
      let matchesSeverity = true
      if (severityFilter.value !== 'all') {
        matchesSeverity = report.severity === severityFilter.value
      }

      return matchesSearch && matchesStat && matchesStatus && matchesSeverity
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
    Object.assign(form, report)
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

  // Chuyển File sang Base64 cho trường hợp fallback nếu Firebase Storage chưa mở quyền
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

    // Nếu có Firebase Storage
    if (isFirebaseConfigured && storage) {
      try {
        const filePath = `reports/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
        const fileRef = storageRef(storage, filePath)
        const snapshot = await uploadBytes(fileRef, file)
        const downloadUrl = await getDownloadURL(snapshot.ref)
        return { url: downloadUrl, path: filePath }
      } catch (err) {
        console.warn('Upload Firebase Storage thất bại, chuyển sang Base64 fallback:', err)
      }
    }

    // Fallback: chuyển thành Base64 Data URL
    try {
      const base64 = await fileToBase64(file)
      return { url: base64, path: '' }
    } catch (e) {
      console.error('Lỗi chuyển đổi ảnh:', e)
      return { url: '', path: '' }
    }
  }

  async function updateStatus(reportId, newStatus) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'reports', reportId)
        await updateDoc(docRef, { status: newStatus })
      } catch (err) {
        console.error('Lỗi cập nhật trạng thái trên Firestore:', err)
      }
    }

    // Cập nhật local
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
    if (!form.title || !form.site || !form.description) return
    isSaving.value = true

    try {
      // Xử lý upload ảnh nếu có file mới được chọn
      let finalImageUrl = form.imageUrl
      let finalImagePath = form.imagePath

      if (selectedImageFile.value) {
        const uploadRes = await uploadImageFile(selectedImageFile.value)
        finalImageUrl = uploadRes.url
        finalImagePath = uploadRes.path
      }

      const reportPayload = {
        title: form.title,
        category: form.category,
        severity: form.severity,
        status: form.status,
        site: form.site,
        assignee: form.assignee || (user.value ? user.value.displayName : 'Nguyễn Minh'),
        description: form.description,
        imageUrl: finalImageUrl,
        imagePath: finalImagePath,
        createdAt: form.createdAt || new Date().toLocaleDateString('vi-VN'),
      }

      if (isEditing.value && editingId.value) {
        // UPDATE
        if (isFirebaseConfigured && db) {
          const docRef = doc(db, 'reports', editingId.value)
          await updateDoc(docRef, {
            ...reportPayload,
            updatedAt: serverTimestamp(),
          })
        }

        // Cập nhật local
        const index = reports.value.findIndex((r) => r.id === editingId.value)
        if (index !== -1) {
          reports.value[index] = { ...reports.value[index], ...reportPayload }
          if (selectedReport.value && selectedReport.value.id === editingId.value) {
            selectedReport.value = { ...reports.value[index] }
          }
          saveLocalReports(reports.value)
        }
      } else {
        // CREATE
        let newDocId = `ABN-${Date.now().toString().slice(-4)}`

        if (isFirebaseConfigured && db) {
          const docRef = await addDoc(collection(db, 'reports'), {
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
    if (!window.confirm(`${t('confirmDelete')} [${report.id}] "${report.title}"?`)) {
      return
    }

    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'reports', report.id))

        // Xoá ảnh trên storage nếu có
        if (report.imagePath && storage) {
          try {
            await deleteObject(storageRef(storage, report.imagePath))
          } catch (e) {
            console.warn('Không thể xoá ảnh trên Storage:', e)
          }
        }
      }

      // Xoá local
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
    filteredReports,
    pagedReports,
    stats,
    t,
    severityLabels,
    statusLabels,
    categoryOptions,
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

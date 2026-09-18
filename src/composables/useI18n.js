import { ref, computed } from 'vue'

const LOCALE_STORAGE_KEY = 'sentinel_locale'
const currentLocale = ref(localStorage.getItem(LOCALE_STORAGE_KEY) || 'vi')

export const messages = {
  vi: {
    // Header & App
    brandName: 'Sentinel',
    brandSub: 'QUẢN LÝ BẤT THƯỜNG',
    systemStatus: 'Hệ thống trực tuyến · Giám sát thời gian thực',
    notifications: 'Thông báo hệ thống',
    notificationsDesc: 'Hiện có 3 báo cáo bất thường cần được phân loại và xử lý trong hôm nay.',
    userRole: 'Quản trị viên',
    themeDark: 'Chuyển sang chế độ sáng',
    themeLight: 'Chuyển sang chế độ tối',
    language: 'Ngôn ngữ',

    // Page Heading
    eyebrow: 'TRUNG TÂM THEO DÕI SỰ CỐ • VẬN HÀNH THỜI GIAN THỰC',
    title: 'Báo cáo bất thường',
    subtitle: 'Hệ thống giám sát, phát hiện và cập nhật tiến độ xử lý các sự vụ, rủi ro và tín hiệu bất thường trong toàn doanh nghiệp.',
    createNew: 'Báo cáo bất thường mới',

    // Stats
    totalReports: 'Tổng số sự vụ',
    totalFoot: 'toàn bộ dữ liệu ghi nhận',
    attentionNeeded: 'Cần chú ý xử lý',
    attentionFoot: 'cần kiểm soát trong 24h',
    highPriority: 'Ưu tiên cao',
    investigating: 'Đang điều tra',
    investigatingFoot: 'đội kỹ thuật đang xử lý',
    resolved: 'Đã giải quyết',
    resolvedRate: 'tỷ lệ hoàn tất',
    activeFilter: 'Đang lọc',

    // Search & Filter
    searchPlaceholder: 'Tìm theo mã sự vụ, tiêu đề, địa điểm, nhân sự...',
    allStatuses: 'Tất cả trạng thái',
    allSeverities: 'Tất cả mức độ',
    resetFilter: 'Đặt lại',
    quickFilterLabel: 'Lọc nhanh:',
    filterAll: 'Tất cả',
    filterUrgent: '⚡ Cần xử lý gấp',
    filterCritical: '🔥 Nghiêm trọng',
    filterInvestigating: '🔍 Đang điều tra',
    filterResolved: '✅ Đã giải quyết',

    // Table
    colReport: 'MÃ & TIÊU ĐỀ SỰ VỤ',
    colImage: 'HÌNH ẢNH',
    colSeverity: 'MỨC ĐỘ',
    colStatus: 'TRẠNG THÁI',
    colSite: 'ĐỊA ĐIỂM',
    colAssignee: 'NGƯỜI XỬ LÝ',
    colActions: 'THAO TÁC',
    actionView: 'Xem chi tiết',
    actionEdit: 'Chỉnh sửa',
    actionDelete: 'Xoá',
    confirmDelete: 'Bạn có chắc chắn muốn xoá báo cáo',
    emptyTitle: 'Không tìm thấy báo cáo bất thường phù hợp',
    emptyDesc: 'Vui lòng thử thay đổi từ khoá tìm kiếm hoặc đặt lại các bộ lọc trạng thái.',
    showingCount: 'Hiển thị {paged} trên tổng số {total} báo cáo',

    // Severities
    severityCritical: 'Nghiêm trọng',
    severityHigh: 'Cao',
    severityMedium: 'Trung bình',
    severityLow: 'Thấp',

    // Statuses
    statusOpen: 'Mới tạo',
    statusInvestigating: 'Đang xử lý',
    statusResolved: 'Đã giải quyết',
    statusClosed: 'Đã đóng',

    // Categories
    catOperations: 'Vận hành',
    catWarehouse: 'Kho vận',
    catSecurity: 'Bảo mật',
    catFinance: 'Tài chính',
    catCompliance: 'Tuân thủ',
    catSystem: 'Hệ thống',

    // Detail Modal
    detailCategory: 'Danh mục sự cố',
    detailSite: 'Địa điểm phát sinh',
    detailAssignee: 'Người phụ trách xử lý',
    detailCreatedAt: 'Thời điểm ghi nhận',
    quickStatusUpdate: 'Cập nhật nhanh trạng thái:',
    editInfo: 'Sửa thông tin',

    // Form Modal
    modalCreateTitle: 'Tạo báo cáo bất thường mới',
    modalEditTitle: 'Chỉnh sửa báo cáo bất thường',
    labelTitle: 'Tiêu đề sự cố / bất thường',
    placeholderTitle: 'Ví dụ: Sai lệch số liệu kiểm kê kho ca tối',
    labelCategory: 'Danh mục sự cố',
    labelSeverity: 'Mức độ nghiêm trọng',
    labelSite: 'Địa điểm phát sinh',
    placeholderSite: 'Nhập chi nhánh, nhà máy, hệ thống...',
    labelAssignee: 'Người phụ trách xử lý',
    placeholderAssignee: 'Tên nhân sự phụ trách',
    labelStatus: 'Trạng thái hiện tại',
    labelDescription: 'Mô tả chi tiết sự vụ',
    placeholderDescription: 'Mô tả chi tiết nguyên nhân, diễn biến, mức độ ảnh hưởng và các biện pháp sơ bộ đã thực hiện...',
    labelImage: 'Ảnh minh chứng / Hiện trường sự cố',
    uploadImagePlaceholder: 'Nhấp hoặc kéo thả ảnh minh chứng vào đây',
    imageFormatNotice: 'Hỗ trợ định dạng JPG, PNG, WEBP (tối đa 5MB)',
    removeImage: 'Gỡ bỏ ảnh',
    viewFullImage: 'Xem ảnh phóng to',
    hasImage: 'Có đính kèm ảnh',
    noImage: 'Chưa có ảnh',
    logout: 'Đăng xuất',
    logoutConfirm: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
    btnSave: 'Lưu báo cáo',
    btnCancel: 'Huỷ bỏ',
  },

  en: {
    // Header & App
    brandName: 'Sentinel',
    brandSub: 'ANOMALY OPERATIONS',
    systemStatus: 'System Online · Real-time Monitoring',
    notifications: 'System Notifications',
    notificationsDesc: 'There are 3 anomaly reports requiring triage and response today.',
    userRole: 'Administrator',
    themeDark: 'Switch to Light Mode',
    themeLight: 'Switch to Dark Mode',
    language: 'Language',

    // Page Heading
    eyebrow: 'INCIDENT OPERATIONS CENTER • REAL-TIME STREAM',
    title: 'Anomaly Reports',
    subtitle: 'Enterprise platform to detect, classify, and track resolution workflows for anomalies, hazards, and operational risks.',
    createNew: 'New Anomaly Report',

    // Stats
    totalReports: 'Total Incidents',
    totalFoot: 'all recorded entries',
    attentionNeeded: 'Action Required',
    attentionFoot: 'requires control in 24h',
    highPriority: 'High Priority',
    investigating: 'Investigating',
    investigatingFoot: 'active team response',
    resolved: 'Resolved',
    resolvedRate: 'resolution rate',
    activeFilter: 'Filtering',

    // Search & Filter
    searchPlaceholder: 'Search by ID, title, site, assignee...',
    allStatuses: 'All Statuses',
    allSeverities: 'All Severities',
    resetFilter: 'Reset',
    quickFilterLabel: 'Quick filter:',
    filterAll: 'All',
    filterUrgent: '⚡ Urgent Action',
    filterCritical: '🔥 Critical',
    filterInvestigating: '🔍 Investigating',
    filterResolved: '✅ Resolved',

    // Table
    colReport: 'INCIDENT & TITLE',
    colImage: 'PHOTO',
    colSeverity: 'SEVERITY',
    colStatus: 'STATUS',
    colSite: 'LOCATION',
    colAssignee: 'ASSIGNEE',
    colActions: 'ACTIONS',
    actionView: 'View Details',
    actionEdit: 'Edit',
    actionDelete: 'Delete',
    confirmDelete: 'Are you sure you want to delete report',
    emptyTitle: 'No matching anomaly reports found',
    emptyDesc: 'Try adjusting your search keywords or resetting filter parameters.',
    showingCount: 'Showing {paged} of {total} reports',

    // Severities
    severityCritical: 'Critical',
    severityHigh: 'High',
    severityMedium: 'Medium',
    severityLow: 'Low',

    // Statuses
    statusOpen: 'Open',
    statusInvestigating: 'Investigating',
    statusResolved: 'Resolved',
    statusClosed: 'Closed',

    // Categories
    catOperations: 'Operations',
    catWarehouse: 'Logistics',
    catSecurity: 'Security',
    catFinance: 'Finance',
    catCompliance: 'Compliance',
    catSystem: 'System',

    // Detail Modal
    detailCategory: 'Category',
    detailSite: 'Site / Location',
    detailAssignee: 'Assignee',
    detailCreatedAt: 'Reported At',
    quickStatusUpdate: 'Quick Status Change:',
    editInfo: 'Edit Report',

    // Form Modal
    modalCreateTitle: 'Create New Anomaly Report',
    modalEditTitle: 'Edit Anomaly Report',
    labelTitle: 'Incident Title',
    placeholderTitle: 'e.g. Discrepancy in evening warehouse stock audit',
    labelCategory: 'Category',
    labelSeverity: 'Severity Level',
    labelSite: 'Location / Facility',
    placeholderSite: 'Enter facility, warehouse, branch, system...',
    labelAssignee: 'Assignee',
    placeholderAssignee: 'Responsible staff name',
    labelStatus: 'Current Status',
    labelDescription: 'Detailed Description',
    placeholderDescription: 'Describe root cause, timeline, impact, and initial remediation steps taken...',
    labelImage: 'Incident Evidence / Site Photos',
    uploadImagePlaceholder: 'Click or drag and drop evidence photo here',
    imageFormatNotice: 'Supports JPG, PNG, WEBP (up to 5MB)',
    removeImage: 'Remove Photo',
    viewFullImage: 'View Full Image',
    hasImage: 'Photo Attached',
    noImage: 'No photo',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to sign out?',
    btnSave: 'Save Report',
    btnCancel: 'Cancel',
  },

  zh: {
    // Header & App
    brandName: 'Sentinel',
    brandSub: '异常事件运营中心',
    systemStatus: '系统在线 · 全时段实时监测',
    notifications: '系统通知',
    notificationsDesc: '今日有 3 起异常报告需要进行分类和处理。',
    userRole: '系统管理员',
    themeDark: '切换到浅色模式',
    themeLight: '切换到深色模式',
    language: '语言设置',

    // Page Heading
    eyebrow: '事件应急中心 • 实时监控运营',
    title: '异常事件报告',
    subtitle: '面向全企业的异常事件监测、风险识别、分类响应与闭环处置平台。',
    createNew: '新建异常报告',

    // Stats
    totalReports: '事件总数',
    totalFoot: '全部归档记录',
    attentionNeeded: '待重点处置',
    attentionFoot: '须24小时内处理',
    highPriority: '高优先级',
    investigating: '正在调查',
    investigatingFoot: '专班跟进处理中',
    resolved: '已解决',
    resolvedRate: '闭环解决率',
    activeFilter: '已筛选',

    // Search & Filter
    searchPlaceholder: '按编号、标题、地点、负责人搜索...',
    allStatuses: '全部状态',
    allSeverities: '全部等级',
    resetFilter: '重置筛选',
    quickFilterLabel: '快捷筛选：',
    filterAll: '全部',
    filterUrgent: '⚡ 紧急跟进',
    filterCritical: '🔥 严重级别',
    filterInvestigating: '🔍 调查中',
    filterResolved: '✅ 已解决',

    // Table
    colReport: '编号与事件标题',
    colImage: '现场照片',
    colSeverity: '严重级别',
    colStatus: '处置状态',
    colSite: '发生地点',
    colAssignee: '处置人员',
    colActions: '操作',
    actionView: '查看详情',
    actionEdit: '编辑',
    actionDelete: '删除',
    confirmDelete: '确定要删除此异常报告吗',
    emptyTitle: '未找到符合条件的异常报告',
    emptyDesc: '请尝试修改搜索词或重置筛选状态。',
    showingCount: '显示 {paged} / {total} 条报告',

    // Severities
    severityCritical: '严重',
    severityHigh: '高',
    severityMedium: '中',
    severityLow: '低',

    // Statuses
    statusOpen: '新建',
    statusInvestigating: '处理中',
    statusResolved: '已解决',
    statusClosed: '已关闭',

    // Categories
    catOperations: '运营',
    catWarehouse: '仓储物流',
    catSecurity: '安全',
    catFinance: '财务',
    catCompliance: '合规',
    catSystem: '系统基础设施',

    // Detail Modal
    detailCategory: '事件类别',
    detailSite: '发生地点',
    detailAssignee: '处置责任人',
    detailCreatedAt: '登记时间',
    quickStatusUpdate: '快捷更新处置状态：',
    editInfo: '编辑报告信息',

    // Form Modal
    modalCreateTitle: '创建新异常报告',
    modalEditTitle: '编辑异常报告',
    labelTitle: '异常事件标题',
    placeholderTitle: '例如：晚班仓库盘点数据存在偏差',
    labelCategory: '事件类别',
    labelSeverity: '严重级别',
    labelSite: '发生地点 / 设施',
    placeholderSite: '输入分支机构、仓库、厂区或系统...',
    labelAssignee: '处置人员',
    placeholderAssignee: '负责跟进的人员姓名',
    labelStatus: '当前状态',
    labelDescription: '详细描述',
    placeholderDescription: '详细说明事件起因、发展经过、影响面及初步处置措施...',
    labelImage: '现场凭证 / 照片证据',
    uploadImagePlaceholder: '点击或拖拽现场照片至此处',
    imageFormatNotice: '支持 JPG, PNG, WEBP（最大 5MB）',
    removeImage: '移除照片',
    viewFullImage: '查看大图',
    hasImage: '附有现场照片',
    noImage: '暂无照片',
    logout: '退出登录',
    logoutConfirm: '确定要退出登录吗？',
    btnSave: '保存报告',
    btnCancel: '取消',
  },
}

export function useI18n() {
  function setLocale(newLocale) {
    if (['vi', 'en', 'zh'].includes(newLocale)) {
      currentLocale.value = newLocale
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    }
  }

  function t(key, params = {}) {
    const dict = messages[currentLocale.value] || messages.vi
    let text = dict[key] || messages.vi[key] || key
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v)
    }
    return text
  }

  const severityLabels = computed(() => ({
    critical: t('severityCritical'),
    high: t('severityHigh'),
    medium: t('severityMedium'),
    low: t('severityLow'),
  }))

  const statusLabels = computed(() => ({
    open: t('statusOpen'),
    investigating: t('statusInvestigating'),
    resolved: t('statusResolved'),
    closed: t('statusClosed'),
  }))

  const categoryOptions = computed(() => [
    { value: 'Vận hành', label: t('catOperations') },
    { value: 'Kho vận', label: t('catWarehouse') },
    { value: 'Bảo mật', label: t('catSecurity') },
    { value: 'Tài chính', label: t('catFinance') },
    { value: 'Tuân thủ', label: t('catCompliance') },
    { value: 'Hệ thống', label: t('catSystem') },
  ])

  return {
    locale: currentLocale,
    setLocale,
    t,
    severityLabels,
    statusLabels,
    categoryOptions,
  }
}

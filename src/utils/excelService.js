import * as XLSX from 'xlsx'
import { calculateDefectRate, getDefectRateLevel } from '../composables/useReports.js'

/**
 * Xuất danh sách báo cáo ra file Excel (.xlsx) theo đúng mẫu chuẩn IPQC
 * @param {Array} reports - Danh sách báo cáo
 * @param {String} customFilename - Tên file tuỳ chỉnh (nếu có)
 */
export function exportReportsToExcel(reports = [], customFilename = '') {
  if (!reports || reports.length === 0) {
    throw new Error('Không có báo cáo nào để xuất')
  }

  // 1. Tiêu đề chính dòng 1 (Giống hệt file mẫu nhà máy)
  const headerRow1 = [
    'IPQC ANOMALY REPORT / BÁO CÁO BẤT THƯỜNG IPQC/ IPQC 异常报告',
    ...Array(17).fill(''),
  ]

  // Dòng 2 & 3 trống / thông tin xuất
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
  const headerRow2 = [`Ngày xuất báo cáo: ${dateStr} | Tổng số bản ghi: ${reports.length}`, ...Array(17).fill('')]
  const headerRow3 = Array(18).fill('')

  // 2. Dòng 4: 18 Cột chuẩn hoá của file mẫu Anomaly Report
  const headerRow4 = [
    'NO',
    'Date/日期 Ngày tháng ',
    'Process/ Công đoạn/过程',
    'Product Model/ Model Sản phẩm/ 产品型号',
    'Machine / Máy móc / 机器',
    'Quantity / Số lượng / 数量',
    'Defect Quantity / Số lượng lỗi / 不良数量',
    'Defect Rate / Tỷ lệ lỗi / 不良率',
    ' 责任人 Người chịu trách nhiệm ',
    '负责人 Người phụ trách ',
    'Defect Image / Hình ảnh lỗi / 不良图像',
    'Defect Description / Mô tả lỗi / 不良描述',
    'Causes/原因 Nguyên nhân',
    'Improvement measures/改善對策 Các biện pháp cải tiến',
    'Improved efficiency/效果確認 Hiệu quả cải thiện',
    'Standardization of SOPs/SOP標準化 Tiêu chuẩn hóa SOP',
    'Progress/进度 Tiến độ ',
    'Note/备注 Ghi chú ',
  ]

  // 3. Dữ liệu các dòng từ dòng 5 trở đi
  const dataRows = reports.map((r, idx) => {
    // Format ngày hiển thị DD/MM/YYYY
    let formattedDate = r.date || ''
    if (formattedDate.includes('-')) {
      const parts = formattedDate.split('-')
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`
      }
    }

    // Format tiến độ
    let progressText = '- Open - 未处理 - Chưa xử lý'
    if (r.status === 'resolved') {
      progressText = '- Done - 已完成 - Đã hoàn thành'
    } else if (r.status === 'investigating') {
      progressText = '- In progress - 正在调查 - Đang điều tra xử lý'
    } else if (r.status === 'closed') {
      progressText = '- Closed - 已关闭 - Đã đóng'
    }

    // Ghi chú hình ảnh
    let imageInfo = ''
    if (r.imageUrl || (r.images && r.images.length > 0)) {
      const count = r.images && r.images.length > 0 ? r.images.length : 1
      imageInfo = `[Có ${count} ảnh đính kèm]`
    }

    return [
      idx + 1, // NO
      formattedDate, // Date
      r.process || '', // Process
      r.productModel || '', // Product Model
      r.machine || '', // Machine
      Number(r.quantity) || 0, // Quantity
      Number(r.defectQuantity) || 0, // Defect Quantity
      r.defectRate || calculateDefectRate(r.defectQuantity, r.quantity), // Defect Rate
      r.responsiblePerson || '', // Người chịu trách nhiệm
      r.assignee || '', // Người phụ trách
      imageInfo, // Defect Image
      r.defectDescription || '', // Mô tả lỗi
      r.causes || '', // Nguyên nhân
      r.improvementMeasures || '', // Biện pháp cải tiến
      r.improvedEfficiency || '', // Hiệu quả cải thiện
      r.sopStandardization || '', // Tiêu chuẩn hoá SOP
      progressText, // Tiến độ
      r.progressNote || '', // Ghi chú
    ]
  })

  // 4. Tạo Workbook & Worksheet
  const aoa = [headerRow1, headerRow2, headerRow3, headerRow4, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Độ rộng các cột (Auto-fit chuẩn thẩm mỹ)
  ws['!cols'] = [
    { wch: 6 }, // NO
    { wch: 15 }, // Date
    { wch: 24 }, // Process
    { wch: 22 }, // Model
    { wch: 16 }, // Machine
    { wch: 14 }, // Quantity
    { wch: 14 }, // Defect Qty
    { wch: 13 }, // Defect Rate
    { wch: 24 }, // Responsible
    { wch: 22 }, // Assignee
    { wch: 18 }, // Image
    { wch: 45 }, // Defect Desc
    { wch: 40 }, // Causes
    { wch: 40 }, // Measures
    { wch: 28 }, // Efficiency
    { wch: 28 }, // SOP
    { wch: 28 }, // Progress
    { wch: 32 }, // Note
  ]

  // Trộn ô tiêu đề dòng 1 (A1:R1)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 17 } },
  ]

  const wb = XLSX.utils.book_new()
  const sheetTitle = 'IPQC_Anomaly_Report'
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle)

  // 5. Tên file xuất
  const timeStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const fileName = customFilename || `Bao_cao_bat_thuong_IPQC_${timeStamp}.xlsx`

  // 6. Ghi file tải về máy người dùng
  XLSX.writeFile(wb, fileName)
  return { fileName, count: reports.length }
}

/**
 * Chuẩn hoá ngày tháng từ dữ liệu Excel thành định dạng chuẩn ISO YYYY-MM-DD
 * Hỗ trợ số serial Excel, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
 */
function normalizeExcelDate(val) {
  if (!val) {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Trường hợp là số serial của Excel (VD: 46269)
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val)
      if (dateObj) {
        const y = dateObj.y
        const m = String(dateObj.m).padStart(2, '0')
        const d = String(dateObj.d).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
    } catch {
      // Fallback nếu không parse được
    }
  }

  const str = String(val).trim()

  // Trường hợp YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('-')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Trường hợp DD/MM/YYYY hoặc DD-MM-YYYY
  const partsSlash = str.split(/[\/\-.]/)
  if (partsSlash.length === 3) {
    let [d, m, y] = partsSlash
    if (y.length === 2) y = '20' + y
    if (d.length <= 2 && m.length <= 2 && y.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }

  return new Date().toISOString().split('T')[0]
}

/**
 * Phân tích file Excel (.xlsx / .xls) tải lên và trích xuất danh sách báo cáo
 * Hỗ trợ đọc nhiều sheet và tự động dò tìm dòng Header
 * @param {File} file - File Excel người dùng tải lên
 * @returns {Promise<Object>} { sheetNames, sheetsMap, allReports }
 */
export async function parseExcelReportFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  const sheetNames = workbook.SheetNames || []
  if (sheetNames.length === 0) {
    throw new Error('File Excel không có bất kỳ sheet nào')
  }

  const sheetsMap = {}
  let totalImportedCount = 0

  for (const sName of sheetNames) {
    const ws = workbook.Sheets[sName]
    if (!ws) continue

    // Đọc tất cả các dòng dạng mảng 2 chiều
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (!rawData || rawData.length === 0) continue

    // Dò tìm dòng Header (thường là dòng 4, hoặc dòng có chứa Date, Process, Model, NO, Công đoạn)
    let headerRowIdx = -1
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const rowStr = (rawData[i] || []).join(' ').toLowerCase()
      if (
        (rowStr.includes('date') || rowStr.includes('ngày') || rowStr.includes('日期')) &&
        (rowStr.includes('process') || rowStr.includes('công đoạn') || rowStr.includes('model'))
      ) {
        headerRowIdx = i
        break
      }
    }

    // Nếu không tìm thấy bằng từ khoá, mặc định dòng 3 (0-indexed = dòng 4 Excel)
    if (headerRowIdx === -1 && rawData.length >= 4) {
      headerRowIdx = 3
    }

    if (headerRowIdx === -1 || headerRowIdx >= rawData.length - 1) {
      continue // Sheet không có dữ liệu báo cáo
    }

    const headers = rawData[headerRowIdx].map((h) => String(h).toLowerCase().trim())

    // Hàm tìm vị trí cột dựa theo danh sách từ khoá
    const findColIndex = (keywords) => {
      return headers.findIndex((h) => keywords.some((kw) => h.includes(kw.toLowerCase())))
    }

    const idxDate = findColIndex(['date', 'ngày', '日期'])
    const idxProcess = findColIndex(['process', 'công đoạn', '过程'])
    const idxModel = findColIndex(['product model', 'model', 'sản phẩm', '产品型号'])
    const idxMachine = findColIndex(['machine', 'máy', '机器'])
    const idxQty = findColIndex(['quantity', 'số lượng', '数量'])
    const idxDefectQty = findColIndex(['defect quantity', 'số lượng lỗi', '不良数量'])
    const idxDefectRate = findColIndex(['defect rate', 'tỷ lệ lỗi', '不良率'])
    const idxResp = findColIndex(['chịu trách nhiệm', '责任人', 'responsible'])
    const idxAssignee = findColIndex(['phụ trách', '负责人', 'assignee'])
    const idxDesc = findColIndex(['defect description', 'mô tả lỗi', '不良描述', 'mô tả'])
    const idxCauses = findColIndex(['causes', 'nguyên nhân', '原因'])
    const idxMeasures = findColIndex(['improvement measures', 'biện pháp', 'cải tiến', '改善對策'])
    const idxProgress = findColIndex(['progress', 'tiến độ', '进度'])
    const idxNote = findColIndex(['note', 'ghi chú', '备注'])

    const sheetReports = []

    // Đọc các dòng dữ liệu sau header
    for (let rIdx = headerRowIdx + 1; rIdx < rawData.length; rIdx++) {
      const row = rawData[rIdx]
      if (!row || row.length === 0) continue

      // Bỏ qua dòng trống hoàn toàn
      const hasContent = row.some((cell) => cell !== '' && cell !== null && cell !== undefined)
      if (!hasContent) continue

      // Kiểm tra nếu có ít nhất mô tả lỗi hoặc model hoặc công đoạn
      const modelVal = idxModel >= 0 ? String(row[idxModel] || '').trim() : ''
      const descVal = idxDesc >= 0 ? String(row[idxDesc] || '').trim() : ''
      const procVal = idxProcess >= 0 ? String(row[idxProcess] || '').trim() : ''

      if (!modelVal && !descVal && !procVal) continue

      // Parse các trường
      const rawDate = idxDate >= 0 ? row[idxDate] : ''
      const dateVal = normalizeExcelDate(rawDate)

      const qty = idxQty >= 0 ? Math.max(0, parseInt(row[idxQty], 10) || 0) : 0
      const defectQty = idxDefectQty >= 0 ? Math.max(0, parseInt(row[idxDefectQty], 10) || 0) : 0

      let defectRate = ''
      if (idxDefectRate >= 0 && row[idxDefectRate]) {
        const rawRate = row[idxDefectRate]
        if (typeof rawRate === 'number') {
          // Nếu Excel lưu dạng thập phân 0.04 -> 4.00%
          defectRate = (rawRate < 1 ? rawRate * 100 : rawRate).toFixed(2) + '%'
        } else {
          defectRate = String(rawRate).trim()
        }
      } else {
        defectRate = calculateDefectRate(defectQty, qty)
      }

      // Xử lý tiến độ (Status)
      const progressRaw = idxProgress >= 0 ? String(row[idxProgress] || '').toLowerCase() : ''
      let status = 'open'
      if (progressRaw.includes('done') || progressRaw.includes('已完成') || progressRaw.includes('hoàn thành')) {
        status = 'resolved'
      } else if (progressRaw.includes('progress') || progressRaw.includes('đang') || progressRaw.includes('正在调查')) {
        status = 'investigating'
      } else if (progressRaw.includes('closed') || progressRaw.includes('đóng') || progressRaw.includes('已关闭')) {
        status = 'closed'
      }

      // Tự động phân loại mức độ nghiêm trọng
      const severityInfo = getDefectRateLevel(defectRate)
      const severity = severityInfo.severity || 'low'

      // Tạo ID ngẫu nhiên có tiền tố IMPORT
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      const reportId = `ANOM-${randomSuffix}`

      // Chuẩn hoá công đoạn Process
      let normalizedProcess = procVal
      if (procVal.toUpperCase().includes('SMT')) normalizedProcess = 'SMT'
      else if (procVal.toUpperCase().includes('DIP')) normalizedProcess = 'DIP'
      else if (procVal.toUpperCase().includes('AI')) normalizedProcess = 'AI'
      else if (procVal.toUpperCase().includes('AVR')) normalizedProcess = 'AVR'

      sheetReports.push({
        id: reportId,
        date: dateVal,
        process: normalizedProcess || 'SMT',
        productModel: modelVal || sName.split('(')[0].trim() || 'MDL-GENERIC',
        machine: idxMachine >= 0 ? String(row[idxMachine] || '').trim() : '',
        quantity: qty || (defectQty > 0 ? defectQty * 20 : 100),
        defectQuantity: defectQty,
        defectRate: defectRate,
        responsiblePerson: idxResp >= 0 ? String(row[idxResp] || '').trim() : '',
        assignee: idxAssignee >= 0 ? String(row[idxAssignee] || '').trim() : '',
        defectDescription: descVal || 'Lỗi phát hiện trong quá trình kiểm tra IPQC',
        causes: idxCauses >= 0 ? String(row[idxCauses] || '').trim() : '',
        improvementMeasures: idxMeasures >= 0 ? String(row[idxMeasures] || '').trim() : '',
        progressNote: idxNote >= 0 ? String(row[idxNote] || '').trim() : '',
        status: status,
        severity: severity,
        sheetSource: sName,
        imageUrl: '',
        images: [],
        createdAt: new Date().toLocaleDateString('vi-VN'),
      })
    }

    if (sheetReports.length > 0) {
      sheetsMap[sName] = sheetReports
      totalImportedCount += sheetReports.length
    }
  }

  return {
    fileName: file.name,
    sheetNames: Object.keys(sheetsMap),
    sheetsMap,
    totalRecords: totalImportedCount,
  }
}

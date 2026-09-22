import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { compressBase64Image } from './imageCompressor.js'

function calculateDefectRate(defectQty, totalQty) {
  const d = Number(defectQty) || 0
  const q = Number(totalQty) || 0
  if (q <= 0) return '0.00%'
  return ((d / q) * 100).toFixed(2) + '%'
}

function getDefectRateLevel(rateStrOrNum) {
  const rate = typeof rateStrOrNum === 'string' ? parseFloat(rateStrOrNum) : (Number(rateStrOrNum) || 0)
  if (rate >= 10) return { label: 'Rất cao (>10%)', severity: 'critical' }
  if (rate >= 5) return { label: 'Cao (>5%)', severity: 'high' }
  if (rate >= 1) return { label: 'Cần lưu ý', severity: 'medium' }
  return { label: 'Ổn định (<1%)', severity: 'low' }
}

/**
 * Trích xuất toàn bộ hình ảnh đính kèm (drawing images) từ file .xlsx thông qua cấu trúc OpenXML
 * Ánh xạ chính xác hình ảnh theo từng Sheet và từng dòng (Row Index)
 * @param {File|ArrayBuffer} fileOrBuffer
 * @returns {Promise<Object>} sheetImagesMap: { [sheetName]: { [rowIdx]: [ { id, url, name } ] } }
 */
export async function extractImagesFromExcelZip(fileOrBuffer) {
  try {
    const zip = await JSZip.loadAsync(fileOrBuffer)

    const wbXmlFile = zip.file('xl/workbook.xml')
    const wbRelsXmlFile = zip.file('xl/_rels/workbook.xml.rels')
    if (!wbXmlFile || !wbRelsXmlFile) {
      return {}
    }

    const wbXml = await wbXmlFile.async('string')
    const wbRelsXml = await wbRelsXmlFile.async('string')

    // 1. Ánh xạ quan hệ rId -> đường dẫn file worksheet XML
    const relsMap = {}
    const relMatches = wbRelsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi)
    for (const m of relMatches) {
      relsMap[m[1]] = m[2].replace(/^\/?xl\//, '')
    }

    // 2. Ánh xạ Sheet name -> đường dẫn file worksheet XML
    const sheetNameToPath = {}
    const sheetMatches = wbXml.matchAll(/<sheet\s+[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/gi)
    for (const m of sheetMatches) {
      const sheetName = m[1]
      const rId = m[2]
      const target = relsMap[rId]
      if (target) {
        sheetNameToPath[sheetName] = target
      }
    }

    // Cache các ảnh binary base64 để tối ưu hiệu năng
    const mediaCache = {}
    const getMediaDataUrl = async (mediaPath) => {
      if (mediaCache[mediaPath]) return mediaCache[mediaPath]
      const mFile = zip.file(mediaPath)
      if (!mFile) return ''
      const base64 = await mFile.async('base64')
      const ext = mediaPath.split('.').pop().toLowerCase()
      const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg')
      const rawDataUrl = `data:${mime};base64,${base64}`

      // Nén ảnh thông minh bằng Canvas (520px, Q=0.60) để đảm bảo dù có 16 ảnh
      // thì tổng payload document Firestore vẫn < 500KB (an toàn tuyệt đối dưới ngưỡng 1MB)
      const optimizedDataUrl = await compressBase64Image(rawDataUrl, 520, 0.60)
      mediaCache[mediaPath] = optimizedDataUrl
      return optimizedDataUrl
    }

    const sheetImagesMap = {}

    // 3. Quét từng worksheet để tìm tệp vẽ drawingX.xml tương ứng
    for (const [sheetName, sheetRelPath] of Object.entries(sheetNameToPath)) {
      const sheetFileName = sheetRelPath.split('/').pop()
      const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`
      const sheetRelsFile = zip.file(sheetRelsPath)
      if (!sheetRelsFile) continue

      const sheetRelsXml = await sheetRelsFile.async('string')
      const drawingMatch = sheetRelsXml.match(/Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/i)
      if (!drawingMatch) continue

      const drawingTarget = drawingMatch[1]
      const drawingFileName = drawingTarget.split('/').pop()
      const drawingXmlPath = `xl/drawings/${drawingFileName}`
      const drawingRelsPath = `xl/drawings/_rels/${drawingFileName}.rels`

      const drawingXmlFile = zip.file(drawingXmlPath)
      const drawingRelsFile = zip.file(drawingRelsPath)
      if (!drawingXmlFile || !drawingRelsFile) continue

      const drawingRelsXml = await drawingRelsFile.async('string')
      const drawingMediaMap = {}
      const dRelMatches = drawingRelsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi)
      for (const dm of dRelMatches) {
        const imgFileName = dm[2].split('/').pop()
        drawingMediaMap[dm[1]] = `xl/media/${imgFileName}`
      }

      const drawingXml = await drawingXmlFile.async('string')
      const anchorRegex = /<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/gi
      const anchors = drawingXml.match(anchorRegex) || []

      const rowMap = {}

      for (const anchor of anchors) {
        const rowMatch = anchor.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/i)
        const blipMatch = anchor.match(/<a:blip[^>]*r:embed="([^"]+)"/i)

        if (rowMatch && blipMatch) {
          const rowIdx = parseInt(rowMatch[1], 10)
          const rId = blipMatch[1]
          const mediaPath = drawingMediaMap[rId]

          if (mediaPath && zip.file(mediaPath)) {
            if (!rowMap[rowIdx]) rowMap[rowIdx] = []
            const dataUrl = await getMediaDataUrl(mediaPath)
            if (dataUrl) {
              rowMap[rowIdx].push({
                id: `img_excel_${sheetName}_${rowIdx}_${rowMap[rowIdx].length + 1}`,
                url: dataUrl,
                name: `${sheetName.split('(')[0].trim()}_dòng${rowIdx + 1}_ảnh${rowMap[rowIdx].length + 1}.jpg`,
              })
            }
          }
        }
      }

      sheetImagesMap[sheetName] = rowMap
    }

    return sheetImagesMap
  } catch (err) {
    console.warn('Lỗi khi phân tích cấu trúc ảnh ZIP Excel:', err)
    return {}
  }
}

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
    { wch: 35 }, // Note
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Anomaly Reports')

  // 5. Tải file xuống máy khách
  const filename =
    customFilename ||
    `Anomaly_Report_Export_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`
  XLSX.writeFile(wb, filename)

  return { success: true, count: reports.length, filename }
}

/**
 * Chuẩn hoá ngày tháng từ Excel (hỗ trợ cả Excel serial number lẫn chuỗi DD/MM/YYYY)
 * @param {any} rawDate
 * @returns {String} YYYY-MM-DD
 */
export function normalizeExcelDate(rawDate) {
  if (!rawDate) {
    return new Date().toISOString().split('T')[0]
  }

  // Trường hợp là số serial Excel (ví dụ 45539 = 04/09/2026)
  if (typeof rawDate === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const dateObj = new Date(excelEpoch.getTime() + rawDate * 86400000)
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear()
      const m = String(dateObj.getMonth() + 1).padStart(2, '0')
      const d = String(dateObj.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  const str = String(rawDate).trim()

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
 * Hỗ trợ đọc nhiều sheet, tự động trích xuất toàn bộ ảnh lỗi nhúng và tự động dò tìm dòng Header
 * @param {File} file - File Excel người dùng tải lên
 * @returns {Promise<Object>} { sheetNames, sheetsMap, totalRecords }
 */
export async function parseExcelReportFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  const sheetNames = workbook.SheetNames || []
  if (sheetNames.length === 0) {
    throw new Error('File Excel không có bất kỳ sheet nào')
  }

  // Trích xuất toàn bộ hình ảnh đính kèm từ các sheet trong file Excel ZIP
  let sheetImagesMap = {}
  try {
    sheetImagesMap = await extractImagesFromExcelZip(arrayBuffer)
  } catch (err) {
    console.warn('Không thể trích xuất hình ảnh từ cấu trúc Excel ZIP:', err)
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
    const idxImage = findColIndex(['defect image', 'hình ảnh lỗi', '不良图像', 'hình ảnh', 'image', 'hình'])
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

      // Trích xuất danh sách ảnh đính kèm của dòng rIdx từ bản đồ drawing
      const rowImages =
        sheetImagesMap[sName] && sheetImagesMap[sName][rIdx]
          ? [...sheetImagesMap[sName][rIdx]]
          : []

      // Kiểm tra thêm nếu ô văn bản cột ảnh chứa URL ảnh (http/https/data:image)
      const rawImgCell = idxImage >= 0 ? String(row[idxImage] || '').trim() : ''
      if (
        rawImgCell.startsWith('http://') ||
        rawImgCell.startsWith('https://') ||
        rawImgCell.startsWith('data:image/')
      ) {
        if (!rowImages.some((img) => img.url === rawImgCell)) {
          rowImages.push({
            id: `img_url_${Date.now()}_${rIdx}_${rowImages.length + 1}`,
            url: rawImgCell,
            name: `${modelVal || 'Defect'}_anh_${rowImages.length + 1}.jpg`,
          })
        }
      }

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
        images: rowImages,
        imageUrl: rowImages.length > 0 ? rowImages[0].url : '',
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

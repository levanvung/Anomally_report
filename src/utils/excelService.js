import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { compressBase64Image } from './imageCompressor.js'

function calculateDefectRate(defectQty, totalQty) {
  const d = Number(defectQty) || 0
  const q = Number(totalQty) || 0
  return q <= 0 ? '0.00%' : ((d / q) * 100).toFixed(2) + '%'
}

/**
 * Chuẩn hoá ngày tháng từ ô Excel hoặc từ tên Sheet (VD: "ISP3144AF-1A DIP (04-09-2026)")
 * Trả về định dạng chuẩn YYYY-MM-DD để sắp xếp chính xác từ trên xuống dưới
 */
export function normalizeExcelDate(rawDate, sheetName = '') {
  const parseStrToISO = (str) => {
    if (!str) return ''
    const s = String(str).trim()
    // YYYY-MM-DD hoặc YYYY/MM/DD
    const mISO = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)
    if (mISO) {
      return `${mISO[1]}-${mISO[2].padStart(2, '0')}-${mISO[3].padStart(2, '0')}`
    }
    // DD/MM/YYYY hoặc DD-MM-YYYY
    const mDMY = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
    if (mDMY) {
      let dd = parseInt(mDMY[1], 10)
      let mm = parseInt(mDMY[2], 10)
      const yyyy = mDMY[3]
      if (mm > 12 && dd <= 12) {
        const tmp = dd; dd = mm; mm = tmp
      }
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }
    return ''
  }

  // 1. Nếu là số serial ngày của Excel (VD: 46269)
  if (typeof rawDate === 'number' && rawDate > 20000 && rawDate < 90000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const dt = new Date(excelEpoch.getTime() + Math.round(rawDate * 86400000))
    if (!isNaN(dt.getTime())) {
      const y = dt.getUTCFullYear()
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
      const d = String(dt.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  // 2. Nếu là đối tượng Date
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const y = rawDate.getFullYear()
    const m = String(rawDate.getMonth() + 1).padStart(2, '0')
    const d = String(rawDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 3. Nếu là chuỗi ngày trong ô Excel
  const fromCell = parseStrToISO(rawDate)
  if (fromCell) return fromCell

  // 4. Fallback thông minh: Lấy ngày tháng ghi trong tên Sheet (VD: "ISP3144AF-1A DIP (04-09-2026)")
  const fromSheet = parseStrToISO(sheetName)
  if (fromSheet) return fromSheet

  return new Date().toISOString().split('T')[0]
}

/**
 * Chuẩn hoá tên Công đoạn (Process) - Khắc phục triệt để lỗi "DIP HAND INSERT COMPONENT"
 * bị nhận nhầm thành AVR do chữ "COMPONENT" có chứa "MP" ở giữa!
 */
export function normalizeProcessName(procVal = '', sheetName = '', respVal = '') {
  const p = String(procVal || '').trim().toUpperCase()
  const s = String(sheetName || '').trim().toUpperCase()
  const r = String(respVal || '').trim().toUpperCase()

  // 1. Kiểm tra chính xác từ cột Process (Cột C) trước
  if (p.includes('DIP') || p.includes('HAND INSERT')) return 'DIP'
  if (p.includes('SMT')) return 'SMT'
  if (/\bAI\b/.test(p) || p.includes('AUTO INSERT')) return 'AI'
  if (p.includes('AVR') || /\bMP\b/.test(p) || p.includes('FINAL') || p.includes('ASSEMBLY') || p.includes('ABSEMBLY')) {
    return 'AVR'
  }

  // 2. Nếu cột Process không rõ, đối chiếu cột Người chịu trách nhiệm (VD: Production-DIP)
  if (r.includes('DIP')) return 'DIP'
  if (r.includes('SMT')) return 'SMT'
  if (/\bAI\b/.test(r) || r.includes('-AI')) return 'AI'
  if (r.includes('AVR') || /\bMP\b/.test(r)) return 'AVR'

  // 3. Đối chiếu tên Sheet (VD: "ISP3144AF-1A DIP (04-09-2026)")
  if (/\bDIP\b/.test(s)) return 'DIP'
  if (/\bSMT\b/.test(s)) return 'SMT'
  if (/\bAI\b/.test(s)) return 'AI'
  if (/\bAVR\b/.test(s) || /\bMP\b/.test(s)) return 'AVR'

  return 'DIP'
}

export async function extractImagesFromExcelZip(fileOrBuffer, onProgress = null) {
  try {
    const zip = await JSZip.loadAsync(fileOrBuffer)
    const wbXmlFile = zip.file('xl/workbook.xml')
    const wbRelsXmlFile = zip.file('xl/_rels/workbook.xml.rels')
    if (!wbXmlFile || !wbRelsXmlFile) return {}

    const wbXml = await wbXmlFile.async('string')
    const wbRelsXml = await wbRelsXmlFile.async('string')

    const relsMap = {}
    for (const m of wbRelsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi)) {
      relsMap[m[1]] = m[2].replace(/^\/?xl\//, '')
    }

    const sheetNameToPath = {}
    for (const m of wbXml.matchAll(/<sheet\s+[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/gi)) {
      if (relsMap[m[2]]) sheetNameToPath[m[1]] = relsMap[m[2]]
    }

    const mediaCache = {}
    const getMediaDataUrl = async (mediaPath) => {
      if (mediaCache[mediaPath]) return mediaCache[mediaPath]
      const mFile = zip.file(mediaPath)
      if (!mFile) return ''
      const base64 = await mFile.async('base64')
      const ext = mediaPath.split('.').pop().toLowerCase()
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
      const optimized = await compressBase64Image(`data:${mime};base64,${base64}`, 1200, 0.82)   
       mediaCache[mediaPath] = optimized
      return optimized
    }

    const sheetImagesMap = {}
    const entries = Object.entries(sheetNameToPath)
    for (let idx = 0; idx < entries.length; idx++) {
      const [sheetName, sheetRelPath] = entries[idx]
      if (typeof onProgress === 'function') {
        const pct = 10 + Math.round(((idx + 1) / entries.length) * 35)
        onProgress(`Đang trích xuất ảnh từ Sheet (${idx + 1}/${entries.length}): ${sheetName}`, pct)
      }

      const sheetFileName = sheetRelPath.split('/').pop()
      const sheetRelsFile = zip.file(`xl/worksheets/_rels/${sheetFileName}.rels`)
      if (!sheetRelsFile) continue
      const sheetRelsXml = await sheetRelsFile.async('string')
      const drawingMatch = sheetRelsXml.match(/Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/i)
      if (!drawingMatch) continue
      const drawingFileName = drawingMatch[1].split('/').pop()
      const drawingXmlFile = zip.file(`xl/drawings/${drawingFileName}`)
      const drawingRelsFile = zip.file(`xl/drawings/_rels/${drawingFileName}.rels`)
      if (!drawingXmlFile || !drawingRelsFile) continue

      const drawingRelsXml = await drawingRelsFile.async('string')
      const drawingMediaMap = {}
      for (const dm of drawingRelsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi)) {
        drawingMediaMap[dm[1]] = `xl/media/${dm[2].split('/').pop()}`
      }

      const drawingXml = await drawingXmlFile.async('string')
      const anchors = drawingXml.match(/<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/gi) || []
      const rowMap = {}
      for (const anchor of anchors) {
        const rowMatch = anchor.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/i)
        const blipMatch = anchor.match(/<a:blip[^>]*r:embed="([^"]+)"/i)
        if (rowMatch && blipMatch) {
          const rowIdx = parseInt(rowMatch[1], 10)
          const mediaPath = drawingMediaMap[blipMatch[1]]
          if (mediaPath && zip.file(mediaPath)) {
            if (!rowMap[rowIdx]) rowMap[rowIdx] = []
            const dataUrl = await getMediaDataUrl(mediaPath)
            if (dataUrl) rowMap[rowIdx].push({ url: dataUrl, name: `row_${rowIdx + 1}.jpg` })
          }
        }
      }
      sheetImagesMap[sheetName] = rowMap
    }
    return sheetImagesMap
  } catch {
    return {}
  }
}

export function exportReportsToExcel(reports = [], customFilename = '') {
  const headerRow1 = ['IPQC ANOMALY REPORT / BÁO CÁO BẤT THƯỜNG IPQC/ IPQC 异常报告', ...Array(17).fill('')]
  const headerRow4 = [
    'NO', 'Date/日期 Ngày tháng', 'Process/ Công đoạn/过程', 'Product Model/ Model Sản phẩm/ 产品型号',
    'Machine / Máy móc / 机器', 'Quantity / Số lượng / 数量', 'Defect Quantity / Số lượng lỗi / 不良数量',
    'Defect Rate / Tỷ lệ lỗi / 不良率', '责任人 Người chịu trách nhiệm', '负责人 Người phụ trách',
    'Defect Image / Hình ảnh lỗi / 不良图像', 'Defect Description / Mô tả lỗi / 不良描述',
    'Causes/原因 Nguyên nhân', 'Improvement measures/改善對策 Các biện pháp cải tiến',
    'Improved efficiency/效果確認 Hiệu quả cải thiện', 'Standardization of SOPs/SOP標準化 Tiêu chuẩn hóa SOP',
    'Progress/进度 Tiến độ', 'Note/备注 Ghi chú'
  ]

  const dataRows = reports.map((r, idx) => {
    let dispDate = r.date || ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(dispDate)) {
      const [y, m, d] = dispDate.split('-')
      dispDate = `${d}/${m}/${y}`
    }
    return [
      idx + 1,
      dispDate,
      r.process || '',
      r.productModel || '',
      r.machine || '',
      Number(r.quantity) || 0,
      Number(r.defectQuantity) || 0,
      r.defectRate || calculateDefectRate(r.defectQuantity, r.quantity),
      r.responsiblePerson || '',
      r.assignee || '',
      (r.images?.length || r.imageUrl) ? '[Có ảnh]' : '',
      r.defectDescription || '',
      r.causes || '',
      r.improvementMeasures || '',
      '',
      '',
      r.status === 'resolved' ? '- Done - 已完成 - Đã hoàn thành' : '- Open - 未处理 - Chưa xử lý',
      r.progressNote || ''
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([headerRow1, [], [], headerRow4, ...dataRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Anomaly Reports')
  const fname = customFilename || `IPQC_Anomaly_Report_${new Date().toISOString().slice(0,10)}.xlsx`
  XLSX.writeFile(wb, fname)
  return { count: reports.length, filename: fname }
}

export async function parseExcelReportFile(file, onProgress = null) {
  if (typeof onProgress === 'function') onProgress('Đang đọc cấu trúc file Excel...', 5)
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetImagesMap = await extractImagesFromExcelZip(arrayBuffer, onProgress)
  const allRecords = []

  const sheetNames = workbook.SheetNames || []
  for (let sIdx = 0; sIdx < sheetNames.length; sIdx++) {
    const sName = sheetNames[sIdx]
    const ws = workbook.Sheets[sName]
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (!rawData || rawData.length < 5) continue

    // Tự động dò dòng Header (mặc định là dòng index 3 = dòng 4 trong Excel)
    let headerRowIdx = 3
    for (let i = 0; i < Math.min(8, rawData.length); i++) {
      const rowStr = (rawData[i] || []).join(' ').toLowerCase()
      if ((rowStr.includes('date') || rowStr.includes('ngày')) && (rowStr.includes('process') || rowStr.includes('model'))) {
        headerRowIdx = i
        break
      }
    }

    for (let rIdx = headerRowIdx + 1; rIdx < rawData.length; rIdx++) {
      const row = rawData[rIdx]
      if (!row || !row.some(Boolean)) continue
      const rawDate = row[1]
      const procVal = String(row[2] || '').trim()
      const modelVal = String(row[3] || '').trim()
      const machineVal = String(row[4] || '').trim()
      const respVal = String(row[8] || '').trim()
      const picVal = String(row[9] || '').trim()
      const descVal = String(row[11] || '').trim()

      const rowImgs = sheetImagesMap[sName]?.[rIdx] || []
      if (!modelVal && !descVal && !procVal && rowImgs.length === 0) continue

      const qty = Math.max(0, parseInt(row[5], 10) || 0)
      const defQty = Math.max(0, parseInt(row[6], 10) || 0)

      let defectRate = ''
      if (row[7] !== '' && row[7] !== null && row[7] !== undefined) {
        const rawRate = row[7]
        if (typeof rawRate === 'number') {
          defectRate = (rawRate <= 1 ? rawRate * 100 : rawRate).toFixed(2) + '%'
        } else {
          defectRate = String(rawRate).trim()
        }
      } else {
        defectRate = calculateDefectRate(defQty, qty)
      }

      // Chuẩn hoá Công đoạn chính xác (Không bao giờ nhầm DIP HAND INSERT COMPONENT sang AVR)
      const normProc = normalizeProcessName(procVal, sName, respVal)
      // Chuẩn hoá Ngày tháng thực tế từ ô Excel hoặc từ tên Sheet
      const dateISO = normalizeExcelDate(rawDate, sName)

      const progressRaw = String(row[16] || '').toLowerCase()
      let status = 'resolved'
      if (progressRaw.includes('open') || progressRaw.includes('chưa')) status = 'open'
      else if (progressRaw.includes('progress') || progressRaw.includes('đang')) status = 'investigating'

      allRecords.push({
        id: 'ANOM-' + Math.floor(1000 + Math.random() * 9000),
        date: dateISO,
        process: normProc,
        processRaw: procVal || normProc,
        productModel: modelVal || sName.split('(')[0].trim() || 'MODEL',
        machine: machineVal === '+' ? '' : machineVal,
        quantity: qty,
        defectQuantity: defQty,
        defectRate,
        responsiblePerson: respVal || ('Production-' + normProc),
        assignee: picVal || respVal || ('Production-' + normProc),
        defectDescription: descVal || 'Lỗi phát hiện trong quá trình kiểm tra IPQC',
        causes: String(row[12] || '').trim(),
        improvementMeasures: String(row[13] || '').trim(),
        progressNote: String(row[17] || '').trim(),
        status,
        severity: parseFloat(defectRate) >= 10 ? 'critical' : (parseFloat(defectRate) >= 5 ? 'high' : 'low'),
        images: rowImgs,
        imageUrl: rowImgs[0]?.url || '',
        orderIndex: allRecords.length,
      })
    }
  }
  return allRecords
}

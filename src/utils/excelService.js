import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { compressBase64Image } from './imageCompressor.js'

function calculateDefectRate(defectQty, totalQty) {
  const d = Number(defectQty) || 0
  const q = Number(totalQty) || 0
  return q <= 0 ? '0.00%' : ((d / q) * 100).toFixed(2) + '%'
}

export async function extractImagesFromExcelZip(fileOrBuffer) {
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
      const optimized = await compressBase64Image(`data:${mime};base64,${base64}`, 520, 0.62)
      mediaCache[mediaPath] = optimized
      return optimized
    }

    const sheetImagesMap = {}
    for (const [sheetName, sheetRelPath] of Object.entries(sheetNameToPath)) {
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

  const dataRows = reports.map((r, idx) => [
    idx + 1,
    r.date || '',
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
  ])

  const ws = XLSX.utils.aoa_to_sheet([headerRow1, [], [], headerRow4, ...dataRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Anomaly Reports')
  const fname = customFilename || `IPQC_Anomaly_Report_${new Date().toISOString().slice(0,10)}.xlsx`
  XLSX.writeFile(wb, fname)
  return { count: reports.length, filename: fname }
}

export async function parseExcelReportFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetImagesMap = await extractImagesFromExcelZip(arrayBuffer)
  const allRecords = []

  for (const sName of (workbook.SheetNames || [])) {
    const ws = workbook.Sheets[sName]
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (!rawData || rawData.length < 5) continue

    for (let rIdx = 4; rIdx < rawData.length; rIdx++) {
      const row = rawData[rIdx]
      if (!row || !row.some(Boolean)) continue
      const modelVal = String(row[3] || '').trim()
      const descVal = String(row[11] || '').trim()
      const procVal = String(row[2] || '').trim()
      if (!modelVal && !descVal && !procVal) continue

      const qty = parseInt(row[5], 10) || 100
      const defQty = parseInt(row[6], 10) || 0
      const rowImgs = sheetImagesMap[sName]?.[rIdx] || []
      let normProc = 'DIP'
      if (procVal.toUpperCase().includes('SMT')) normProc = 'SMT'
      else if (procVal.toUpperCase().includes('AI')) normProc = 'AI'
      else if (procVal.toUpperCase().includes('AVR') || procVal.toUpperCase().includes('MP')) normProc = 'AVR'

      allRecords.push({
        id: 'ANOM-' + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toISOString().split('T')[0],
        process: normProc,
        productModel: modelVal || sName.split('(')[0].trim() || 'MODEL',
        machine: String(row[4] || '').trim(),
        quantity: qty,
        defectQuantity: defQty,
        defectRate: calculateDefectRate(defQty, qty),
        responsiblePerson: String(row[8] || 'Production-' + normProc).trim(),
        assignee: String(row[9] || 'Production-' + normProc).trim(),
        defectDescription: descVal || 'Lỗi IPQC',
        progressNote: String(row[17] || '').trim(),
        status: 'resolved',
        severity: 'low',
        images: rowImgs,
        imageUrl: rowImgs[0]?.url || '',
      })
    }
  }
  return allRecords
}

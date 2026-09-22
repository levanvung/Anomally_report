import fs from 'fs'
import JSZip from 'jszip'

export async function extractImagesFromExcelZip(fileOrBuffer) {
  const zip = await JSZip.loadAsync(fileOrBuffer)

  // 1. Đọc workbook.xml & workbook.xml.rels để liên kết Sheet Name -> Đường dẫn file worksheet XML
  const wbXmlFile = zip.file('xl/workbook.xml')
  const wbRelsXmlFile = zip.file('xl/_rels/workbook.xml.rels')
  if (!wbXmlFile || !wbRelsXmlFile) {
    return {}
  }

  const wbXml = await wbXmlFile.async('string')
  const wbRelsXml = await wbRelsXmlFile.async('string')

  // Parse rId -> target worksheet XML path
  const relsMap = {}
  const relMatches = wbRelsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi)
  for (const m of relMatches) {
    relsMap[m[1]] = m[2].replace(/^\/?xl\//, '')
  }

  // Parse Sheet name -> rId
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

  // Cache ảnh media base64 để không đọc lặp lại nhiều lần
  const mediaCache = {}
  const getMediaDataUrl = async (mediaPath) => {
    if (mediaCache[mediaPath]) return mediaCache[mediaPath]
    const mFile = zip.file(mediaPath)
    if (!mFile) return ''
    const base64 = await mFile.async('base64')
    const ext = mediaPath.split('.').pop().toLowerCase()
    const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg')
    const dataUrl = `data:${mime};base64,${base64}`
    mediaCache[mediaPath] = dataUrl
    return dataUrl
  }

  // 2. Với mỗi sheet, tìm file drawing và ánh xạ ảnh theo từng dòng (row)
  const sheetImagesMap = {}

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
}

// Test script
async function run() {
  const buf = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const res = await extractImagesFromExcelZip(buf)
  console.log('Sheet count with images:', Object.keys(res).length)
  for (const [s, rows] of Object.entries(res)) {
    const rowKeys = Object.keys(rows)
    if (rowKeys.length > 0) {
      console.log(`Sheet "${s}": ${rowKeys.length} rows have images`)
      for (const rk of rowKeys) {
        console.log(`  Row ${rk}: ${rows[rk].length} images (first name: ${rows[rk][0].name})`)
      }
      break
    }
  }
}

run().catch(console.error)

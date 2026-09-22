import fs from 'fs'
import JSZip from 'jszip'

async function testExtraction() {
  const buffer = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const zip = await JSZip.loadAsync(buffer)

  // 1. Read workbook.xml & workbook.xml.rels to map sheetName -> sheet file path
  const wbXml = await zip.file('xl/workbook.xml').async('string')
  const wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string')

  // Parse rId -> target in workbook.xml.rels
  const relsMap = {}
  const relMatches = wbRelsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)
  for (const m of relMatches) {
    relsMap[m[1]] = m[2].replace(/^\/?xl\//, '')
  }

  // Parse sheet name -> r:id in workbook.xml
  const sheetMap = {}
  const sheetMatches = wbXml.matchAll(/<sheet\s+[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)
  for (const m of sheetMatches) {
    const sheetName = m[1]
    const rId = m[2]
    const target = relsMap[rId] // e.g. worksheets/sheet1.xml
    sheetMap[sheetName] = target
  }

  console.log('Mapped sheets:', Object.keys(sheetMap).slice(0, 5))

  // For each sheet, find its drawing rel
  const sheetImagesMap = {} // sheetName -> { [rowIdx]: [dataUrl, ...] }

  for (const [sheetName, sheetRelPath] of Object.entries(sheetMap)) {
    const sheetFileName = sheetRelPath.split('/').pop() // e.g. sheet1.xml
    const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`
    const sheetRelsFile = zip.file(sheetRelsPath)
    if (!sheetRelsFile) continue

    const sheetRelsXml = await sheetRelsFile.async('string')
    // Find drawing target
    const drawingMatch = sheetRelsXml.match(/Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/)
    if (!drawingMatch) continue

    let drawingTarget = drawingMatch[1] // e.g. ../drawings/drawing1.xml
    const drawingFileName = drawingTarget.split('/').pop() // e.g. drawing1.xml
    const drawingRelsPath = `xl/drawings/_rels/${drawingFileName}.rels`
    const drawingXmlPath = `xl/drawings/${drawingFileName}`

    const drawingXmlFile = zip.file(drawingXmlPath)
    const drawingRelsFile = zip.file(drawingRelsPath)
    if (!drawingXmlFile || !drawingRelsFile) continue

    const drawingRelsXml = await drawingRelsFile.async('string')
    // Map rId -> image file path in xl/media/
    const drawingMediaMap = {}
    const dRelMatches = drawingRelsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)
    for (const dm of dRelMatches) {
      const imgFileName = dm[2].split('/').pop()
      drawingMediaMap[dm[1]] = `xl/media/${imgFileName}`
    }

    const drawingXml = await drawingXmlFile.async('string')
    // Find anchors: each anchor has <xdr:from> <xdr:row>ROW</xdr:row> <xdr:col>COL</xdr:col> and <a:blip r:embed="RID"/>
    const anchorRegex = /<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g
    const anchors = drawingXml.match(anchorRegex) || []

    sheetImagesMap[sheetName] = {}

    for (const anchor of anchors) {
      const rowMatch = anchor.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)
      const colMatch = anchor.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)
      const blipMatch = anchor.match(/<a:blip[^>]*r:embed="([^"]+)"/)

      if (rowMatch && blipMatch) {
        const row = parseInt(rowMatch[1], 10)
        const rId = blipMatch[1]
        const mediaPath = drawingMediaMap[rId]

        if (mediaPath && zip.file(mediaPath)) {
          if (!sheetImagesMap[sheetName][row]) {
            sheetImagesMap[sheetName][row] = []
          }
          // We can store mediaPath or convert to base64 dataUrl
          sheetImagesMap[sheetName][row].push(mediaPath)
        }
      }
    }
  }

  console.log('Result for first sheet:', sheetImagesMap['ISP3144AF-1A (04-09-2026) (DIP)'])
  let totalImagesFound = 0
  for (const rows of Object.values(sheetImagesMap)) {
    for (const imgs of Object.values(rows)) {
      totalImagesFound += imgs.length
    }
  }
  console.log('Total images found across all sheets:', totalImagesFound)
}

testExtraction().catch(console.error)

import fs from 'fs'
import JSZip from 'jszip'

async function inspectXlsxZip() {
  const buffer = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const zip = await JSZip.loadAsync(buffer)

  console.log('--- ZIP FILES ---')
  const allFiles = Object.keys(zip.files)
  console.log('Total files in zip:', allFiles.length)

  // Media files
  const mediaFiles = allFiles.filter(f => f.startsWith('xl/media/'))
  console.log('Media files count:', mediaFiles.length, mediaFiles.slice(0, 5))

  // Drawings
  const drawingFiles = allFiles.filter(f => f.startsWith('xl/drawings/'))
  console.log('Drawing files:', drawingFiles)

  // Worksheets
  const sheetRels = allFiles.filter(f => f.includes('worksheets/_rels/'))
  console.log('Worksheet rels count:', sheetRels.length, sheetRels.slice(0, 3))

  // Workbook rels & sheets
  const wbXml = await zip.file('xl/workbook.xml').async('string')
  console.log('Workbook xml preview:', wbXml.slice(0, 300))

  const wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  console.log('Workbook rels preview:', wbRelsXml.slice(0, 300))
}

inspectXlsxZip().catch(console.error)

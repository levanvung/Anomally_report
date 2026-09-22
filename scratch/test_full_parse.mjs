import fs from 'fs'
import { parseExcelReportFile } from '../src/utils/excelService.js'

async function testFullParse() {
  const buf = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  // Mock File object
  const file = {
    name: 'Anomaly_report_17092026_1.xlsx',
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  const result = await parseExcelReportFile(file)
  console.log('Result total records:', result.totalRecords)
  console.log('Sheets count:', result.sheetNames.length)

  const firstSheetRecords = result.sheetsMap[result.sheetNames[0]]
  console.log('First sheet records count:', firstSheetRecords.length)
  for (const r of firstSheetRecords) {
    console.log(`- Record ${r.productModel} (${r.date}) [${r.process}]: ${r.images.length} images! (imageUrl exists: ${Boolean(r.imageUrl)})`)
  }
}

testFullParse().catch(console.error)

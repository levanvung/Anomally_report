import fs from 'fs'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

async function checkRowAlignment() {
  const buffer = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = wb.SheetNames[0]
  const ws = wb.Sheets[firstSheetName]
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  console.log('SheetJS rawData length:', rawData.length)
  for (let i = 0; i < 8; i++) {
    const row = rawData[i] || []
    console.log(`Row index ${i}:`, [row[0], row[1], row[2], row[3], row[10], row[11]?.slice?.(0, 30)])
  }
}

checkRowAlignment().catch(console.error)

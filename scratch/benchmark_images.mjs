import fs from 'fs'
import JSZip from 'jszip'

async function benchmarkAllImages() {
  const startTime = Date.now()
  const buffer = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const zip = await JSZip.loadAsync(buffer)

  const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('xl/media/'))
  console.log(`Found ${mediaFiles.length} media files`)

  let totalBytes = 0
  for (const m of mediaFiles) {
    const b64 = await zip.file(m).async('base64')
    totalBytes += b64.length
  }

  const duration = Date.now() - startTime
  console.log(`Extracted all ${mediaFiles.length} images to base64 in ${duration}ms! Total base64 size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`)
}

benchmarkAllImages().catch(console.error)

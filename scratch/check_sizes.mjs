import fs from 'fs'
import JSZip from 'jszip'

async function checkImageSizes() {
  const buffer = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const zip = await JSZip.loadAsync(buffer)

  for (let i = 1; i <= 16; i++) {
    const f = zip.file(`xl/media/image${i}.jpeg`)
    if (f) {
      const u8 = await f.async('uint8array')
      console.log(`image${i}.jpeg size: ${(u8.length / 1024).toFixed(1)} KB`)
    }
  }
}

checkImageSizes().catch(console.error)

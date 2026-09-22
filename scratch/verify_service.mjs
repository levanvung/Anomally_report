import fs from 'fs'
import { extractImagesFromExcelZip } from '../src/utils/excelService.js'

async function verify() {
  const buf = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const imagesMap = await extractImagesFromExcelZip(buf)

  const sheetKeys = Object.keys(imagesMap)
  console.log('Total sheets with images extracted:', sheetKeys.length)

  const firstSheet = sheetKeys[0]
  console.log(`Sheet "${firstSheet}":`)
  for (const [rowIdx, imgs] of Object.entries(imagesMap[firstSheet])) {
    console.log(`  Row ${rowIdx}: ${imgs.length} images. First image: id=${imgs[0].id}, url_prefix=${imgs[0].url.slice(0, 35)}...`)
  }
}

verify().catch(console.error)

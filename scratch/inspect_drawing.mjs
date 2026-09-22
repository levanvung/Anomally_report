import fs from 'fs'
import JSZip from 'jszip'

async function inspectDrawing() {
  const buffer = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const zip = await JSZip.loadAsync(buffer)

  const drawingRels = await zip.file('xl/drawings/_rels/drawing1.xml.rels').async('string')
  console.log('--- drawing1.xml.rels ---')
  console.log(drawingRels)

  const drawingXml = await zip.file('xl/drawings/drawing1.xml').async('string')
  console.log('--- drawing1.xml snippet ---')
  console.log(drawingXml.slice(0, 1500))

  const sheet1Rels = await zip.file('xl/worksheets/_rels/sheet1.xml.rels').async('string')
  console.log('--- sheet1.xml.rels ---')
  console.log(sheet1Rels)
}

inspectDrawing().catch(console.error)

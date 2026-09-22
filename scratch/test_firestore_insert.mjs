import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'
import fs from 'fs'
import { parseExcelReportFile } from '../src/utils/excelService.js'

const firebaseConfig = {
  apiKey: "AIzaSyD-FSrJ7o2rS4s4f0ttv4SZF9i_zGXloUY",
  authDomain: "anomallyreport.firebaseapp.com",
  projectId: "anomallyreport",
  storageBucket: "anomallyreport.firebasestorage.app",
  messagingSenderId: "645532920192",
  appId: "1:645532920192:web:2bdf3eba67fc8cfe3db965"
}

async function testInsertWithImages() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const buf = fs.readFileSync('public/Anomaly_report_17092026_1.xlsx')
  const file = {
    name: 'Anomaly_report_17092026_1.xlsx',
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  const result = await parseExcelReportFile(file)
  const firstSheet = result.sheetNames[0]
  const records = result.sheetsMap[firstSheet]
  console.log('Testing inserting record with', records[0].images.length, 'images...')

  try {
    const payload = {
      productModel: records[0].productModel,
      date: records[0].date,
      process: records[0].process,
      defectDescription: records[0].defectDescription,
      images: records[0].images,
      imageUrl: records[0].imageUrl,
      createdAt: new Date().toISOString()
    }
    const totalChars = JSON.stringify(payload).length
    console.log('Payload string length in bytes:', totalChars, `(${(totalChars / 1024 / 1024).toFixed(2)} MB)`)

    const docRef = await addDoc(collection(db, 'manufacturing_reports'), payload)
    console.log('Successfully inserted doc! ID:', docRef.id)
  } catch (err) {
    console.error('FIRESTORE ERROR INSERTING RECORD:', err)
  }
}

testInsertWithImages().catch(console.error)

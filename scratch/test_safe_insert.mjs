import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, deleteDoc, doc } from 'firebase/firestore'
import fs from 'fs'

const firebaseConfig = {
  apiKey: "AIzaSyD-FSrJ7o2rS4s4f0ttv4SZF9i_zGXloUY",
  authDomain: "anomallyreport.firebaseapp.com",
  projectId: "anomallyreport",
  storageBucket: "anomallyreport.firebasestorage.app",
  messagingSenderId: "645532920192",
  appId: "1:645532920192:web:2bdf3eba67fc8cfe3db965"
}

async function testSafeSize() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  // Tạo mock payload 500KB (an toàn dưới 1MB)
  const dummyBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(450 * 1024)
  const payload = {
    productModel: 'TEST-COMPRESSED-MODEL',
    date: '2026-09-21',
    process: 'SMT',
    defectDescription: 'Test insert document with compressed base64 images under 1MB',
    images: [
      { id: 'img_test_1', url: dummyBase64.slice(0, 150 * 1024), name: 'Ảnh 1' },
      { id: 'img_test_2', url: dummyBase64.slice(0, 150 * 1024), name: 'Ảnh 2' },
      { id: 'img_test_3', url: dummyBase64.slice(0, 150 * 1024), name: 'Ảnh 3' },
    ],
    imageUrl: dummyBase64.slice(0, 150 * 1024),
    createdAt: new Date().toISOString()
  }

  const jsonLen = JSON.stringify(payload).length
  console.log(`Payload size: ${(jsonLen / 1024).toFixed(1)} KB`)

  const docRef = await addDoc(collection(db, 'manufacturing_reports'), payload)
  console.log('SUCCESS! Added document to Firestore with ID:', docRef.id)

  // Clean up test doc
  await deleteDoc(doc(db, 'manufacturing_reports', docRef.id))
  console.log('Cleaned up test document.')
}

testSafeSize().catch(console.error)

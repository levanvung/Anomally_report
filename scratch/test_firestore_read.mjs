import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, limit, query } from 'firebase/firestore'
import fs from 'fs'

const firebaseConfig = {
  apiKey: "AIzaSyD-FSrJ7o2rS4s4f0ttv4SZF9i_zGXloUY",
  authDomain: "anomallyreport.firebaseapp.com",
  projectId: "anomallyreport",
  storageBucket: "anomallyreport.firebasestorage.app",
  messagingSenderId: "645532920192",
  appId: "1:645532920192:web:2bdf3eba67fc8cfe3db965"
}

async function test() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  console.log('Testing Firestore read...')
  const q = query(collection(db, 'manufacturing_reports'), limit(3))
  const snap = await getDocs(q)
  console.log('Existing docs in Firestore:', snap.size)
  snap.forEach(doc => {
    const data = doc.data()
    console.log(`Doc ID: ${doc.id}, Model: ${data.productModel}, Images count: ${data.images?.length || 0}, ImageUrl: ${Boolean(data.imageUrl)}`)
  })
}

test().catch(console.error)

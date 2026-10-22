import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase/config'

const user = ref(null)
const isAuthReady = ref(false)
const isLoading = ref(true)
const authError = ref('')

let authReadyResolver = null
const authReadyPromise = new Promise((resolve) => { authReadyResolver = resolve })

const DEMO_USER_KEY = 'sentinel_demo_user'
const MASTER_ADMIN_EMAIL = 'levanvung113@gmail.com'

function getAdminEmails() {
  const envAdmins = import.meta.env.VITE_ADMIN_EMAILS
    ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    : []
  return Array.from(new Set([MASTER_ADMIN_EMAIL, ...envAdmins]))
}

export function determineRole(email) {
  if (!email) return 'viewer'
  return getAdminEmails().includes(email.trim().toLowerCase()) ? 'admin' : 'viewer'
}

if (isFirebaseConfigured && auth) {
  onAuthStateChanged(auth, (u) => {
    if (u) {
      const role = determineRole(u.email)
      user.value = {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        photoURL: u.photoURL || '',
        role,
      }
      if (db) {
        setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          displayName: user.value.displayName,
          role,
          lastLoginAt: new Date().toISOString()
        }, { merge: true }).catch(() => {})
      }
    } else {
      user.value = null
    }
    isLoading.value = false
    if (!isAuthReady.value) {
      isAuthReady.value = true
      authReadyResolver(user.value)
    }
  })
} else {
  const saved = localStorage.getItem(DEMO_USER_KEY)
  user.value = saved ? JSON.parse(saved) : {
    uid: 'demo-admin',
    email: MASTER_ADMIN_EMAIL,
    displayName: 'Admin QC',
    role: 'admin'
  }
  isLoading.value = false
  isAuthReady.value = true
  authReadyResolver(user.value)
}

export function getCurrentUser() {
  return isAuthReady.value ? Promise.resolve(user.value) : authReadyPromise
}

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => (user.value?.role || 'viewer') === 'admin')
  const canCreate = computed(() => isAdmin.value)
  const canEdit = computed(() => isAdmin.value)
  const canDelete = computed(() => isAdmin.value)

  async function loginWithEmail(email, password) {
    authError.value = ''
    isLoading.value = true
    try {
      if (isFirebaseConfigured && auth) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const role = determineRole(email)
        const demo = { uid: 'local_' + Date.now(), email, displayName: email.split('@')[0], role }
        user.value = demo
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo))
      }
      return true
    } catch (e) {
      authError.value = e.message || 'Đăng nhập thất bại'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function registerWithEmail(displayName, email, password) {
    authError.value = ''
    isLoading.value = true
    try {
      if (isFirebaseConfigured && auth) {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (displayName) await updateProfile(cred.user, { displayName })
      } else {
        const role = determineRole(email)
        const demo = { uid: 'local_' + Date.now(), email, displayName: displayName || email.split('@')[0], role }
        user.value = demo
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo))
      }
      return true
    } catch (e) {
      authError.value = e.message || 'Đăng ký thất bại'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithGoogle() {
    authError.value = ''
    isLoading.value = true
    try {
      if (isFirebaseConfigured && auth && googleProvider) {
        await signInWithPopup(auth, googleProvider)
        return true
      }
      const demo = { uid: 'demo-admin', email: MASTER_ADMIN_EMAIL, displayName: 'Admin QC', role: 'admin' }
      user.value = demo
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo))
      return true
    } catch (e) {
      authError.value = e.message || 'Lỗi đăng nhập Google'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    if (isFirebaseConfigured && auth) await signOut(auth)
    localStorage.removeItem(DEMO_USER_KEY)
    user.value = null
  }

  return {
    user,
    isAuthenticated,
    isAuthReady,
    isLoading,
    authError,
    isAdmin,
    canCreate,
    canEdit,
    canDelete,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
  }
}

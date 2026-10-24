import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase/config'

const user = ref(null)
const isAuthReady = ref(true) // Cho phép vào thẳng giao diện ngay lập tức
const isLoading = ref(false)
const authError = ref('')

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
      if (db && role === 'admin') {
        setDoc(
          doc(db, 'users', u.uid),
          {
            uid: u.uid,
            email: u.email,
            displayName: user.value.displayName,
            role,
            lastLoginAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {})
      }
    } else {
      user.value = null
    }
  })
} else {
  const saved = localStorage.getItem(DEMO_USER_KEY)
  user.value = saved ? JSON.parse(saved) : null
}

export function getCurrentUser() {
  return Promise.resolve(user.value)
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
      const role = determineRole(email)
      if (role !== 'admin') {
        authError.value = 'Tài khoản email này không có quyền Admin!'
        return false
      }

      if (isFirebaseConfigured && auth) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const demo = {
          uid: 'local_' + Date.now(),
          email,
          displayName: email.split('@')[0],
          role: 'admin',
        }
        user.value = demo
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo))
      }
      return true
    } catch (e) {
      authError.value = 'Sai email hoặc mật khẩu Admin!'
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
        const cred = await signInWithPopup(auth, googleProvider)
        const role = determineRole(cred.user?.email)
        if (role !== 'admin') {
          await signOut(auth)
          user.value = null
          authError.value = `Email "${cred.user?.email}" không nằm trong danh sách Admin!`
          return false
        }
        return true
      }
      const demo = {
        uid: 'demo-admin',
        email: MASTER_ADMIN_EMAIL,
        displayName: 'Admin QC',
        role: 'admin',
      }
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
    loginWithGoogle,
    logout,
  }
}
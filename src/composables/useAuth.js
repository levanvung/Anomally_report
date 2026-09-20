import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase/config'

const user = ref(null)
const isAuthReady = ref(false)
const isLoading = ref(true)
const authError = ref('')

let authReadyResolver = null
const authReadyPromise = new Promise((resolve) => {
  authReadyResolver = resolve
})

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
  const cleanEmail = email.trim().toLowerCase()
  if (getAdminEmails().includes(cleanEmail)) {
    return 'admin'
  }
  return 'viewer'
}

async function syncUserProfile(userData, role) {
  if (!userData || !userData.uid) return
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(
        doc(db, 'users', userData.uid),
        {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName || (userData.email ? userData.email.split('@')[0] : 'User'),
          photoURL: userData.photoURL || '',
          role: role,
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (err) {
      console.warn('Sync user profile warning:', err)
    }
  }
}

function loadDemoUser() {
  const saved = localStorage.getItem(DEMO_USER_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return null
    }
  }
  return null
}

function saveDemoUser(userData) {
  if (userData) {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(userData))
  } else {
    localStorage.removeItem(DEMO_USER_KEY)
  }
}

// Khởi tạo Auth listener
if (isFirebaseConfigured && auth) {
  onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      const role = determineRole(currentUser.email)
      user.value = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0],
        photoURL: currentUser.photoURL || '',
        emailVerified: currentUser.emailVerified,
        role: role,
      }
      syncUserProfile(currentUser, role)
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
  // Demo mode: khôi phục phiên nếu đã đăng nhập trước đó
  const saved = loadDemoUser()
  user.value = saved || null
  isLoading.value = false
  if (!isAuthReady.value) {
    isAuthReady.value = true
    authReadyResolver(user.value)
  }
}

export function getCurrentUser() {
  if (isAuthReady.value) {
    return Promise.resolve(user.value)
  }
  return authReadyPromise
}

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(user.value))

  const role = computed(() => user.value?.role || 'viewer')
  const isAdmin = computed(() => role.value === 'admin')
  const isViewer = computed(() => role.value === 'viewer')
  const canCreate = computed(() => isAdmin.value)
  const canEdit = computed(() => isAdmin.value)
  const canDelete = computed(() => isAdmin.value)

  const userInitials = computed(() => {
    if (!user.value) return 'ST'
    const name = user.value.displayName || user.value.email || 'Admin'
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(-2)
      .join('')
      .toUpperCase()
  })

  async function loginWithEmail(email, password) {
    authError.value = ''
    isLoading.value = true
    try {
      const role = determineRole(email)
      if (isFirebaseConfigured && auth) {
        const res = await signInWithEmailAndPassword(auth, email, password)
        user.value = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || res.user.email.split('@')[0],
          photoURL: res.user.photoURL || '',
          emailVerified: res.user.emailVerified,
          role: role,
        }
        syncUserProfile(res.user, role)
      } else {
        // Mock login
        user.value = {
          uid: `demo-${Date.now()}`,
          email,
          displayName: email.split('@')[0],
          photoURL: '',
          emailVerified: true,
          role: role,
          isDemo: true,
        }
        saveDemoUser(user.value)
      }
      return { success: true, user: user.value }
    } catch (err) {
      console.error('Login error:', err)
      authError.value = formatAuthError(err)
      return { success: false, error: authError.value }
    } finally {
      isLoading.value = false
    }
  }

  async function registerWithEmail(email, password, displayName) {
    authError.value = ''
    isLoading.value = true
    try {
      let emailSent = false
      const role = determineRole(email)
      if (isFirebaseConfigured && auth) {
        const res = await createUserWithEmailAndPassword(auth, email, password)
        if (displayName) {
          await updateProfile(res.user, { displayName })
        }
        // Gửi email xác thực tài khoản qua Firebase
        try {
          await sendEmailVerification(res.user)
          emailSent = true
        } catch (verErr) {
          console.warn('sendEmailVerification error:', verErr)
        }

        user.value = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: displayName || res.user.email.split('@')[0],
          photoURL: '',
          emailVerified: res.user.emailVerified,
          role: role,
        }
        syncUserProfile(res.user, role)
      } else {
        // Mock register
        user.value = {
          uid: `demo-${Date.now()}`,
          email,
          displayName: displayName || email.split('@')[0],
          photoURL: '',
          emailVerified: false,
          role: role,
          isDemo: true,
        }
        saveDemoUser(user.value)
        emailSent = true
      }
      return { success: true, emailSent, user: user.value }
    } catch (err) {
      console.error('Register error:', err)
      authError.value = formatAuthError(err)
      return { success: false, error: authError.value }
    } finally {
      isLoading.value = false
    }
  }

  async function resendVerificationEmail() {
    authError.value = ''
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await sendEmailVerification(auth.currentUser)
        return { success: true }
      }
      return { success: false, error: 'Không tìm thấy phiên làm việc để gửi lại email xác thực.' }
    } catch (err) {
      console.error('Resend verification error:', err)
      authError.value = formatAuthError(err)
      return { success: false, error: authError.value }
    }
  }

  async function loginWithGoogle() {
    authError.value = ''
    isLoading.value = true
    try {
      if (isFirebaseConfigured && auth && googleProvider) {
        const res = await signInWithPopup(auth, googleProvider)
        const role = determineRole(res.user.email)
        user.value = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || 'Google User',
          photoURL: res.user.photoURL || '',
          emailVerified: res.user.emailVerified,
          role: role,
        }
        syncUserProfile(res.user, role)
      } else {
        // Mock Google login
        const email = 'levanvung113@gmail.com'
        const role = determineRole(email)
        user.value = {
          uid: 'demo-google-user',
          email: email,
          displayName: 'Lê Văn Vững',
          photoURL: '',
          emailVerified: true,
          role: role,
          isDemo: true,
        }
        saveDemoUser(user.value)
      }
      return { success: true, user: user.value }
    } catch (err) {
      console.error('Google login error:', err)
      authError.value = formatAuthError(err)
      return { success: false, error: authError.value }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    isLoading.value = true
    try {
      if (isFirebaseConfigured && auth) {
        await signOut(auth)
      }
      user.value = null
      saveDemoUser(null)
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      isLoading.value = false
    }
  }

  function formatAuthError(err) {
    if (!err || !err.code) return err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
    switch (err.code) {
      case 'auth/invalid-email':
        return 'Địa chỉ email không hợp lệ.'
      case 'auth/user-disabled':
        return 'Tài khoản này đã bị vô hiệu hóa.'
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email hoặc mật khẩu không chính xác.'
      case 'auth/email-already-in-use':
        return 'Email này đã được sử dụng cho một tài khoản khác.'
      case 'auth/weak-password':
        return 'Mật khẩu quá yếu (cần tối thiểu 6 ký tự).'
      case 'auth/popup-closed-by-user':
        return 'Cửa sổ đăng nhập Google đã bị đóng.'
      case 'auth/popup-blocked':
        return 'Trình duyệt đã chặn cửa sổ Popup. Vui lòng cho phép popup để đăng nhập Google.'
      case 'auth/cancelled-popup-request':
        return 'Yêu cầu mở cửa sổ đăng nhập đã bị hủy.'
      case 'auth/account-exists-with-different-credential':
        return 'Email này đã tồn tại với một phương thức đăng nhập khác.'
      case 'auth/too-many-requests':
        return 'Quá nhiều lần thử không thành công. Vui lòng thử lại sau ít phút.'
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng, vui lòng kiểm tra đường truyền Internet.'
      default:
        return err.message || 'Xác thực thất bại.'
    }
  }

  return {
    user,
    isAuthenticated,
    isAuthReady,
    isLoading,
    authError,
    userInitials,
    isFirebaseConfigured,
    role,
    isAdmin,
    isViewer,
    canCreate,
    canEdit,
    canDelete,
    loginWithEmail,
    registerWithEmail,
    resendVerificationEmail,
    loginWithGoogle,
    logout,
  }
}

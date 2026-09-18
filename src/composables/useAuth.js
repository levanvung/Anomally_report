import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../firebase/config'

const user = ref(null)
const isLoading = ref(true)
const authError = ref('')

const DEMO_USER_KEY = 'sentinel_demo_user'

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
      user.value = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0],
        photoURL: currentUser.photoURL || '',
      }
    } else {
      user.value = null
    }
    isLoading.value = false
  })
} else {
  // Demo mode: khôi phục phiên từ localStorage hoặc đặt mặc định
  const saved = loadDemoUser()
  if (saved) {
    user.value = saved
  } else {
    // Mặc định đăng nhập demo user để người dùng không bị chặn ngay lần đầu
    user.value = {
      uid: 'demo-admin-01',
      email: 'admin@sentinel.io',
      displayName: 'Anh Vũ',
      photoURL: '',
      isDemo: true,
    }
    saveDemoUser(user.value)
  }
  isLoading.value = false
}

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(user.value))

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
      if (isFirebaseConfigured && auth) {
        const res = await signInWithEmailAndPassword(auth, email, password)
        user.value = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || res.user.email.split('@')[0],
          photoURL: res.user.photoURL || '',
        }
      } else {
        // Mock login
        user.value = {
          uid: `demo-${Date.now()}`,
          email,
          displayName: email.split('@')[0],
          photoURL: '',
          isDemo: true,
        }
        saveDemoUser(user.value)
      }
      return { success: true }
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
      if (isFirebaseConfigured && auth) {
        const res = await createUserWithEmailAndPassword(auth, email, password)
        if (displayName) {
          await updateProfile(res.user, { displayName })
        }
        user.value = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: displayName || res.user.email.split('@')[0],
          photoURL: '',
        }
      } else {
        // Mock register
        user.value = {
          uid: `demo-${Date.now()}`,
          email,
          displayName: displayName || email.split('@')[0],
          photoURL: '',
          isDemo: true,
        }
        saveDemoUser(user.value)
      }
      return { success: true }
    } catch (err) {
      console.error('Register error:', err)
      authError.value = formatAuthError(err)
      return { success: false, error: authError.value }
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithGoogle() {
    authError.value = ''
    isLoading.value = true
    try {
      if (isFirebaseConfigured && auth && googleProvider) {
        const res = await signInWithPopup(auth, googleProvider)
        user.value = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || 'Google User',
          photoURL: res.user.photoURL || '',
        }
      } else {
        // Mock Google login
        user.value = {
          uid: 'demo-google-user',
          email: 'google.user@sentinel.io',
          displayName: 'Google Sentinel Admin',
          photoURL: '',
          isDemo: true,
        }
        saveDemoUser(user.value)
      }
      return { success: true }
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
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng, vui lòng kiểm tra lại.'
      default:
        return err.message || 'Xác thực thất bại.'
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    authError,
    userInitials,
    isFirebaseConfigured,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
  }
}

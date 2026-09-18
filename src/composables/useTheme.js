import { ref, onMounted } from 'vue'

const THEME_STORAGE_KEY = 'sentinel_theme'

// Initial state from localStorage or system preference
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
const currentTheme = ref(savedTheme || (prefersDark ? 'dark' : 'dark'))

function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName)
  document.body.setAttribute('data-theme', themeName)
  localStorage.setItem(THEME_STORAGE_KEY, themeName)
}

export function useTheme() {
  function toggleTheme() {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
    applyTheme(currentTheme.value)
  }

  function setTheme(themeName) {
    if (themeName === 'light' || themeName === 'dark') {
      currentTheme.value = themeName
      applyTheme(themeName)
    }
  }

  // Initialize on load
  applyTheme(currentTheme.value)

  return {
    theme: currentTheme,
    isDark: () => currentTheme.value === 'dark',
    toggleTheme,
    setTheme,
  }
}

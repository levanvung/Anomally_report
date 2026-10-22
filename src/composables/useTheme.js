import { ref, watch } from 'vue'

const THEME_KEY = 'sentinel_theme_mode'
const theme = ref(localStorage.getItem(THEME_KEY) || 'dark')

function applyTheme(val) {
  document.documentElement.setAttribute('data-theme', val)
}
applyTheme(theme.value)

watch(theme, (val) => {
  localStorage.setItem(THEME_KEY, val)
  applyTheme(val)
})

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  return { theme, toggleTheme }
}

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import type { Theme } from '@/types'

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  isLight: boolean
  isSystem: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const { theme, setTheme } = useAppStore()

  // Initialize theme on mount
  useEffect(() => {
    if (!theme) {
      setTheme(defaultTheme)
    }
  }, [theme, setTheme, defaultTheme])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    // Update data attribute for CSS custom properties
    root.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    
    // Update Tailwind dark mode class
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setTheme('system') // Trigger theme update
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, setTheme])

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark: theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
    isLight: theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches),
    isSystem: theme === 'system'
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, User, WorkbenchLayout, Notification, UploadProgress, Theme } from '@/types'
import { STORAGE_KEYS } from '@/utils/constants'

interface AppStore extends AppState {
  // Actions
  setUser: (user: User | null) => void
  setTheme: (theme: Theme) => void
  updateLayout: (layout: Partial<WorkbenchLayout>) => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  addUpload: (upload: UploadProgress) => void
  updateUpload: (id: string, update: Partial<UploadProgress>) => void
  removeUpload: (id: string) => void
  clearUploads: () => void
}

const defaultLayout: WorkbenchLayout = {
  sidebarCollapsed: false,
  panelVisible: false,
  panelSize: 300,
  activePanel: undefined
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      theme: 'system',
      layout: defaultLayout,
      notifications: [],
      uploads: [],

      // Actions
      setUser: (user) => set({ user }),
      
      setTheme: (theme) => {
        set({ theme })
        
        // Apply theme to document
        const root = document.documentElement
        if (theme === 'dark') {
          root.setAttribute('data-theme', 'dark')
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.setAttribute('data-theme', 'light')
          root.classList.remove('dark')
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
          if (prefersDark) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      },

      updateLayout: (layoutUpdate) => set((state) => ({
        layout: { ...state.layout, ...layoutUpdate }
      })),

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          read: false
        }
        set((state) => ({
          notifications: [newNotification, ...state.notifications]
        }))
      },

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      })),

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(notification => notification.id !== id)
      })),

      clearNotifications: () => set({ notifications: [] }),

      addUpload: (upload) => set((state) => ({
        uploads: [...state.uploads, upload]
      })),

      updateUpload: (id, update) => set((state) => ({
        uploads: state.uploads.map(upload =>
          upload.id === id ? { ...upload, ...update } : upload
        )
      })),

      removeUpload: (id) => set((state) => ({
        uploads: state.uploads.filter(upload => upload.id !== id)
      })),

      clearUploads: () => set({ uploads: [] })
    }),
    {
      name: STORAGE_KEYS.layout,
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
        user: state.user
      })
    }
  )
)

// Initialize theme on app start
const initializeTheme = () => {
  const { theme, setTheme } = useAppStore.getState()
  setTheme(theme)
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  initializeTheme()
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme, setTheme } = useAppStore.getState()
    if (theme === 'system') {
      setTheme('system') // Trigger theme update
    }
  })
}
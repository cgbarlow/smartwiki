import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { Workbench } from '@/components/layout/Workbench'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { NotificationProvider } from '@/components/common/NotificationProvider'
import { useAppStore } from '@/stores/useAppStore'
import { useEffect } from 'react'
import '@/styles/globals.css'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function AppContent() {
  const { theme } = useAppStore()

  // Set initial theme class on document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Workbench>
        <DashboardView />
      </Workbench>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
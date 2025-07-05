import { createContext, useContext, ReactNode } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import type { Notification } from '@/types'

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { 
    notifications, 
    addNotification, 
    removeNotification, 
    clearNotifications,
    markNotificationRead 
  } = useAppStore()

  const showNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    addNotification(notification)
  }

  const handleDismiss = (id: string) => {
    removeNotification(id)
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      case 'warning':
        return <AlertCircle className="h-5 w-5" />
      case 'info':
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getColors = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    }
  }

  const value: NotificationContextType = {
    showNotification,
    removeNotification,
    clearNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.slice(0, 5).map((notification) => (
          <div
            key={notification.id}
            className={cn(
              'p-4 rounded-lg border shadow-lg transition-all duration-300',
              'transform translate-x-0 opacity-100',
              getColors(notification.type)
            )}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">
                  {notification.title}
                </h4>
                {notification.message && (
                  <p className="mt-1 text-sm opacity-90">
                    {notification.message}
                  </p>
                )}
                
                {notification.actions && notification.actions.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {notification.actions.map((action, index) => (
                      <button
                        key={index}
                        className="text-xs font-medium underline hover:no-underline"
                        onClick={() => {
                          // Handle action
                          console.log('Action clicked:', action.action)
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(notification.id)}
                className="p-1 -mr-1 opacity-70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
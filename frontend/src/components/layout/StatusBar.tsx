import { useState, useEffect } from 'react'
import { 
  Wifi, 
  WifiOff, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Users,
  Activity
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/stores/useAppStore'
import { useAgentStore } from '@/stores/useAgentStore'
import { formatFileSize } from '@/utils/format'

export function StatusBar() {
  const { uploads } = useAppStore()
  const { agents, swarmStatus } = useAgentStore()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const activeUploads = uploads.filter(upload => upload.status === 'uploading')
  const processingUploads = uploads.filter(upload => upload.status === 'processing')
  const failedUploads = uploads.filter(upload => upload.status === 'failed')
  const activeAgents = agents.filter(agent => agent.status === 'active' || agent.status === 'busy')

  const statusItems = [
    // Connection Status
    {
      id: 'connection',
      icon: isOnline ? Wifi : WifiOff,
      text: isOnline ? 'Online' : 'Offline',
      status: isOnline ? 'success' : 'error'
    },
    
    // Upload Status
    ...(activeUploads.length > 0 ? [{
      id: 'uploads',
      icon: Upload,
      text: `${activeUploads.length} uploading`,
      status: 'info' as const,
      progress: true
    }] : []),

    // Processing Status
    ...(processingUploads.length > 0 ? [{
      id: 'processing',
      icon: Clock,
      text: `${processingUploads.length} processing`,
      status: 'info' as const
    }] : []),

    // Failed Uploads
    ...(failedUploads.length > 0 ? [{
      id: 'failed',
      icon: AlertCircle,
      text: `${failedUploads.length} failed`,
      status: 'error' as const
    }] : []),

    // Swarm Status
    ...(swarmStatus !== 'inactive' ? [{
      id: 'swarm',
      icon: Activity,
      text: `Swarm ${swarmStatus}`,
      status: swarmStatus === 'active' ? 'success' as const : 'info' as const
    }] : []),

    // Active Agents
    ...(activeAgents.length > 0 ? [{
      id: 'agents',
      icon: Users,
      text: `${activeAgents.length} agents active`,
      status: 'success' as const
    }] : [])
  ]

  return (
    <div className={cn(
      'h-6 px-4 flex items-center justify-between',
      'bg-gray-50 dark:bg-gray-800',
      'border-t border-gray-200 dark:border-gray-700',
      'text-xs text-gray-600 dark:text-gray-400',
      'shrink-0'
    )}>
      {/* Left Side - Status Items */}
      <div className="flex items-center gap-4">
        {statusItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-1.5',
              item.status === 'success' && 'text-green-600 dark:text-green-400',
              item.status === 'error' && 'text-red-600 dark:text-red-400',
              item.status === 'info' && 'text-blue-600 dark:text-blue-400'
            )}
          >
            <item.icon className="h-3 w-3" />
            <span>{item.text}</span>
            {item.progress && (
              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                />
              </div>
            )}
          </div>
        ))}

        {/* Upload Progress Details */}
        {activeUploads.length > 0 && (
          <div className="text-gray-500 dark:text-gray-400">
            {activeUploads.map((upload, index) => (
              <span key={upload.id}>
                {upload.filename} ({upload.progress}%)
                {index < activeUploads.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right Side - System Info */}
      <div className="flex items-center gap-4">
        {/* Memory Usage (if available) */}
        {('memory' in performance) && (
          <span>
            Memory: {formatFileSize((performance as any).memory?.usedJSHeapSize || 0)}
          </span>
        )}

        {/* Current Time */}
        <span>
          {currentTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })}
        </span>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { X, Bot, Shield, Settings, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { PANEL_HEIGHT } from '@/utils/constants'

export function Panel() {
  const { layout, updateLayout } = useAppStore()
  const [activeTab, setActiveTab] = useState<'agents' | 'compliance' | 'settings'>('agents')
  const [isExpanded, setIsExpanded] = useState(true)

  const tabs = [
    { id: 'agents' as const, label: 'AI Agents', icon: Bot },
    { id: 'compliance' as const, label: 'Compliance', icon: Shield },
    { id: 'settings' as const, label: 'Settings', icon: Settings }
  ]

  const handleClose = () => {
    updateLayout({ panelVisible: false })
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const panelHeight = isExpanded ? PANEL_HEIGHT.expanded : PANEL_HEIGHT.collapsed

  return (
    <div 
      className={cn(
        'border-t border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-900',
        'flex flex-col transition-all duration-300'
      )}
      style={{ height: panelHeight }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="p-1"
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-1"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'agents' && (
            <div className="h-full p-4">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Bot className="h-8 w-8 mx-auto mb-2" />
                <p>AI Agents panel content will be implemented here</p>
                <p className="text-sm mt-1">Swarm coordination and agent management</p>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="h-full p-4">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Shield className="h-8 w-8 mx-auto mb-2" />
                <p>Compliance panel content will be implemented here</p>
                <p className="text-sm mt-1">Document compliance checking and reports</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="h-full p-4">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Settings className="h-8 w-8 mx-auto mb-2" />
                <p>Settings panel content will be implemented here</p>
                <p className="text-sm mt-1">Application preferences and configuration</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
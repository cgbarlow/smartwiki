import { useState } from 'react'
import { 
  Files, 
  Bot, 
  Clock, 
  Settings, 
  Upload,
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/stores/useAppStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAgentStore } from '@/stores/useAgentStore'
import { Button } from '@/components/ui/Button'
import { SIDEBAR_WIDTH } from '@/utils/constants'

interface SidebarProps {
  collapsed: boolean
}

interface SidebarSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  items?: Array<{
    id: string
    title: string
    icon?: React.ComponentType<{ className?: string }>
    count?: number
    active?: boolean
  }>
  collapsed?: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user } = useAppStore()
  const { documents } = useDocumentStore()
  const { agents, swarmStatus } = useAgentStore()
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['files', 'agents'])
  )

  const activeAgents = agents.filter(agent => agent.status === 'active' || agent.status === 'busy')
  const recentDocuments = documents
    .filter(doc => doc.status === 'ready')
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 5)

  const sections: SidebarSection[] = [
    {
      id: 'files',
      title: 'Documents',
      icon: Files,
      items: [
        {
          id: 'all-files',
          title: 'All Documents',
          icon: Folder,
          count: documents.filter(doc => doc.status === 'ready').length
        },
        {
          id: 'upload',
          title: 'Upload Files',
          icon: Upload
        }
      ]
    },
    {
      id: 'agents',
      title: 'AI Agents',
      icon: Bot,
      items: [
        {
          id: 'active-agents',
          title: 'Active Agents',
          count: activeAgents.length,
          active: swarmStatus === 'active'
        },
        {
          id: 'agent-settings',
          title: 'Agent Settings'
        }
      ]
    },
    {
      id: 'recent',
      title: 'Recent',
      icon: Clock,
      items: recentDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        icon: FileText
      }))
    },
    {
      id: 'compliance',
      title: 'Compliance',
      icon: Shield,
      items: [
        {
          id: 'compliance-check',
          title: 'Run Checks'
        },
        {
          id: 'compliance-reports',
          title: 'Reports'
        }
      ]
    }
  ]

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const handleQuickSearch = () => {
    // Focus the search input in the title bar
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }

  return (
    <div
      className={cn(
        'h-full bg-white dark:bg-gray-900',
        'border-r border-gray-200 dark:border-gray-700',
        'flex flex-col transition-all duration-300',
        collapsed ? 'w-14' : 'w-72'
      )}
      style={{
        width: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded
      }}
    >
      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        {collapsed ? (
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 w-full justify-center"
              onClick={handleQuickSearch}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 w-full justify-center"
              aria-label="Upload"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleQuickSearch}
            >
              <Search className="h-4 w-4" />
              Quick Search
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-2">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const hasItems = section.items && section.items.length > 0

          return (
            <div key={section.id} className="mb-4">
              {/* Section Header */}
              <button
                onClick={() => hasItems && toggleSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'transition-colors duration-150',
                  collapsed && 'justify-center'
                )}
              >
                <section.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">
                      {section.title}
                    </span>
                    {hasItems && (
                      isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )
                    )}
                  </>
                )}
              </button>

              {/* Section Items */}
              {!collapsed && hasItems && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {section.items!.map((item) => (
                    <button
                      key={item.id}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md',
                        'text-sm text-gray-600 dark:text-gray-400',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        'transition-colors duration-150',
                        item.active && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      )}
                    >
                      {item.icon && <item.icon className="h-3 w-3 shrink-0" />}
                      <span className="flex-1 text-left truncate">
                        {item.title}
                      </span>
                      {item.count !== undefined && (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded-full',
                          'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                          item.active && 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                        )}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* User Section */}
      {!collapsed && user && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-1"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
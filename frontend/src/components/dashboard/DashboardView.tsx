import { useState } from 'react'
import { 
  Upload, 
  Search, 
  Bot, 
  FileText, 
  TrendingUp, 
  Shield,
  Clock,
  Star,
  Filter,
  Grid,
  List
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/Modal'
import { useAppStore } from '@/stores/useAppStore'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useAgentStore } from '@/stores/useAgentStore'
import { useNotifications } from '@/components/common/NotificationProvider'

type ViewMode = 'grid' | 'list'

export function DashboardView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  
  const { updateLayout } = useAppStore()
  const { documents } = useDocumentStore()
  const { agents, swarmStatus } = useAgentStore()
  const { showNotification } = useNotifications()

  const recentDocuments = documents
    .filter(doc => doc.status === 'ready')
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 6)

  const activeAgents = agents.filter(agent => agent.status === 'active' || agent.status === 'busy')
  const totalDocuments = documents.filter(doc => doc.status === 'ready').length

  const handleSearch = (query: string) => {
    console.log('Searching for:', query)
    showNotification({
      type: 'info',
      title: 'Search',
      message: `Searching for "${query}"...`
    })
  }

  const handleUpload = () => {
    setIsUploadModalOpen(true)
  }

  const handleOpenPanel = () => {
    updateLayout({ panelVisible: true, activePanel: 'agents' })
  }

  const stats = [
    {
      label: 'Documents',
      value: totalDocuments,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Active Agents',
      value: activeAgents.length,
      icon: Bot,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Recent Uploads',
      value: documents.filter(doc => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(doc.uploadDate) > weekAgo
      }).length,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Compliance Score',
      value: '98%',
      icon: Shield,
      color: 'text-emerald-600 dark:text-emerald-400'
    }
  ]

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              SmartWiki Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your documents with AI-powered intelligence
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPanel}
              className="flex items-center gap-2"
            >
              <Bot className="h-4 w-4" />
              {swarmStatus === 'active' ? 'View Agents' : 'Activate Swarm'}
            </Button>
            
            <Button
              variant="primary"
              onClick={handleUpload}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Documents
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-2xl">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="Search documents, ask questions, or describe what you need..."
            className="w-full"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={cn('p-2 rounded-lg bg-white dark:bg-gray-700', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Documents
          </h2>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none border-0"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none border-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Documents Grid/List */}
        {recentDocuments.length > 0 ? (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-2'
          )}>
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  'border border-gray-200 dark:border-gray-700 rounded-lg p-4',
                  'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer',
                  viewMode === 'list' && 'flex items-center gap-4'
                )}
              >
                <div className={cn('flex items-center gap-3', viewMode === 'list' && 'flex-1')}>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {doc.type.toUpperCase()} • {new Date(doc.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {viewMode === 'list' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No documents yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload your first document to get started with AI-powered analysis.
            </p>
            <Button onClick={handleUpload} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Documents"
        size="lg"
      >
        <ModalContent>
          <div className="text-center py-8">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Upload your documents
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Drag and drop files here, or click to browse. Supports PDF, DOCX, TXT, and Markdown.
            </p>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
              <p className="text-gray-500 dark:text-gray-400">
                Upload functionality will be implemented in the next phase
              </p>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsUploadModalOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="primary">
            Upload
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
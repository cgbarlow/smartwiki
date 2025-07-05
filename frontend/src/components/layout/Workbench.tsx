import { cn } from '@/utils/cn'
import { useAppStore } from '@/stores/useAppStore'
import { useResponsive } from '@/hooks/useResponsive'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { EditorArea } from './EditorArea'
import { Panel } from './Panel'
import { StatusBar } from './StatusBar'

interface WorkbenchProps {
  children: React.ReactNode
  className?: string
}

export function Workbench({ children, className }: WorkbenchProps) {
  const { layout } = useAppStore()
  const { layoutMode } = useResponsive()
  
  const { sidebarCollapsed, panelVisible } = layout
  const isMobile = layoutMode === 'mobile'

  return (
    <div 
      className={cn(
        'h-screen w-full flex flex-col bg-surface-light dark:bg-surface-dark',
        'text-text-primary dark:text-text-primary-dark',
        className
      )}
      data-layout={layoutMode}
    >
      {/* Title Bar */}
      <TitleBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on mobile */}
        {!isMobile && (
          <Sidebar collapsed={sidebarCollapsed} />
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && !sidebarCollapsed && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => useAppStore.getState().updateLayout({ sidebarCollapsed: true })}
            />
            {/* Sidebar */}
            <div className="fixed left-0 top-0 bottom-0 z-50 w-80">
              <Sidebar collapsed={false} />
            </div>
          </>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorArea>{children}</EditorArea>
          
          {/* Panel */}
          {panelVisible && <Panel />}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  )
}
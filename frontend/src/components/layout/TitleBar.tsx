import { Menu, Search, Moon, Sun, Monitor, Bell, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/stores/useAppStore'
import { useResponsive } from '@/hooks/useResponsive'
import { Button } from '@/components/ui/Button'
import { APP_NAME } from '@/utils/constants'

export function TitleBar() {
  const { theme, layout, user, notifications, setTheme, updateLayout } = useAppStore()
  const { isMobile } = useResponsive()
  
  const unreadCount = notifications.filter(n => !n.read).length

  const handleToggleSidebar = () => {
    updateLayout({ sidebarCollapsed: !layout.sidebarCollapsed })
  }

  const handleToggleTheme = () => {
    const themes = ['light', 'dark', 'system'] as const
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <div className={cn(
      'h-12 px-4 flex items-center justify-between',
      'bg-white dark:bg-gray-900',
      'border-b border-gray-200 dark:border-gray-700',
      'shrink-0'
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleSidebar}
          className="p-2"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Logo and App Name */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          {!isMobile && (
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {APP_NAME}
            </span>
          )}
        </div>
      </div>

      {/* Center Section - Search (Desktop only) */}
      {!isMobile && (
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search documents..."
              className={cn(
                'w-full pl-10 pr-4 py-1.5 text-sm',
                'bg-gray-100 dark:bg-gray-800',
                'border border-transparent rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'placeholder:text-gray-500 dark:placeholder:text-gray-400'
              )}
            />
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search Button (Mobile only) */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="p-2 relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 h-5 w-5 text-xs',
              'bg-red-500 text-white rounded-full',
              'flex items-center justify-center'
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleTheme}
          className="p-2"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
        >
          <ThemeIcon className="h-4 w-4" />
        </Button>

        {/* User Menu */}
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          aria-label="User menu"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
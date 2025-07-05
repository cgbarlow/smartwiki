import { cn } from '@/utils/cn'

interface EditorAreaProps {
  children: React.ReactNode
  className?: string
}

export function EditorArea({ children, className }: EditorAreaProps) {
  return (
    <div 
      className={cn(
        'flex-1 overflow-hidden',
        'bg-surface-light dark:bg-surface-dark',
        className
      )}
    >
      {children}
    </div>
  )
}
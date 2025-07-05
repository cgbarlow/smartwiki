import { useEffect, useCallback } from 'react'

type KeyboardHandler = (event: KeyboardEvent) => void
type KeyCombo = string // e.g., 'cmd+k', 'ctrl+shift+n'

interface UseKeyboardOptions {
  preventDefault?: boolean
  stopPropagation?: boolean
  enabled?: boolean
}

const defaultOptions: UseKeyboardOptions = {
  preventDefault: true,
  stopPropagation: true,
  enabled: true
}

// Normalize key combinations across platforms
const normalizeKey = (key: string): string => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  
  return key
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('cmd', isMac ? 'meta' : 'ctrl')
    .replace('command', isMac ? 'meta' : 'ctrl')
}

// Parse key combination string into modifiers and key
const parseKeyCombo = (combo: string) => {
  const parts = normalizeKey(combo).split('+')
  const key = parts.pop()!
  const modifiers = parts

  return {
    key,
    meta: modifiers.includes('meta'),
    ctrl: modifiers.includes('ctrl'),
    alt: modifiers.includes('alt'),
    shift: modifiers.includes('shift')
  }
}

// Check if keyboard event matches the key combination
const matchesKeyCombo = (event: KeyboardEvent, combo: string): boolean => {
  const { key, meta, ctrl, alt, shift } = parseKeyCombo(combo)
  
  return (
    event.key.toLowerCase() === key.toLowerCase() &&
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.altKey === alt &&
    event.shiftKey === shift
  )
}

export function useKeyboard(
  keyCombo: KeyCombo,
  handler: KeyboardHandler,
  options: UseKeyboardOptions = {}
) {
  const opts = { ...defaultOptions, ...options }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!opts.enabled) return
    
    if (matchesKeyCombo(event, keyCombo)) {
      if (opts.preventDefault) {
        event.preventDefault()
      }
      if (opts.stopPropagation) {
        event.stopPropagation()
      }
      
      handler(event)
    }
  }, [keyCombo, handler, opts])

  useEffect(() => {
    if (!opts.enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, opts.enabled])
}

// Hook for multiple keyboard shortcuts
export function useKeyboardShortcuts(
  shortcuts: Record<string, KeyboardHandler>,
  options: UseKeyboardOptions = {}
) {
  const opts = { ...defaultOptions, ...options }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!opts.enabled) return

    for (const [combo, handler] of Object.entries(shortcuts)) {
      if (matchesKeyCombo(event, combo)) {
        if (opts.preventDefault) {
          event.preventDefault()
        }
        if (opts.stopPropagation) {
          event.stopPropagation()
        }
        
        handler(event)
        break // Only handle the first matching shortcut
      }
    }
  }, [shortcuts, opts])

  useEffect(() => {
    if (!opts.enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, opts.enabled])
}

// Common keyboard shortcuts hook for the app
export function useAppKeyboards() {
  const shortcuts = {
    'cmd+k': () => {
      // Focus search
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    },
    'cmd+b': () => {
      // Toggle sidebar
      const event = new CustomEvent('toggle-sidebar')
      window.dispatchEvent(event)
    },
    'cmd+j': () => {
      // Toggle panel
      const event = new CustomEvent('toggle-panel')
      window.dispatchEvent(event)
    },
    'cmd+shift+l': () => {
      // Toggle theme
      const event = new CustomEvent('toggle-theme')
      window.dispatchEvent(event)
    },
    'cmd+u': () => {
      // Trigger file upload
      const event = new CustomEvent('trigger-upload')
      window.dispatchEvent(event)
    },
    'escape': () => {
      // Close modals, clear focus, etc.
      const event = new CustomEvent('escape-pressed')
      window.dispatchEvent(event)
    }
  }

  useKeyboardShortcuts(shortcuts)
}
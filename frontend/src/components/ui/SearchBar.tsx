import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SearchSuggestion {
  id: string
  text: string
  type?: 'recent' | 'suggestion' | 'document'
  icon?: React.ReactNode
}

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (query: string) => void
  onFocus?: () => void
  onBlur?: () => void
  suggestions?: SearchSuggestion[]
  loading?: boolean
  disabled?: boolean
  showSuggestions?: boolean
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  className?: string
}

export function SearchBar({
  placeholder = 'Search documents...',
  value = '',
  onChange,
  onSearch,
  onFocus,
  onBlur,
  suggestions = [],
  loading = false,
  disabled = false,
  showSuggestions = false,
  onSuggestionSelect,
  className
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const currentValue = value !== undefined ? value : internalValue
  const showSuggestionsPanel = showSuggestions && isFocused && suggestions.length > 0

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionsPanel) {
      if (e.key === 'Enter') {
        onSearch?.(currentValue)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onSuggestionSelect?.(suggestions[selectedIndex])
        } else {
          onSearch?.(currentValue)
        }
        break
      case 'Escape':
        setIsFocused(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    // Delay to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false)
      setSelectedIndex(-1)
      onBlur?.()
    }, 150)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onSuggestionSelect?.(suggestion)
    setIsFocused(false)
  }

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200'
          )}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {currentValue && !loading && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showSuggestionsPanel && (
        <div
          ref={suggestionsRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-1 z-50',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg max-h-60 overflow-y-auto'
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full px-4 py-2 text-left flex items-center gap-2',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                'text-gray-900 dark:text-gray-100',
                'transition-colors duration-150',
                index === selectedIndex && 'bg-gray-50 dark:bg-gray-700'
              )}
            >
              {suggestion.icon && (
                <span className="text-gray-400">{suggestion.icon}</span>
              )}
              <span className="truncate">{suggestion.text}</span>
              {suggestion.type && (
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {suggestion.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
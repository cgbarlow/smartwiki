import { forwardRef, useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { InputProps } from '@/types'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    placeholder,
    value,
    onChange,
    disabled = false,
    error,
    label,
    required = false,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [internalValue, setInternalValue] = useState(value || '')
    
    const isPasswordType = type === 'password'
    const inputType = isPasswordType && showPassword ? 'text' : type
    const hasError = Boolean(error)
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)
      onChange?.(newValue)
    }

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            value={value !== undefined ? value : internalValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2 border rounded-lg text-sm transition-colors duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              hasError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:focus:border-primary-400',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isPasswordType && 'pr-10',
              className
            )}
            {...props}
          />
          
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        
        {error && (
          <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
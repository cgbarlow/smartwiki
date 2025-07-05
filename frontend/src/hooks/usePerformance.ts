import { useEffect, useState, useCallback } from 'react'

interface PerformanceMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
}

interface UsePerformanceReturn {
  metrics: PerformanceMetrics
  isLoading: boolean
  measureRender: (componentName: string) => () => void
  measureAsyncOperation: <T>(
    operation: () => Promise<T>,
    operationName: string
  ) => Promise<T>
}

export function usePerformance(): UsePerformanceReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Web Vitals measurement
    const measureWebVitals = () => {
      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
      if (fcpEntry) {
        setMetrics(prev => ({ ...prev, fcp: fcpEntry.startTime }))
      }

      // Time to First Byte
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigationEntry) {
        setMetrics(prev => ({ 
          ...prev, 
          ttfb: navigationEntry.responseStart - navigationEntry.requestStart 
        }))
      }

      // Largest Contentful Paint
      if ('LargestContentfulPaint' in window) {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
        }).observe({ entryTypes: ['largest-contentful-paint'] })
      }

      // First Input Delay
      if ('FirstInputDelay' in window) {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }))
          })
        }).observe({ entryTypes: ['first-input'] })
      }

      // Cumulative Layout Shift
      if ('LayoutShift' in window) {
        let clsValue = 0
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
              setMetrics(prev => ({ ...prev, cls: clsValue }))
            }
          })
        }).observe({ entryTypes: ['layout-shift'] })
      }

      setIsLoading(false)
    }

    // Wait for page load
    if (document.readyState === 'complete') {
      measureWebVitals()
    } else {
      window.addEventListener('load', measureWebVitals)
      return () => window.removeEventListener('load', measureWebVitals)
    }
  }, [])

  const measureRender = useCallback((componentName: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      console.log(`[Performance] ${componentName} render time: ${renderTime.toFixed(2)}ms`)
      
      // Mark the measurement
      performance.mark(`${componentName}-render-end`)
      performance.measure(
        `${componentName}-render`, 
        `${componentName}-render-start`, 
        `${componentName}-render-end`
      )
    }
  }, [])

  const measureAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now()
    performance.mark(`${operationName}-start`)
    
    try {
      const result = await operation()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      performance.mark(`${operationName}-end`)
      performance.measure(operationName, `${operationName}-start`, `${operationName}-end`)
      
      console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`)
      
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`[Performance] ${operationName} (failed): ${duration.toFixed(2)}ms`)
      throw error
    }
  }, [])

  return {
    metrics,
    isLoading,
    measureRender,
    measureAsyncOperation
  }
}
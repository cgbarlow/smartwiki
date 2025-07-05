import { useState, useEffect } from 'react'
import { BREAKPOINTS } from '@/utils/constants'
import type { ScreenSize, LayoutMode } from '@/types'

interface UseResponsiveReturn {
  screenSize: ScreenSize
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  layoutMode: LayoutMode
  breakpoint: number
}

export function useResponsive(): UseResponsiveReturn {
  const [screenSize, setScreenSize] = useState<ScreenSize>('lg')
  
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      
      if (width < BREAKPOINTS.sm) {
        setScreenSize('sm')
      } else if (width < BREAKPOINTS.md) {
        setScreenSize('sm')
      } else if (width < BREAKPOINTS.lg) {
        setScreenSize('md')
      } else if (width < BREAKPOINTS.xl) {
        setScreenSize('lg')
      } else if (width < BREAKPOINTS['2xl']) {
        setScreenSize('xl')
      } else {
        setScreenSize('2xl')
      }
    }
    
    // Initial check
    checkScreenSize()
    
    // Add listener
    window.addEventListener('resize', checkScreenSize)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])
  
  const isMobile = screenSize === 'sm'
  const isTablet = screenSize === 'md'
  const isDesktop = screenSize === 'lg' || screenSize === 'xl' || screenSize === '2xl'
  
  const layoutMode: LayoutMode = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  
  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    layoutMode,
    breakpoint: BREAKPOINTS[screenSize]
  }
}
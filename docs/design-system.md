# SmartWiki Design System
## Based on DeepWiki Interface Analysis

## 🎨 Visual Design Specifications

### Color Palette

#### Primary Colors
```css
:root {
  /* Light Theme */
  --color-primary: #0969da;
  --color-primary-hover: #0550ae;
  --color-primary-active: #0a3069;
  
  /* Dark Theme */
  --color-primary-dark: #4493f8;
  --color-primary-hover-dark: #2f81f7;
  --color-primary-active-dark: #1f6feb;
}
```

#### Neutral Colors
```css
:root {
  /* Light Theme */
  --color-canvas-default: #ffffff;
  --color-canvas-subtle: #f6f8fa;
  --color-canvas-inset: #f6f8fa;
  --color-border-default: #d1d9e0;
  --color-border-muted: #d8dee4;
  
  /* Dark Theme */
  --color-canvas-default-dark: #0d1117;
  --color-canvas-subtle-dark: #161b22;
  --color-canvas-inset-dark: #161b22;
  --color-border-default-dark: #30363d;
  --color-border-muted-dark: #21262d;
}
```

#### Text Colors
```css
:root {
  /* Light Theme */
  --color-fg-default: #1f2328;
  --color-fg-muted: #656d76;
  --color-fg-subtle: #6e7781;
  --color-fg-on-emphasis: #ffffff;
  
  /* Dark Theme */
  --color-fg-default-dark: #e6edf3;
  --color-fg-muted-dark: #7d8590;
  --color-fg-subtle-dark: #6e7681;
  --color-fg-on-emphasis-dark: #ffffff;
}
```

### Typography

#### Font Stack
```css
:root {
  --font-family-primary: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  --font-family-mono: 'Geist Mono', ui-monospace, SFMono-Regular, 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}
```

#### Font Sizes
```css
:root {
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-md: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
}
```

#### Font Weights
```css
:root {
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### Spacing Scale
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
}
```

### Border Radius
```css
:root {
  --radius-sm: 0.125rem;  /* 2px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-full: 9999px;  /* Full radius */
}
```

## 🏗️ Component Specifications

### Repository Card Component
```css
.repository-card {
  background: var(--color-canvas-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all 0.2s ease;
  cursor: pointer;
}

.repository-card:hover {
  border-color: var(--color-border-muted);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.repository-card__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-default);
  margin-bottom: var(--space-2);
}

.repository-card__description {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  line-height: 1.5;
  margin-bottom: var(--space-4);
}

.repository-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-fg-subtle);
}
```

### Search Interface
```css
.search-container {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
}

.search-prompt {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg-default);
  text-align: center;
  margin-bottom: var(--space-8);
}

.search-bar {
  width: 100%;
  padding: var(--space-4);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  background: var(--color-canvas-default);
  color: var(--color-fg-default);
  transition: border-color 0.2s ease;
}

.search-bar:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}
```

### Grid Layout
```css
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    padding: var(--space-4);
  }
}
```

### Navigation Header
```css
.header {
  background: var(--color-canvas-default);
  border-bottom: 1px solid var(--color-border-default);
  padding: var(--space-4) var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header__logo {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-fg-default);
  text-decoration: none;
}

.header__nav {
  display: flex;
  gap: var(--space-6);
  align-items: center;
}

.header__nav-link {
  color: var(--color-fg-muted);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: color 0.2s ease;
}

.header__nav-link:hover {
  color: var(--color-fg-default);
}
```

### Button Components
```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn--primary {
  background: var(--color-primary);
  color: var(--color-fg-on-emphasis);
}

.btn--primary:hover {
  background: var(--color-primary-hover);
}

.btn--secondary {
  background: var(--color-canvas-subtle);
  color: var(--color-fg-default);
  border-color: var(--color-border-default);
}

.btn--secondary:hover {
  background: var(--color-canvas-default);
  border-color: var(--color-border-muted);
}
```

### Theme Toggle
```css
.theme-toggle {
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-canvas-default);
  color: var(--color-fg-default);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background: var(--color-canvas-subtle);
}
```

## 🎨 Animation & Transitions

### Micro-interactions
```css
/* Hover animations */
.interactive-element {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus states */
.focusable:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Loading states */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 2s infinite;
}
```

## 📱 Responsive Design

### Breakpoints
```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

### Mobile Adaptations
```css
@media (max-width: 768px) {
  .header {
    padding: var(--space-3) var(--space-4);
  }
  
  .search-prompt {
    font-size: var(--font-size-xl);
  }
  
  .repository-card {
    padding: var(--space-4);
  }
}
```

## 🌙 Dark Mode Implementation

### CSS Variables Toggle
```css
[data-theme="dark"] {
  --color-canvas-default: var(--color-canvas-default-dark);
  --color-canvas-subtle: var(--color-canvas-subtle-dark);
  --color-canvas-inset: var(--color-canvas-inset-dark);
  --color-border-default: var(--color-border-default-dark);
  --color-border-muted: var(--color-border-muted-dark);
  --color-fg-default: var(--color-fg-default-dark);
  --color-fg-muted: var(--color-fg-muted-dark);
  --color-fg-subtle: var(--color-fg-subtle-dark);
  --color-primary: var(--color-primary-dark);
  --color-primary-hover: var(--color-primary-hover-dark);
  --color-primary-active: var(--color-primary-active-dark);
}
```

## 🎯 Implementation Notes

### CSS Architecture
- Use CSS custom properties for theming
- Implement utility classes for spacing and typography
- Use logical properties for better i18n support
- Implement container queries for component-level responsiveness

### Performance Considerations
- Minimize reflow and repaint with efficient CSS
- Use transform and opacity for animations
- Implement critical CSS loading
- Optimize font loading with font-display: swap

### Accessibility
- Ensure sufficient color contrast (4.5:1 for normal text)
- Provide focus indicators for all interactive elements
- Support reduced motion preferences
- Implement proper ARIA labels and roles

This design system provides a comprehensive foundation for implementing SmartWiki with the exact look and feel of DeepWiki, while maintaining flexibility for additional features and customization.
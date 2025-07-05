# SmartWiki Frontend Specifications
## Complete Implementation Guide Based on DeepWiki Design

## 🎯 Project Overview

SmartWiki frontend will replicate the clean, professional look and feel of DeepWiki (https://deepwiki.com/microsoft/vscode) while supporting multi-tenant RAG functionality, file management, and agentic systems.

## 🎨 Visual Design Specifications

### Design Principles
1. **Minimalism**: Clean, uncluttered interface focusing on content
2. **Discoverability**: Intuitive navigation and search-first approach
3. **Professionalism**: GitHub-inspired design language
4. **Accessibility**: WCAG 2.1 AA compliance throughout
5. **Performance**: Optimized for speed and responsiveness

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ TitleBar (Logo, Navigation, Theme Toggle, User Menu)       │
├─────────────────────────────────────────────────────────────┤
│ │ Sidebar  │ EditorArea (Main Content)                    │ │
│ │          │                                              │ │
│ │ - Files  │ ┌──────────────────────────────────────────┐ │ │
│ │ - Agents │ │ Search Interface                         │ │ │
│ │ - Recents│ │ "Which document would you like to        │ │ │
│ │ - Settings│ │  understand?"                           │ │ │
│ │          │ └──────────────────────────────────────────┘ │ │
│ │          │                                              │ │
│ │          │ ┌──────────────────────────────────────────┐ │ │
│ │          │ │ Document Grid                            │ │ │
│ │          │ │ ┌─────┐ ┌─────┐ ┌─────┐                  │ │ │
│ │          │ │ │ Doc │ │ Doc │ │ Doc │                  │ │ │
│ │          │ │ │  1  │ │  2  │ │  3  │                  │ │ │
│ │          │ │ └─────┘ └─────┘ └─────┘                  │ │ │
│ │          │ └──────────────────────────────────────────┘ │ │
│ │          │                                              │ │
├─────────────────────────────────────────────────────────────┤
│ Panel (Agent Interface, Compliance Tools)                  │
├─────────────────────────────────────────────────────────────┤
│ StatusBar (Upload Progress, Notifications, Status)         │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Component Architecture

### 1. Workbench Component (Main Layout)
```typescript
interface WorkbenchProps {
  children: React.ReactNode;
  sidebarCollapsed?: boolean;
  panelVisible?: boolean;
  layout?: 'desktop' | 'tablet' | 'mobile';
}

const Workbench: React.FC<WorkbenchProps> = ({
  children,
  sidebarCollapsed = false,
  panelVisible = false,
  layout = 'desktop'
}) => {
  return (
    <div className="workbench" data-layout={layout}>
      <TitleBar />
      <div className="workbench__body">
        <Sidebar collapsed={sidebarCollapsed} />
        <EditorArea>{children}</EditorArea>
      </div>
      {panelVisible && <Panel />}
      <StatusBar />
    </div>
  );
};
```

### 2. Document Card Component
```typescript
interface DocumentCardProps {
  id: string;
  title: string;
  description?: string;
  type: 'pdf' | 'markdown' | 'docx' | 'txt';
  uploadDate: Date;
  size: number;
  thumbnail?: string;
  stars?: number;
  tags?: string[];
  onClick: (id: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  id,
  title,
  description,
  type,
  uploadDate,
  size,
  thumbnail,
  stars,
  tags,
  onClick
}) => {
  return (
    <div 
      className="document-card"
      onClick={() => onClick(id)}
      role="button"
      tabIndex={0}
    >
      <div className="document-card__header">
        <div className="document-card__icon">
          <FileIcon type={type} />
        </div>
        <div className="document-card__meta">
          {stars && (
            <span className="document-card__stars">
              <StarIcon /> {stars}
            </span>
          )}
          <span className="document-card__size">
            {formatFileSize(size)}
          </span>
        </div>
      </div>
      
      <div className="document-card__content">
        <h3 className="document-card__title">{title}</h3>
        {description && (
          <p className="document-card__description">{description}</p>
        )}
      </div>
      
      <div className="document-card__footer">
        <time className="document-card__date">
          {formatRelativeTime(uploadDate)}
        </time>
        {tags && (
          <div className="document-card__tags">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      
      {thumbnail && (
        <div className="document-card__thumbnail">
          <img src={thumbnail} alt={`${title} preview`} />
        </div>
      )}
    </div>
  );
};
```

### 3. Search Interface Component
```typescript
interface SearchInterfaceProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onFilter: (filters: SearchFilters) => void;
  suggestions?: string[];
  loading?: boolean;
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  placeholder = "Which document would you like to understand?",
  onSearch,
  onFilter,
  suggestions = [],
  loading = false
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  return (
    <div className="search-interface">
      <div className="search-interface__prompt">
        <h2>Which document would you like to understand?</h2>
      </div>
      
      <div className="search-interface__container">
        <div className="search-bar">
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="search-bar__input"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {loading && <Spinner />}
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <SearchSuggestions
            suggestions={suggestions}
            onSelect={(suggestion) => {
              setQuery(suggestion);
              onSearch(suggestion);
            }}
          />
        )}
      </div>
      
      <SearchFilters onFilter={onFilter} />
    </div>
  );
};
```

### 4. File Upload Component
```typescript
interface FileUploadProps {
  onUpload: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  dragAndDrop?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  acceptedTypes = ['.pdf', '.docx', '.txt', '.md'],
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  dragAndDrop = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      acceptedTypes.some(type => file.name.endsWith(type)) &&
      file.size <= maxSize
    );
    
    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  }, [acceptedTypes, maxSize, onUpload]);
  
  return (
    <div 
      className={`file-upload ${isDragging ? 'file-upload--dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      <div className="file-upload__icon">
        <UploadIcon />
      </div>
      
      <div className="file-upload__content">
        <h3>Upload your documents</h3>
        <p>Drag and drop files here, or click to browse</p>
        <p className="file-upload__formats">
          Supported formats: {acceptedTypes.join(', ')}
        </p>
      </div>
      
      <input
        type="file"
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onUpload(files);
        }}
        className="file-upload__input"
        hidden
        id="file-upload"
      />
      
      <label htmlFor="file-upload" className="btn btn--primary">
        Choose Files
      </label>
    </div>
  );
};
```

## 🎨 Styling Implementation

### CSS Architecture
```css
/* Base styles using CSS custom properties */
:root {
  /* Design tokens from design-system.md */
  --font-family-primary: 'Geist Sans', system-ui, sans-serif;
  --color-primary: #0969da;
  --color-background: #ffffff;
  --color-surface: #f6f8fa;
  --color-border: #d1d9e0;
  --color-text: #1f2328;
  --color-text-muted: #656d76;
  
  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Border radius */
  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --color-background: #0d1117;
  --color-surface: #161b22;
  --color-border: #30363d;
  --color-text: #e6edf3;
  --color-text-muted: #7d8590;
}
```

### Component Styles
```css
/* Document Card */
.document-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.document-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.document-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.document-card__description {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

/* Search Interface */
.search-interface {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
}

.search-interface__prompt h2 {
  font-size: 1.875rem;
  font-weight: 500;
  text-align: center;
  margin-bottom: var(--space-8);
  color: var(--color-text);
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.search-bar__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1rem;
  color: var(--color-text);
}

/* Grid Layout */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
  padding: var(--space-6);
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    padding: var(--space-4);
  }
}
```

## 📱 Responsive Design Strategy

### Breakpoints
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<keyof typeof breakpoints>('lg');
  
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else if (width < 1280) setScreenSize('xl');
      else setScreenSize('2xl');
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return { screenSize, isMobile: screenSize === 'sm' || screenSize === 'md' };
};
```

### Mobile Adaptations
```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
  .workbench {
    grid-template-areas: 
      "titlebar"
      "editor"
      "statusbar";
    grid-template-rows: auto 1fr auto;
  }
  
  .sidebar {
    position: absolute;
    left: -100%;
    transition: left 0.3s ease;
    z-index: 1000;
  }
  
  .sidebar--open {
    left: 0;
  }
  
  .search-interface__prompt h2 {
    font-size: 1.5rem;
  }
  
  .document-card {
    padding: var(--space-4);
  }
}
```

## 🔧 Implementation Timeline

### Week 1: Foundation
- [ ] Set up Vite + React + TypeScript project
- [ ] Configure Tailwind CSS with custom design tokens
- [ ] Implement base Workbench layout
- [ ] Create core UI components (Button, Input, Modal)
- [ ] Set up theme system with dark/light mode

### Week 2: Core Components
- [ ] Implement Document Card component
- [ ] Create Search Interface with suggestions
- [ ] Build File Upload with drag & drop
- [ ] Develop responsive grid layout
- [ ] Add navigation and routing

### Week 3: Advanced Features
- [ ] Implement Agent Panel interface
- [ ] Create Compliance checking UI
- [ ] Add Document Viewer with markdown support
- [ ] Build user authentication UI
- [ ] Implement state management with Zustand

### Week 4: Polish & Optimization
- [ ] Add animations and micro-interactions
- [ ] Implement virtual scrolling for large lists
- [ ] Optimize performance with code splitting
- [ ] Add comprehensive error handling
- [ ] Complete mobile responsive design

### Week 5: Testing & Deployment
- [ ] Write comprehensive test suite
- [ ] Perform accessibility audit
- [ ] Optimize bundle size and performance
- [ ] Complete documentation
- [ ] Deploy to staging environment

## ✅ Success Criteria

### Visual Quality
- [ ] Matches DeepWiki design aesthetic
- [ ] Consistent visual hierarchy throughout
- [ ] Smooth animations and transitions
- [ ] Professional, polished appearance

### Functionality
- [ ] All core features working as specified
- [ ] Responsive design across all devices
- [ ] Fast, optimized performance
- [ ] Comprehensive error handling

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] High contrast mode support

### Performance
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Bundle size < 500kb
- [ ] Lighthouse score 90+

This comprehensive specification provides everything needed to implement a DeepWiki-inspired frontend for SmartWiki that meets all functional and aesthetic requirements.
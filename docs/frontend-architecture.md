# SmartWiki Frontend Architecture

## 🏗️ Component Architecture Overview

Based on the DeepWiki/VSCode-inspired design and SmartWiki requirements, this document defines a comprehensive React component architecture for the SmartWiki application.

## 📱 Application Layout Structure

### 1. Root Application Component
```typescript
// App.tsx
interface AppProps {
  children?: React.ReactNode;
}

const App: React.FC<AppProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <ErrorBoundary>
            <Workbench />
          </ErrorBoundary>
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
```

### 2. Workbench Layout (Main Container)
```typescript
// components/layout/Workbench.tsx
interface WorkbenchProps {
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

const Workbench: React.FC<WorkbenchProps> = ({ className, theme }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  
  return (
    <div className={`workbench ${className}`}>
      <TitleBar />
      <div className="workbench-main">
        <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <EditorArea />
        <Panel collapsed={panelCollapsed} onToggle={setPanelCollapsed} />
      </div>
      <StatusBar />
    </div>
  );
};
```

## 🎨 Layout Components

### 3. Title Bar Component
```typescript
// components/layout/TitleBar.tsx
interface TitleBarProps {
  title?: string;
  logo?: string;
  showMenuButton?: boolean;
  actions?: React.ReactNode;
}

const TitleBar: React.FC<TitleBarProps> = ({ 
  title = "SmartWiki", 
  logo, 
  showMenuButton = true, 
  actions 
}) => {
  return (
    <header className="title-bar">
      <div className="title-bar-left">
        {showMenuButton && <MenuButton />}
        {logo && <Logo src={logo} alt={title} />}
        <span className="title">{title}</span>
      </div>
      <div className="title-bar-center">
        <SearchBar />
      </div>
      <div className="title-bar-right">
        <NotificationCenter />
        <UserMenu />
        {actions}
      </div>
    </header>
  );
};
```

### 4. Sidebar Component
```typescript
// components/layout/Sidebar.tsx
interface SidebarProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  onToggle, 
  defaultWidth = 240,
  minWidth = 180,
  maxWidth = 400 
}) => {
  const [activePanel, setActivePanel] = useState<string>('files');
  
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <SidebarTabs 
        activeTab={activePanel} 
        onTabChange={setActivePanel}
        collapsed={collapsed}
      />
      <SidebarContent activePanel={activePanel} />
      <ResizeHandle 
        direction="horizontal" 
        onResize={onToggle}
        minWidth={minWidth}
        maxWidth={maxWidth}
      />
    </aside>
  );
};
```

### 5. Editor Area Component
```typescript
// components/layout/EditorArea.tsx
interface EditorAreaProps {
  tabs?: TabData[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
}

const EditorArea: React.FC<EditorAreaProps> = ({ 
  tabs = [], 
  activeTab, 
  onTabChange, 
  onTabClose 
}) => {
  return (
    <main className="editor-area">
      <TabBar 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onTabClose={onTabClose}
      />
      <EditorContent>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<DocumentView />} />
            <Route path="/compliance" element={<ComplianceView />} />
            <Route path="/agents" element={<AgentView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </Router>
      </EditorContent>
    </main>
  );
};
```

### 6. Panel Component (Bottom Panel)
```typescript
// components/layout/Panel.tsx
interface PanelProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

const Panel: React.FC<PanelProps> = ({ 
  collapsed, 
  onToggle, 
  defaultHeight = 200,
  minHeight = 100,
  maxHeight = 400 
}) => {
  const [activePanel, setActivePanel] = useState<string>('console');
  
  return (
    <section className={`panel ${collapsed ? 'collapsed' : ''}`}>
      <PanelTabs 
        activeTab={activePanel} 
        onTabChange={setActivePanel}
      />
      <PanelContent activePanel={activePanel} />
      <ResizeHandle 
        direction="vertical" 
        onResize={onToggle}
        minHeight={minHeight}
        maxHeight={maxHeight}
      />
    </section>
  );
};
```

## 🧩 Core UI Components

### 7. Button Component System
```typescript
// components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className,
  disabled,
  ...props 
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
};
```

### 8. Input Component System
```typescript
// components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
}

const Input: React.FC<InputProps> = ({ 
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  variant = 'default',
  className,
  ...props 
}) => {
  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className={`input-wrapper input-${variant}`}>
        {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
        <input 
          className="input"
          {...props}
        />
        {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
      </div>
      {error && <span className="input-error">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}
    </div>
  );
};
```

### 9. Modal Component
```typescript
// components/ui/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children
}) => {
  useEffect(() => {
    if (closeOnEscape) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div 
        className="modal-overlay"
        onClick={closeOnOverlayClick ? onClose : undefined}
      >
        <div 
          className={`modal modal-${size}`}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="modal-header">
              {title && <h2 className="modal-title">{title}</h2>}
              {showCloseButton && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  icon={<CloseIcon />}
                />
              )}
            </div>
          )}
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
};
```

### 10. Dropdown Component
```typescript
// components/ui/Dropdown.tsx
interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  disabled?: boolean;
  onSelect?: (item: DropdownItem) => void;
}

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  placement = 'bottom-start',
  disabled = false,
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div 
        className="dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {trigger}
      </div>
      {isOpen && (
        <div className={`dropdown-menu dropdown-${placement}`}>
          {items.map((item) => (
            <div key={item.id}>
              {item.separator && <div className="dropdown-separator" />}
              <button
                className={`dropdown-item ${item.danger ? 'danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  onSelect?.(item);
                  setIsOpen(false);
                }}
              >
                {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
                <span className="dropdown-item-label">{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 📄 Feature-Specific Components

### 11. File Upload Component
```typescript
// components/features/FileUpload.tsx
interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onUpload?: (files: File[]) => Promise<void>;
  onProgress?: (progress: number) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  accept = "*/*",
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  onUpload,
  onProgress,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const validFiles = Array.from(selectedFiles)
      .filter(file => file.size <= maxSize)
      .slice(0, maxFiles);
    
    setFiles(validFiles);
  }, [maxSize, maxFiles]);

  const handleUpload = useCallback(async () => {
    if (!onUpload || files.length === 0) return;
    
    setUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onUpload, files]);

  return (
    <div className="file-upload">
      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFileSelect(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
          id="file-input"
        />
        <label htmlFor="file-input" className="upload-label">
          <UploadIcon />
          <span>Drop files here or click to select</span>
          <span className="upload-hint">
            Max {formatBytes(maxSize)} per file, up to {maxFiles} files
          </span>
        </label>
      </div>
      
      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <FileItem 
              key={index}
              file={file}
              onRemove={() => setFiles(files.filter((_, i) => i !== index))}
            />
          ))}
          <Button 
            onClick={handleUpload}
            loading={uploading}
            disabled={disabled}
          >
            Upload {files.length} file{files.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}
      
      {uploading && (
        <ProgressBar value={progress} max={100} />
      )}
    </div>
  );
};
```

### 12. Document Viewer Component
```typescript
// components/features/DocumentViewer.tsx
interface DocumentViewerProps {
  document: Document;
  viewMode?: 'preview' | 'edit' | 'split';
  showThumbnail?: boolean;
  showOriginal?: boolean;
  onEdit?: (content: string) => void;
  onDownload?: () => void;
}

interface Document {
  id: string;
  title: string;
  content: string;
  originalFile?: string;
  thumbnail?: string;
  format: 'markdown' | 'pdf' | 'docx' | 'txt';
  metadata: DocumentMetadata;
}

interface DocumentMetadata {
  size: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  tenant: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  viewMode = 'preview',
  showThumbnail = true,
  showOriginal = true,
  onEdit,
  onDownload
}) => {
  const [currentMode, setCurrentMode] = useState(viewMode);
  const [content, setContent] = useState(document.content);

  return (
    <div className="document-viewer">
      <div className="document-header">
        <div className="document-info">
          {showThumbnail && document.thumbnail && (
            <img 
              src={document.thumbnail} 
              alt={document.title}
              className="document-thumbnail"
            />
          )}
          <div className="document-details">
            <h1 className="document-title">{document.title}</h1>
            <DocumentMetadataDisplay metadata={document.metadata} />
          </div>
        </div>
        
        <div className="document-actions">
          <ViewModeToggle 
            currentMode={currentMode}
            onModeChange={setCurrentMode}
          />
          {showOriginal && document.originalFile && (
            <Button 
              variant="outline"
              icon={<DownloadIcon />}
              onClick={onDownload}
            >
              Original
            </Button>
          )}
        </div>
      </div>
      
      <div className="document-content">
        {currentMode === 'preview' && (
          <MarkdownRenderer content={content} />
        )}
        {currentMode === 'edit' && (
          <MarkdownEditor 
            content={content}
            onChange={setContent}
            onSave={() => onEdit?.(content)}
          />
        )}
        {currentMode === 'split' && (
          <SplitView>
            <MarkdownEditor 
              content={content}
              onChange={setContent}
              onSave={() => onEdit?.(content)}
            />
            <MarkdownRenderer content={content} />
          </SplitView>
        )}
      </div>
    </div>
  );
};
```

### 13. Search Interface Component
```typescript
// components/features/SearchInterface.tsx
interface SearchInterfaceProps {
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  filters?: SearchFilter[];
  onSearch?: (query: string, filters: Record<string, any>) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  loading?: boolean;
  results?: SearchResult[];
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'document' | 'tag';
  icon?: React.ReactNode;
}

interface SearchFilter {
  id: string;
  label: string;
  type: 'select' | 'date' | 'range' | 'tag';
  options?: { value: string; label: string; }[];
  defaultValue?: any;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
  metadata: {
    type: string;
    date: Date;
    tags: string[];
  };
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  placeholder = "Search documents...",
  suggestions = [],
  filters = [],
  onSearch,
  onSuggestionSelect,
  loading = false,
  results = []
}) => {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = useCallback(() => {
    onSearch?.(query, activeFilters);
  }, [query, activeFilters, onSearch]);

  return (
    <div className="search-interface">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="search-input"
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
                setShowSuggestions(false);
              }
            }}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              icon={<ClearIcon />}
              onClick={() => {
                setQuery('');
                setShowSuggestions(false);
              }}
            />
          )}
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className="suggestion-item"
                onClick={() => {
                  onSuggestionSelect?.(suggestion);
                  setQuery(suggestion.text);
                  setShowSuggestions(false);
                }}
              >
                {suggestion.icon && (
                  <span className="suggestion-icon">{suggestion.icon}</span>
                )}
                <span className="suggestion-text">{suggestion.text}</span>
                <span className="suggestion-type">{suggestion.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {filters.length > 0 && (
        <div className="search-filters">
          {filters.map((filter) => (
            <SearchFilterComponent
              key={filter.id}
              filter={filter}
              value={activeFilters[filter.id]}
              onChange={(value) => 
                setActiveFilters(prev => ({ ...prev, [filter.id]: value }))
              }
            />
          ))}
        </div>
      )}
      
      <div className="search-results">
        {loading && <SearchSkeleton />}
        {!loading && results.length === 0 && query && (
          <div className="no-results">
            <SearchEmptyIcon />
            <p>No results found for "{query}"</p>
            <p>Try adjusting your search terms or filters</p>
          </div>
        )}
        {!loading && results.map((result) => (
          <SearchResultItem key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
};
```

### 14. Agent Panel Component
```typescript
// components/features/AgentPanel.tsx
interface AgentPanelProps {
  agents: Agent[];
  activeAgent?: string;
  onAgentSelect?: (agentId: string) => void;
  onAgentCreate?: (config: AgentConfig) => void;
  onAgentDelete?: (agentId: string) => void;
}

interface Agent {
  id: string;
  name: string;
  type: 'compliance' | 'research' | 'analysis' | 'custom';
  status: 'active' | 'inactive' | 'processing';
  description: string;
  capabilities: string[];
  config: AgentConfig;
  metrics: AgentMetrics;
}

interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
  contextDocuments: string[];
}

interface AgentMetrics {
  totalQueries: number;
  avgResponseTime: number;
  successRate: number;
  lastUsed: Date;
}

const AgentPanel: React.FC<AgentPanelProps> = ({
  agents,
  activeAgent,
  onAgentSelect,
  onAgentCreate,
  onAgentDelete
}) => {
  const [showCreateAgent, setShowCreateAgent] = useState(false);

  return (
    <div className="agent-panel">
      <div className="agent-header">
        <h2>AI Agents</h2>
        <Button
          variant="primary"
          size="sm"
          icon={<PlusIcon />}
          onClick={() => setShowCreateAgent(true)}
        >
          Create Agent
        </Button>
      </div>
      
      <div className="agent-list">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-card ${activeAgent === agent.id ? 'active' : ''}`}
            onClick={() => onAgentSelect?.(agent.id)}
          >
            <div className="agent-card-header">
              <div className="agent-info">
                <AgentIcon type={agent.type} />
                <div>
                  <h3 className="agent-name">{agent.name}</h3>
                  <span className="agent-type">{agent.type}</span>
                </div>
              </div>
              <div className="agent-status">
                <StatusIndicator status={agent.status} />
                <Dropdown
                  trigger={<MoreIcon />}
                  items={[
                    { id: 'edit', label: 'Edit', icon: <EditIcon /> },
                    { id: 'duplicate', label: 'Duplicate', icon: <CopyIcon /> },
                    { id: 'delete', label: 'Delete', icon: <DeleteIcon />, danger: true }
                  ]}
                  onSelect={(item) => {
                    if (item.id === 'delete') {
                      onAgentDelete?.(agent.id);
                    }
                  }}
                />
              </div>
            </div>
            
            <p className="agent-description">{agent.description}</p>
            
            <div className="agent-capabilities">
              {agent.capabilities.map((capability) => (
                <span key={capability} className="capability-tag">
                  {capability}
                </span>
              ))}
            </div>
            
            <div className="agent-metrics">
              <MetricItem label="Queries" value={agent.metrics.totalQueries} />
              <MetricItem 
                label="Avg Response" 
                value={`${agent.metrics.avgResponseTime}ms`} 
              />
              <MetricItem 
                label="Success Rate" 
                value={`${agent.metrics.successRate}%`} 
              />
            </div>
          </div>
        ))}
      </div>
      
      {showCreateAgent && (
        <Modal
          isOpen={showCreateAgent}
          onClose={() => setShowCreateAgent(false)}
          title="Create New Agent"
          size="lg"
        >
          <AgentConfigForm
            onSubmit={(config) => {
              onAgentCreate?.(config);
              setShowCreateAgent(false);
            }}
            onCancel={() => setShowCreateAgent(false)}
          />
        </Modal>
      )}
    </div>
  );
};
```

## 🔄 State Management Architecture

### 15. Global State with Zustand
```typescript
// stores/useAppStore.ts
interface AppState {
  // UI State
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  panelCollapsed: boolean;
  activeTab: string | null;
  
  // User State
  user: User | null;
  tenant: Tenant | null;
  
  // Application State
  documents: Document[];
  agents: Agent[];
  searchResults: SearchResult[];
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleSidebar: () => void;
  togglePanel: () => void;
  setActiveTab: (tabId: string) => void;
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
}

const useAppStore = create<AppState>((set) => ({
  // Initial state
  theme: 'auto',
  sidebarCollapsed: false,
  panelCollapsed: false,
  activeTab: null,
  user: null,
  tenant: null,
  documents: [],
  agents: [],
  searchResults: [],
  
  // Actions
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  togglePanel: () => set((state) => ({ panelCollapsed: !state.panelCollapsed })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),
  addDocument: (document) => set((state) => ({ 
    documents: [...state.documents, document] 
  })),
  updateDocument: (id, updates) => set((state) => ({
    documents: state.documents.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    )
  })),
  removeDocument: (id) => set((state) => ({
    documents: state.documents.filter(doc => doc.id !== id)
  })),
  addAgent: (agent) => set((state) => ({ 
    agents: [...state.agents, agent] 
  })),
  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map(agent => 
      agent.id === id ? { ...agent, ...updates } : agent
    )
  })),
  removeAgent: (id) => set((state) => ({
    agents: state.agents.filter(agent => agent.id !== id)
  })),
  setSearchResults: (searchResults) => set({ searchResults })
}));
```

### 16. Authentication Store
```typescript
// stores/useAuthStore.ts
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      set({
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error.message, 
        loading: false,
        isAuthenticated: false 
      });
    }
  },
  
  logout: async () => {
    set({ loading: true });
    try {
      await authApi.logout();
    } finally {
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        loading: false,
        error: null
      });
    }
  },
  
  refreshAuth: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return;
    
    try {
      const response = await authApi.refresh(refreshToken);
      set({
        token: response.token,
        user: response.user
      });
    } catch (error) {
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        error: error.message
      });
    }
  },
  
  updateProfile: async (updates) => {
    set({ loading: true });
    try {
      const updatedUser = await authApi.updateProfile(updates);
      set({ user: updatedUser, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
```

## 🛣️ Routing Structure

### 17. Application Router
```typescript
// router/AppRouter.tsx
const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<DocumentsPage />}>
            <Route index element={<DocumentList />} />
            <Route path=":id" element={<DocumentViewer />} />
            <Route path="upload" element={<FileUpload />} />
          </Route>
          <Route path="/agents" element={<AgentsPage />}>
            <Route index element={<AgentList />} />
            <Route path=":id" element={<AgentDetail />} />
            <Route path="create" element={<AgentCreate />} />
          </Route>
          <Route path="/compliance" element={<CompliancePage />}>
            <Route index element={<ComplianceOverview />} />
            <Route path="reports" element={<ComplianceReports />} />
            <Route path="reports/:id" element={<ComplianceReport />} />
            <Route path="standards" element={<ComplianceStandards />} />
          </Route>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<SettingsPage />}>
            <Route index element={<GeneralSettings />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="integrations" element={<IntegrationSettings />} />
          </Route>
        </Route>
        
        {/* Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/tenants" element={<TenantManagement />} />
          <Route path="/admin/system" element={<SystemSettings />} />
        </Route>
        
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
```

### 18. Protected Route Component
```typescript
// router/ProtectedRoute.tsx
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
```

## 📱 Responsive Design Strategy

### 19. Responsive Layout Hook
```typescript
// hooks/useResponsive.ts
interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const breakpoints: Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < breakpoints.md;
  const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isDesktop = windowSize.width >= breakpoints.lg;

  const getCurrentBreakpoint = (): keyof Breakpoints => {
    const { width } = windowSize;
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  };

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint: getCurrentBreakpoint(),
    breakpoints
  };
};
```

### 20. Mobile-First Responsive Workbench
```typescript
// components/layout/ResponsiveWorkbench.tsx
const ResponsiveWorkbench: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'sidebar' | 'main' | 'panel'>('main');

  if (isMobile) {
    return (
      <div className="workbench-mobile">
        <TitleBar 
          showMenuButton={true}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        
        <div className="mobile-content">
          {mobilePanel === 'sidebar' && (
            <Sidebar 
              collapsed={false}
              onToggle={() => setMobilePanel('main')}
            />
          )}
          {mobilePanel === 'main' && <EditorArea />}
          {mobilePanel === 'panel' && (
            <Panel 
              collapsed={false}
              onToggle={() => setMobilePanel('main')}
            />
          )}
        </div>
        
        <MobileNavigation 
          activePanel={mobilePanel}
          onPanelChange={setMobilePanel}
        />
        
        <MobileMenu 
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="workbench-tablet">
        <TitleBar />
        <div className="tablet-layout">
          <AdaptiveSidebar />
          <EditorArea />
        </div>
        <StatusBar />
      </div>
    );
  }

  return <Workbench />;
};
```

## 🎨 Theme System

### 21. Theme Provider
```typescript
// providers/ThemeProvider.tsx
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'auto';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = theme === 'auto' ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'auto';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

### 22. CSS Variables Theme System
```css
/* styles/themes.css */
:root {
  /* Light theme colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-bg-accent: #3b82f6;
  
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #94a3b8;
  --color-text-accent: #ffffff;
  
  --color-border-primary: #e2e8f0;
  --color-border-secondary: #cbd5e1;
  --color-border-accent: #3b82f6;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
}

.dark {
  /* Dark theme colors */
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  --color-bg-accent: #3b82f6;
  
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-tertiary: #94a3b8;
  --color-text-accent: #ffffff;
  
  --color-border-primary: #334155;
  --color-border-secondary: #475569;
  --color-border-accent: #3b82f6;
}
```

## ⚡ Performance Optimizations

### 23. Lazy Loading Components
```typescript
// components/lazy/LazyComponents.ts
import { lazy } from 'react';

// Page components
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
export const AgentsPage = lazy(() => import('../pages/AgentsPage'));
export const CompliancePage = lazy(() => import('../pages/CompliancePage'));
export const SettingsPage = lazy(() => import('../pages/SettingsPage'));

// Feature components
export const DocumentViewer = lazy(() => import('../features/DocumentViewer'));
export const AgentPanel = lazy(() => import('../features/AgentPanel'));
export const FileUpload = lazy(() => import('../features/FileUpload'));

// Heavy components
export const MarkdownEditor = lazy(() => import('../ui/MarkdownEditor'));
export const DataTable = lazy(() => import('../ui/DataTable'));
export const Chart = lazy(() => import('../ui/Chart'));
```

### 24. Memoization Patterns
```typescript
// hooks/useMemoizedCallback.ts
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

// components/optimized/MemoizedComponent.tsx
interface MemoizedComponentProps {
  data: any[];
  onSelect: (item: any) => void;
  filter: string;
}

const MemoizedComponent = React.memo<MemoizedComponentProps>(({ 
  data, 
  onSelect, 
  filter 
}) => {
  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.title.toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, filter]);

  const handleSelect = useMemoizedCallback((item: any) => {
    onSelect(item);
  }, [onSelect]);

  return (
    <div>
      {filteredData.map(item => (
        <div key={item.id} onClick={() => handleSelect(item)}>
          {item.title}
        </div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.filter === nextProps.filter &&
    prevProps.onSelect === nextProps.onSelect
  );
});
```

### 25. Virtual Scrolling for Large Lists
```typescript
// components/ui/VirtualList.tsx
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div 
      className="virtual-list"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🧪 Testing Architecture

### 26. Component Testing Setup
```typescript
// tests/utils/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../providers/ThemeProvider';

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### 27. Component Test Examples
```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '../../tests/utils/test-utils';
import { Button } from '../ui/Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });
});
```

## 📝 Component Documentation Template

### 28. Component Props Interface Documentation
```typescript
/**
 * Primary button component for user actions
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" onClick={handleClick}>
 *   Save Changes
 * </Button>
 * ```
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  
  /** Size of the button */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  
  /** Icon to display (left or right of text) */
  icon?: React.ReactNode;
  
  /** Position of the icon relative to text */
  iconPosition?: 'left' | 'right';
  
  /** Additional CSS classes */
  className?: string;
  
  /** Button content */
  children: React.ReactNode;
}
```

## 🔧 Build and Development Tools

### 29. Vite Configuration for Netlify Deployment
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          state: ['zustand'],
          utils: ['date-fns', 'lodash-es']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: true
  }
});
```

### 30. Netlify Configuration
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production]
  command = "npm run build"
  
[context.deploy-preview]
  command = "npm run build"

[context.branch-deploy]
  command = "npm run build"

# Environment variables for different contexts
[context.production.environment]
  REACT_APP_API_URL = "https://api.smartwiki.com"
  REACT_APP_AWS_REGION = "us-east-1"
  
[context.deploy-preview.environment]
  REACT_APP_API_URL = "https://api-staging.smartwiki.com"
  REACT_APP_AWS_REGION = "us-east-1"
```

### 31. TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@stores/*": ["./src/stores/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 📊 Performance Metrics and Monitoring

### 32. Performance Hook
```typescript
// hooks/usePerformance.ts
interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage: number;
  bundleSize: number;
}

export const usePerformance = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>();

  useEffect(() => {
    const startTime = performance.now();
    
    // Measure render time
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const renderEntry = entries.find(entry => 
        entry.name.includes(componentName)
      );
      
      if (renderEntry) {
        setMetrics(prev => ({
          ...prev,
          renderTime: renderEntry.duration
        }));
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => {
      observer.disconnect();
      const endTime = performance.now();
      console.debug(`${componentName} render time: ${endTime - startTime}ms`);
    };
  }, [componentName]);

  return metrics;
};
```

---

## 🚀 Implementation Guidelines

### Development Priorities:
1. **Start with Layout**: Implement Workbench, TitleBar, Sidebar, EditorArea
2. **Build UI Foundation**: Button, Input, Modal, Dropdown components
3. **Add Feature Components**: FileUpload, DocumentViewer, SearchInterface
4. **Implement State Management**: Zustand stores for app and auth state
5. **Setup Routing**: Protected routes and navigation
6. **Add Responsive Design**: Mobile-first approach with breakpoint system
7. **Performance Optimization**: Lazy loading, memoization, virtual scrolling
8. **Testing Setup**: Component tests and integration tests
9. **Netlify Deployment**: Configure build and deployment pipeline

### Netlify Deployment Strategy:
- **Static Build**: Vite builds optimized static assets to `dist/` directory
- **SPA Routing**: Netlify redirects handle client-side routing
- **Environment Management**: Production, staging, and preview environments
- **API Integration**: Frontend connects to AWS Lambda backend via API Gateway
- **CDN**: Global edge locations for optimal performance
- **Continuous Deployment**: Automatic deployments from Git repositories

### Code Quality Standards:
- **TypeScript**: Strict type checking for all components
- **ESLint/Prettier**: Consistent code formatting
- **Testing**: 90%+ coverage for UI components
- **Documentation**: JSDoc comments for all public interfaces
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Core Web Vitals optimization

### Architecture Benefits:
- **Modular Design**: Easy to extend and maintain
- **Type Safety**: Comprehensive TypeScript interfaces
- **Performance**: Optimized rendering and bundle splitting
- **Responsive**: Mobile-first design approach
- **Testable**: Component isolation and testing utilities
- **Scalable**: Clean separation of concerns

This architecture provides a solid foundation for building the SmartWiki application with a modern, performant, and maintainable React frontend that matches the DeepWiki design inspiration while supporting all the required features.
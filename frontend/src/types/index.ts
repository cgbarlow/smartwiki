// Core application types for SmartWiki

export interface Document {
  id: string;
  title: string;
  description?: string;
  type: 'pdf' | 'markdown' | 'docx' | 'txt' | 'html';
  uploadDate: Date;
  size: number;
  thumbnail?: string;
  content?: string;
  stars?: number;
  tags?: string[];
  author?: string;
  status: 'processing' | 'ready' | 'failed';
}

export interface SearchFilters {
  type?: Document['type'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  author?: string;
  minSize?: number;
  maxSize?: number;
}

export interface SearchResult {
  document: Document;
  relevanceScore: number;
  highlights: string[];
  snippet: string;
}

export interface Agent {
  id: string;
  name: string;
  type: 'researcher' | 'coder' | 'analyst' | 'optimizer' | 'coordinator';
  status: 'idle' | 'active' | 'busy' | 'error';
  capabilities: string[];
  lastActivity?: Date;
  metrics?: {
    tasksCompleted: number;
    averageExecutionTime: number;
    successRate: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  dependencies?: string[];
  results?: any;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'viewer';
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
  };
  tenant?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

export interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ComplianceCheck {
  id: string;
  documentId: string;
  type: 'privacy' | 'security' | 'regulatory' | 'content';
  status: 'pending' | 'passed' | 'failed' | 'warning';
  score?: number;
  findings: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    location?: string;
  }>;
  timestamp: Date;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// Layout types
export interface WorkbenchLayout {
  sidebarCollapsed: boolean;
  panelVisible: boolean;
  panelSize: number;
  activePanel?: 'agents' | 'compliance' | 'settings';
}

export interface ResponsiveBreakpoint {
  name: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  value: number;
}

// API types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
  status: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Store types
export interface AppState {
  user: User | null;
  theme: 'light' | 'dark' | 'system';
  layout: WorkbenchLayout;
  notifications: Notification[];
  uploads: UploadProgress[];
}

export interface DocumentStore {
  documents: Document[];
  searchResults: SearchResult[];
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
}

export interface AgentStore {
  agents: Agent[];
  tasks: Task[];
  activeTask: Task | null;
  swarmStatus: 'inactive' | 'initializing' | 'active' | 'error';
}

// Utility types
export type Theme = 'light' | 'dark' | 'system';
export type ScreenSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type LayoutMode = 'desktop' | 'tablet' | 'mobile';
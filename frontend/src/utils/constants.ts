// Application constants

export const APP_NAME = 'SmartWiki'
export const APP_DESCRIPTION = 'Intelligent document management and RAG system'

// File upload constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ACCEPTED_FILE_TYPES = ['.pdf', '.docx', '.txt', '.md', '.html']
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html'
]

// Layout constants
export const SIDEBAR_WIDTH = {
  collapsed: 60,
  expanded: 280
}

export const PANEL_HEIGHT = {
  collapsed: 40,
  expanded: 300
}

// Responsive breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

// Theme constants
export const THEMES = ['light', 'dark', 'system'] as const

// Agent types
export const AGENT_TYPES = [
  'researcher',
  'coder', 
  'analyst',
  'optimizer',
  'coordinator'
] as const

// Task priorities
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

// Task statuses
export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'failed'] as const

// Document statuses
export const DOCUMENT_STATUSES = ['processing', 'ready', 'failed'] as const

// Compliance check types
export const COMPLIANCE_TYPES = ['privacy', 'security', 'regulatory', 'content'] as const

// API endpoints
export const API_ENDPOINTS = {
  documents: '/api/documents',
  upload: '/api/upload',
  search: '/api/search',
  agents: '/api/agents',
  tasks: '/api/tasks',
  compliance: '/api/compliance',
  auth: '/api/auth'
} as const

// Local storage keys
export const STORAGE_KEYS = {
  theme: 'smartwiki-theme',
  layout: 'smartwiki-layout',
  user: 'smartwiki-user',
  preferences: 'smartwiki-preferences'
} as const

// Animation durations (in ms)
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500
} as const

// Keyboard shortcuts
export const SHORTCUTS = {
  search: 'cmd+k',
  toggleSidebar: 'cmd+b',
  togglePanel: 'cmd+j',
  toggleTheme: 'cmd+shift+l',
  newDocument: 'cmd+n',
  upload: 'cmd+u'
} as const

// Error messages
export const ERROR_MESSAGES = {
  fileTooBig: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`,
  invalidFileType: `Please select a valid file type: ${ACCEPTED_FILE_TYPES.join(', ')}`,
  uploadFailed: 'Failed to upload file. Please try again.',
  networkError: 'Network error. Please check your connection.',
  unauthorized: 'You are not authorized to perform this action.',
  serverError: 'Server error. Please try again later.',
  documentNotFound: 'Document not found.',
  agentNotAvailable: 'Agent is not available. Please try again later.'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  documentUploaded: 'Document uploaded successfully',
  documentDeleted: 'Document deleted successfully',
  settingsSaved: 'Settings saved successfully',
  taskCompleted: 'Task completed successfully'
} as const

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
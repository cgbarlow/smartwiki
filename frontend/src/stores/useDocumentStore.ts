import { create } from 'zustand'
import type { Document, DocumentStore, SearchFilters, SearchResult } from '@/types'

interface DocumentStoreActions {
  // Document management
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  updateDocument: (id: string, update: Partial<Document>) => void
  removeDocument: (id: string) => void
  
  // Search functionality  
  setSearchResults: (results: SearchResult[]) => void
  setFilters: (filters: SearchFilters) => void
  updateFilter: (key: keyof SearchFilters, value: any) => void
  clearFilters: () => void
  
  // Loading states
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed getters
  getDocumentById: (id: string) => Document | undefined
  getDocumentsByType: (type: Document['type']) => Document[]
  getDocumentsByTag: (tag: string) => Document[]
  getFilteredDocuments: () => Document[]
}

const defaultFilters: SearchFilters = {
  type: undefined,
  dateRange: undefined,
  tags: undefined,
  author: undefined,
  minSize: undefined,
  maxSize: undefined
}

export const useDocumentStore = create<DocumentStore & DocumentStoreActions>((set, get) => ({
  // Initial state
  documents: [],
  searchResults: [],
  filters: defaultFilters,
  loading: false,
  error: null,

  // Actions
  setDocuments: (documents) => set({ documents }),
  
  addDocument: (document) => set((state) => ({
    documents: [...state.documents, document]
  })),
  
  updateDocument: (id, update) => set((state) => ({
    documents: state.documents.map(doc =>
      doc.id === id ? { ...doc, ...update } : doc
    )
  })),
  
  removeDocument: (id) => set((state) => ({
    documents: state.documents.filter(doc => doc.id !== id)
  })),
  
  setSearchResults: (searchResults) => set({ searchResults }),
  
  setFilters: (filters) => set({ filters }),
  
  updateFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),
  
  clearFilters: () => set({ filters: defaultFilters }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Computed getters
  getDocumentById: (id) => {
    const { documents } = get()
    return documents.find(doc => doc.id === id)
  },

  getDocumentsByType: (type) => {
    const { documents } = get()
    return documents.filter(doc => doc.type === type)
  },

  getDocumentsByTag: (tag) => {
    const { documents } = get()
    return documents.filter(doc => doc.tags?.includes(tag))
  },

  getFilteredDocuments: () => {
    const { documents, filters } = get()
    
    return documents.filter(doc => {
      // Filter by type
      if (filters.type && filters.type.length > 0 && !filters.type.includes(doc.type)) {
        return false
      }
      
      // Filter by date range
      if (filters.dateRange) {
        const docDate = new Date(doc.uploadDate)
        if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
          return false
        }
      }
      
      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        if (!doc.tags || !filters.tags.some(tag => doc.tags!.includes(tag))) {
          return false
        }
      }
      
      // Filter by author
      if (filters.author && doc.author !== filters.author) {
        return false
      }
      
      // Filter by size
      if (filters.minSize && doc.size < filters.minSize) {
        return false
      }
      
      if (filters.maxSize && doc.size > filters.maxSize) {
        return false
      }
      
      return true
    })
  }
}))
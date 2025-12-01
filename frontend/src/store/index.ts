import { create } from 'zustand'
import type {
  Project,
  Table,
  Folder,
  FilePreview,
  AnalysisState,
  ChatMessage,
} from '@/types'

// ═══════════════════════════════════════════════════════════════════════════
// App Store - Global state management
// ═══════════════════════════════════════════════════════════════════════════

interface ChatAttachment {
  type: 'image' | 'file'
  data: string // base64 for images, filename for files
  name: string
  variableName?: string // for boxplot attachments
}

interface AppState {
  // Projects & Files
  projects: Project[]
  activeProjectId: string | null
  activeTableId: string | null
  activeFolderId: string | null

  // UI State
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  aiSidebarWidth: number // resizable width

  // Chat
  chatMessages: ChatMessage[]
  chatLoading: boolean
  pendingAttachment: ChatAttachment | null // for boxplot -> chat

  // Project Actions
  createProject: (name: string) => string
  deleteProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  setActiveProject: (id: string | null) => void

  // Folder Actions
  createFolder: (projectId: string, name: string, parentFolderId?: string | null) => string
  deleteFolder: (projectId: string, folderId: string) => void
  renameFolder: (projectId: string, folderId: string, name: string) => void

  // Table Actions
  createTable: (projectId: string, name: string, file: File, folderId?: string | null) => string
  deleteTable: (projectId: string, tableId: string, folderId?: string | null) => void
  renameTable: (projectId: string, tableId: string, name: string, folderId?: string | null) => void
  setActiveTable: (id: string | null) => void
  updateTablePreview: (projectId: string, tableId: string, preview: FilePreview, folderId?: string | null) => void
  updateTableAnalysis: (projectId: string, tableId: string, analysis: AnalysisState, folderId?: string | null) => void

  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setAiSidebarWidth: (width: number) => void

  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setChatLoading: (loading: boolean) => void
  clearChat: () => void
  
  // Attachment from boxplot
  setPendingAttachment: (attachment: ChatAttachment | null) => void
}

// Helper
const generateId = () => Math.random().toString(36).slice(2, 11)

// Helper: find and update table in nested folders
const updateTableInProject = (
  project: Project,
  tableId: string,
  folderId: string | null | undefined,
  updater: (table: Table) => Table
): Project => {
  if (!folderId) {
    // Table at root level
    return {
      ...project,
      tables: project.tables.map((t) => (t.id === tableId ? updater(t) : t)),
    }
  }
  
  // Table in folder - recursively search
  const updateFolders = (folders: Folder[]): Folder[] =>
    folders.map((folder) => {
      if (folder.id === folderId) {
        return {
          ...folder,
          tables: folder.tables.map((t) => (t.id === tableId ? updater(t) : t)),
        }
      }
      return { ...folder, folders: updateFolders(folder.folders) }
    })
  
  return { ...project, folders: updateFolders(project.folders) }
}

// Helper: delete table from project
const deleteTableFromProject = (
  project: Project,
  tableId: string,
  folderId: string | null | undefined
): Project => {
  if (!folderId) {
    return { ...project, tables: project.tables.filter((t) => t.id !== tableId) }
  }
  
  const updateFolders = (folders: Folder[]): Folder[] =>
    folders.map((folder) => {
      if (folder.id === folderId) {
        return { ...folder, tables: folder.tables.filter((t) => t.id !== tableId) }
      }
      return { ...folder, folders: updateFolders(folder.folders) }
    })
  
  return { ...project, folders: updateFolders(project.folders) }
}

// Helper: add table to project
const addTableToProject = (
  project: Project,
  table: Table,
  folderId: string | null | undefined
): Project => {
  if (!folderId) {
    return { ...project, tables: [...project.tables, table] }
  }
  
  const updateFolders = (folders: Folder[]): Folder[] =>
    folders.map((folder) => {
      if (folder.id === folderId) {
        return { ...folder, tables: [...folder.tables, table] }
      }
      return { ...folder, folders: updateFolders(folder.folders) }
    })
  
  return { ...project, folders: updateFolders(project.folders) }
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  projects: [],
  activeProjectId: null,
  activeTableId: null,
  activeFolderId: null,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  aiSidebarWidth: 340,
  chatMessages: [],
  chatLoading: false,
  pendingAttachment: null,

  // Project actions
  createProject: (name) => {
    const id = generateId()
    const project: Project = {
      id,
      name,
      createdAt: new Date(),
      tables: [],
      folders: [],
    }
    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: id,
      activeTableId: null,
      activeFolderId: null,
    }))
    return id
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
      activeTableId: null,
      activeFolderId: null,
    }))
  },

  renameProject: (id, name) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, name } : p)),
    }))
  },

  setActiveProject: (id) => {
    set({ activeProjectId: id, activeTableId: null })
  },

  // Folder actions
  createFolder: (projectId, name, parentFolderId = null) => {
    const id = generateId()
    const folder: Folder = {
      id,
      name,
      parentId: parentFolderId,
      tables: [],
      folders: [],
      createdAt: new Date(),
    }
    
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p
        
        if (!parentFolderId) {
          // Add to root
          return { ...p, folders: [...p.folders, folder] }
        }
        
        // Add to parent folder
        const addToFolder = (folders: Folder[]): Folder[] =>
          folders.map((f) => {
            if (f.id === parentFolderId) {
              return { ...f, folders: [...f.folders, folder] }
            }
            return { ...f, folders: addToFolder(f.folders) }
          })
        
        return { ...p, folders: addToFolder(p.folders) }
      }),
    }))
    return id
  },

  deleteFolder: (projectId, folderId) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p
        
        const removeFolder = (folders: Folder[]): Folder[] =>
          folders.filter((f) => f.id !== folderId).map((f) => ({
            ...f,
            folders: removeFolder(f.folders),
          }))
        
        return { ...p, folders: removeFolder(p.folders) }
      }),
      activeFolderId: null,
    }))
  },

  renameFolder: (projectId, folderId, name) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p
        
        const updateFolders = (folders: Folder[]): Folder[] =>
          folders.map((f) => {
            if (f.id === folderId) {
              return { ...f, name }
            }
            return { ...f, folders: updateFolders(f.folders) }
          })
        
        return { ...p, folders: updateFolders(p.folders) }
      }),
    }))
  },

  // Table actions
  createTable: (projectId, name, file, folderId = null) => {
    const id = generateId()
    const table: Table = {
      id,
      name,
      filename: file.name,
      createdAt: new Date(),
      file,
    }
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? addTableToProject(p, table, folderId) : p
      ),
      activeTableId: id,
    }))
    return id
  },

  deleteTable: (projectId, tableId, folderId = null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? deleteTableFromProject(p, tableId, folderId) : p
      ),
      activeTableId: state.activeTableId === tableId ? null : state.activeTableId,
    }))
  },

  renameTable: (projectId, tableId, name, folderId = null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? updateTableInProject(p, tableId, folderId, (t) => ({ ...t, name }))
          : p
      ),
    }))
  },

  setActiveTable: (id) => {
    set({ activeTableId: id })
  },

  updateTablePreview: (projectId, tableId, preview, folderId = null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? updateTableInProject(p, tableId, folderId, (t) => ({ ...t, preview }))
          : p
      ),
    }))
  },

  updateTableAnalysis: (projectId, tableId, analysis, folderId = null) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? updateTableInProject(p, tableId, folderId, (t) => ({ ...t, analysis }))
          : p
      ),
    }))
  },

  // UI actions
  toggleLeftSidebar: () => {
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }))
  },

  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }))
  },

  setAiSidebarWidth: (width) => {
    set({ aiSidebarWidth: Math.max(280, Math.min(600, width)) })
  },

  // Chat actions
  addChatMessage: (message) => {
    const chatMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    }
    set((state) => ({
      chatMessages: [...state.chatMessages, chatMessage],
    }))
  },

  setChatLoading: (loading) => {
    set({ chatLoading: loading })
  },

  clearChat: () => {
    set({ chatMessages: [] })
  },

  setPendingAttachment: (attachment) => {
    set({ pendingAttachment: attachment })
  },
}))

// ═══════════════════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════════════════

export const useActiveProject = () => {
  const projects = useAppStore((s) => s.projects)
  const activeId = useAppStore((s) => s.activeProjectId)
  return projects.find((p) => p.id === activeId) ?? null
}

// Helper to find table in nested structure
const findTableInFolders = (folders: Folder[], tableId: string): Table | null => {
  for (const folder of folders) {
    const found = folder.tables.find((t) => t.id === tableId)
    if (found) return found
    const nested = findTableInFolders(folder.folders, tableId)
    if (nested) return nested
  }
  return null
}

export const useActiveTable = () => {
  const project = useActiveProject()
  const activeTableId = useAppStore((s) => s.activeTableId)
  
  if (!project || !activeTableId) return null
  
  // Check root tables
  const rootTable = project.tables.find((t) => t.id === activeTableId)
  if (rootTable) return rootTable
  
  // Check folders
  return findTableInFolders(project.folders, activeTableId)
}

export const useAnalysisContext = () => {
  const table = useActiveTable()
  if (!table?.analysis?.results) return null
  
  return {
    type: table.analysis.method,
    results: table.analysis.results,
    filename: table.filename,
  }
}

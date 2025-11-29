import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  FolderOpen,
  FolderPlus,
  FileSpreadsheet,
  ChevronRight,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Upload,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { useTranslation } from '@/lib/i18n'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'
import type { Project, Folder, Table, FilePreview } from '@/types'

export function FileManagerSidebar() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const activeTableId = useAppStore((s) => s.activeTableId)
  const createProject = useAppStore((s) => s.createProject)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const setActiveTable = useAppStore((s) => s.setActiveTable)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const renameProject = useAppStore((s) => s.renameProject)
  const createFolder = useAppStore((s) => s.createFolder)

  const handleNewProject = () => {
    createProject(t('files.newProject'))
  }

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="sidebar h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <Button
          variant="secondary"
          className="w-full justify-start gap-2"
          onClick={handleNewProject}
        >
          <Plus className="h-4 w-4" />
          {t('files.newProject')}
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder={t('app.search')}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm bg-surface"
          />
        </div>
      </div>

      {/* Project Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={project.id === activeProjectId}
                activeTableId={activeTableId}
                onSelect={() => setActiveProject(project.id)}
                onSelectTable={setActiveTable}
                onDelete={() => deleteProject(project.id)}
                onRename={(name) => renameProject(project.id, name)}
                onCreateFolder={(parentId) => createFolder(project.id, t('files.newFolder'), parentId)}
              />
            ))}
          </AnimatePresence>

          {filteredProjects.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              {searchQuery ? t('files.noProjectsFound') : t('files.noProjects')}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Project Item
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectItemProps {
  project: Project
  isActive: boolean
  activeTableId: string | null
  onSelect: () => void
  onSelectTable: (id: string) => void
  onDelete: () => void
  onRename: (name: string) => void
  onCreateFolder: (parentId: string | null) => void
}

function ProjectItem({
  project,
  isActive,
  activeTableId,
  onSelect,
  onSelectTable,
  onDelete,
  onRename,
  onCreateFolder,
}: ProjectItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(isActive)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [showMenu, setShowMenu] = useState(false)
  const [uploading, setUploading] = useState(false)

  const createTable = useAppStore((s) => s.createTable)
  const updateTablePreview = useAppStore((s) => s.updateTablePreview)

  const handleSaveRename = () => {
    if (editName.trim()) {
      onRename(editName.trim())
    }
    setEditing(false)
  }

  // Upload handler for project root
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      try {
        const tableName = file.name.replace(/\.[^/.]+$/, '')
        const tableId = createTable(project.id, tableName, file, null)

        const preview = await api.previewFile(file)
        const filePreview: FilePreview = {
          triggerFound: preview.trigger_found,
          triggerColumn: preview.trigger_column,
          metadataColumns: preview.metadata_columns.map((col) => ({
            name: col.name,
            uniqueCount: col.unique_count,
            sampleValues: col.sample_values,
          })),
          variableNames: preview.variable_names,
          numSamples: preview.num_samples,
          numVariables: preview.num_variables,
          previewRows: preview.preview_rows,
        }

        updateTablePreview(project.id, tableId, filePreview, null)
        toast.success(`${t('files.uploadSuccess')}: ${file.name}`)
      } catch (error) {
        toast.error('Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [project.id, createTable, updateTablePreview]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    noClick: true,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-1"
    >
      <div {...getRootProps()}>
        <input {...getInputProps()} />
      
      {/* Project Header */}
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors',
          isActive ? 'bg-surface-overlay text-text-primary' : 'hover:bg-surface-overlay/50 text-text-secondary',
          isDragActive && 'ring-2 ring-accent bg-accent/10'
        )}
        onClick={() => {
          if (!editing) {
            onSelect()
            setExpanded(!expanded)
          }
        }}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
        </motion.div>
        <FolderOpen className="h-4 w-4 text-accent flex-shrink-0" />
        
        {editing ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              className="h-6 text-sm px-1"
              autoFocus
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') handleSaveRename()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <button onClick={handleSaveRename} className="p-0.5 hover:bg-surface rounded">
              <Check className="h-3.5 w-3.5 text-success" />
            </button>
            <button onClick={() => setEditing(false)} className="p-0.5 hover:bg-surface rounded">
              <X className="h-3.5 w-3.5 text-text-muted" />
            </button>
          </div>
        ) : (
          <span className="flex-1 text-sm truncate">{project.name}</span>
        )}
        
        {/* Action buttons */}
        <AnimatePresence>
          {showMenu && !editing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
              <button
                className="p-1 hover:bg-surface rounded"
                title={t('files.newFolder')}
                onClick={() => onCreateFolder(null)}
              >
                <FolderPlus className="h-3.5 w-3.5 text-text-muted hover:text-accent" />
              </button>
              <button
                className="p-1 hover:bg-surface rounded"
                title={t('app.rename')}
                onClick={() => {
                  setEditName(project.name)
                  setEditing(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5 text-text-muted hover:text-accent" />
              </button>
              <button
                className="p-1 hover:bg-surface rounded"
                title={t('app.delete')}
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 text-text-muted hover:text-error" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content: Tables & Folders */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 border-l border-border pl-2 py-1">
              {/* Folders first */}
              {project.folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  projectId={project.id}
                  activeTableId={activeTableId}
                  onSelectTable={onSelectTable}
                  onCreateFolder={onCreateFolder}
                />
              ))}
              
              {/* Then tables */}
              {project.tables.map((table) => (
                <TableItem
                  key={table.id}
                  table={table}
                  projectId={project.id}
                  isActive={table.id === activeTableId}
                  onSelect={() => onSelectTable(table.id)}
                  folderId={null}
                />
              ))}
              
              {/* Empty state */}
              {project.folders.length === 0 && project.tables.length === 0 && (
                <div className="text-xs text-text-muted py-2 px-2">
                  {t('files.dropHere')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Folder Item (recursive)
// ═══════════════════════════════════════════════════════════════════════════

interface FolderItemProps {
  folder: Folder
  projectId: string
  activeTableId: string | null
  onSelectTable: (id: string) => void
  onCreateFolder: (parentId: string | null) => void
}

function FolderItem({
  folder,
  projectId,
  activeTableId,
  onSelectTable,
  onCreateFolder,
}: FolderItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [showMenu, setShowMenu] = useState(false)
  const [uploading, setUploading] = useState(false)

  const deleteFolder = useAppStore((s) => s.deleteFolder)
  const renameFolder = useAppStore((s) => s.renameFolder)
  const createTable = useAppStore((s) => s.createTable)
  const updateTablePreview = useAppStore((s) => s.updateTablePreview)

  const handleSaveRename = () => {
    if (editName.trim()) {
      renameFolder(projectId, folder.id, editName.trim())
    }
    setEditing(false)
  }

  // Upload into this folder
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      try {
        const tableName = file.name.replace(/\.[^/.]+$/, '')
        const tableId = createTable(projectId, tableName, file, folder.id)

        const preview = await api.previewFile(file)
        const filePreview: FilePreview = {
          triggerFound: preview.trigger_found,
          triggerColumn: preview.trigger_column,
          metadataColumns: preview.metadata_columns.map((col) => ({
            name: col.name,
            uniqueCount: col.unique_count,
            sampleValues: col.sample_values,
          })),
          variableNames: preview.variable_names,
          numSamples: preview.num_samples,
          numVariables: preview.num_variables,
          previewRows: preview.preview_rows,
        }

        updateTablePreview(projectId, tableId, filePreview, folder.id)
        toast.success(`${t('files.uploadSuccess')}: ${file.name}`)
        setExpanded(true)
      } catch (error) {
        toast.error('Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [projectId, folder.id, createTable, updateTablePreview]
  )

  const { getRootProps, getInputProps, isDragActive, open: openUploadDialog } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    noClick: true,
  })

  return (
    <div className="mb-0.5" {...getRootProps()}>
      <input {...getInputProps()} />
      
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors text-sm',
          'hover:bg-surface-overlay/50 text-text-secondary',
          isDragActive && 'ring-2 ring-accent bg-accent/10'
        )}
        onClick={() => !editing && setExpanded(!expanded)}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="h-3 w-3 text-text-muted" />
        </motion.div>
        <FolderOpen className="h-3.5 w-3.5 text-warning flex-shrink-0" />
        
        {editing ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              className="h-5 text-xs px-1"
              autoFocus
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') handleSaveRename()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <button onClick={handleSaveRename} className="p-0.5">
              <Check className="h-3 w-3 text-success" />
            </button>
          </div>
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}
        
        <AnimatePresence>
          {showMenu && !editing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {uploading && <Loader2 className="h-3 w-3 animate-spin text-accent" />}
              <button
                className="p-0.5 hover:bg-surface rounded"
                title={t('files.uploadFile')}
                onClick={openUploadDialog}
              >
                <Upload className="h-3 w-3 text-text-muted hover:text-accent" />
              </button>
              <button
                className="p-0.5 hover:bg-surface rounded"
                title={t('files.newSubfolder')}
                onClick={() => onCreateFolder(folder.id)}
              >
                <FolderPlus className="h-3 w-3 text-text-muted hover:text-accent" />
              </button>
              <button
                className="p-0.5 hover:bg-surface rounded"
                title={t('app.rename')}
                onClick={() => {
                  setEditName(folder.name)
                  setEditing(true)
                }}
              >
                <Pencil className="h-3 w-3 text-text-muted hover:text-accent" />
              </button>
              <button
                className="p-0.5 hover:bg-surface rounded"
                title={t('app.delete')}
                onClick={() => deleteFolder(projectId, folder.id)}
              >
                <Trash2 className="h-3 w-3 text-text-muted hover:text-error" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nested content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-3 border-l border-border/50 pl-2">
              {folder.folders.map((sub) => (
                <FolderItem
                  key={sub.id}
                  folder={sub}
                  projectId={projectId}
                  activeTableId={activeTableId}
                  onSelectTable={onSelectTable}
                  onCreateFolder={onCreateFolder}
                />
              ))}
              {folder.tables.map((table) => (
                <TableItem
                  key={table.id}
                  table={table}
                  projectId={projectId}
                  isActive={table.id === activeTableId}
                  onSelect={() => onSelectTable(table.id)}
                  folderId={folder.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Table Item
// ═══════════════════════════════════════════════════════════════════════════

interface TableItemProps {
  table: Table
  projectId: string
  isActive: boolean
  onSelect: () => void
  folderId: string | null
}

function TableItem({ table, projectId, isActive, onSelect, folderId }: TableItemProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(table.name)
  const [showMenu, setShowMenu] = useState(false)

  const deleteTable = useAppStore((s) => s.deleteTable)
  const renameTable = useAppStore((s) => s.renameTable)

  const handleSaveRename = () => {
    if (editName.trim()) {
      renameTable(projectId, table.id, editName.trim(), folderId)
    }
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-sm',
        isActive
          ? 'bg-accent/10 text-accent'
          : 'hover:bg-surface-overlay/50 text-text-secondary'
      )}
      onClick={() => !editing && onSelect()}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <FileSpreadsheet className="h-3.5 w-3.5 flex-shrink-0" />
      
      {editing ? (
        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
          <Input
            value={editName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
            className="h-5 text-xs px-1"
            autoFocus
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') handleSaveRename()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
          <button onClick={handleSaveRename} className="p-0.5">
            <Check className="h-3 w-3 text-success" />
          </button>
        </div>
      ) : (
        <span className="flex-1 truncate">{table.name}</span>
      )}

      <AnimatePresence>
        {showMenu && !editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="p-0.5 hover:bg-surface rounded"
              title={t('app.rename')}
              onClick={() => {
                setEditName(table.name)
                setEditing(true)
              }}
            >
              <Pencil className="h-3 w-3 text-text-muted hover:text-accent" />
            </button>
            <button
              className="p-0.5 hover:bg-surface rounded"
              title={t('app.delete')}
              onClick={() => deleteTable(projectId, table.id, folderId)}
            >
              <Trash2 className="h-3 w-3 text-text-muted hover:text-error" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

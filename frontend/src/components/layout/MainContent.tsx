import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import {
  PanelLeftClose,
  PanelRightClose,
  Upload,
  Download,
  Settings,
  ChevronRight,
  FolderOpen,
  FileSpreadsheet,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { useAppStore, useActiveProject, useActiveTable } from '@/store'
import { useTranslation } from '@/lib/i18n'
import { exportAnovaResults } from '@/lib/export'
import { Button } from '@/components/ui/Button'
import { LanguageToggle } from '@/components/ui/LanguageSwitcher'
import { api } from '@/lib/api'
import { DataPreview } from '@/components/analysis/DataPreview'
import { PreAnalysisVisualizer } from '@/components/analysis/PreAnalysisVisualizer'
import { DataVisualization } from '@/components/analysis/visualization'
import { AnalysisResults } from '@/components/analysis/AnalysisResults'
import { AnalysisSettingsDialog } from '@/components/analysis/AnalysisSettingsDialog'
import type { FilePreview, AnovaResults } from '@/types'

export function MainContent() {
  const { t } = useTranslation()
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar)
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)
  const activeProject = useActiveProject()
  const activeTable = useActiveTable()

  const createProject = useAppStore((s) => s.createProject)
  const createTable = useAppStore((s) => s.createTable)
  const updateTablePreview = useAppStore((s) => s.updateTablePreview)
  const updateTableFile = useAppStore((s) => s.updateTableFile)

  const [uploading, setUploading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Export handler
  const handleExport = useCallback(async () => {
    if (!activeTable?.analysis?.results) return
    if (activeTable.analysis.results.type !== 'anova') {
      toast.error(t('export.anovaOnly'))
      return
    }

    setExporting(true)
    try {
      await exportAnovaResults({
        results: activeTable.analysis.results as AnovaResults,
        filename: activeTable.name,
        originalFile: activeTable.file,
        designLabel: 'Treatment',
      })
      toast.success(t('export.complete'), {
        description: t('export.completeDesc')
      })
    } catch (error) {
      toast.error(t('export.failed'), {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setExporting(false)
    }
  }, [activeTable])

  // File upload handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      try {
        // Create project if none exists
        let projectId = activeProject?.id
        if (!projectId) {
          projectId = createProject(t('files.newProject'))
        }

        // Create table
        const tableName = file.name.replace(/\.[^/.]+$/, '')
        const tableId = createTable(projectId, tableName, file)

        // Preview file
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
          rawPreview: preview.raw_preview,
        }

        updateTablePreview(projectId, tableId, filePreview)
        toast.success(`${t('files.uploadSuccess')}: ${file.name}`, {
          description: `${preview.num_samples} ${t('data.samples')} × ${preview.num_variables} ${t('data.variables')}`,
        })
      } catch (error) {
        toast.error(t('files.uploadFailed'), {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setUploading(false)
      }
    },
    [activeProject, createProject, createTable, updateTablePreview]
  )

  // Handler for when raw data is updated from TableEditor
  const handleUpdateRawData = useCallback(
    async (tableId: string, newRawData: string[][]) => {
      console.log('[TableEditor] handleUpdateRawData called', { tableId, rowCount: newRawData?.length })

      if (!activeProject) {
        console.error('[TableEditor] No active project')
        return
      }

      if (!activeTable?.preview?.rawPreview) {
        console.error('[TableEditor] No rawPreview found in activeTable')
        return
      }

      try {
        console.log('[TableEditor] Converting to CSV with ORIGINAL column names...')

        // CRITICAL: Use ORIGINAL column names from rawPreview[0] to preserve backend mappings
        // The edited data (newRawData) has processed column names like "Diet",
        // but backend expects original names like "Diet 1=NND; 2=ADD" for ANOVA to work
        const originalHeaders = activeTable.preview.rawPreview[0]
        const editedDataRows = newRawData.slice(1)  // Skip processed headers

        console.log('[TableEditor] Headers mapping:', {
          original: originalHeaders.slice(0, 5),
          processed: newRawData[0].slice(0, 5)
        })

        // Create CSV with original headers but edited data values
        const csvRows = [originalHeaders, ...editedDataRows]

        const csvContent = csvRows
          .map(row => row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = String(cell ?? '').replace(/"/g, '""')
            return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
              ? `"${escaped}"`
              : escaped
          }).join(','))
          .join('\n')

        console.log('[TableEditor] CSV created with original headers, length:', csvContent.length)

        // Create a File blob from CSV
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const file = new File([blob], 'edited_data.csv', { type: 'text/csv' })

        console.log('[TableEditor] Sending to backend API...')

        // Send to backend API for parsing (same as initial upload)
        const preview = await api.previewFile(file)

        console.log('[TableEditor] Backend response:', {
          numSamples: preview.num_samples,
          numVariables: preview.num_variables,
        })

        // Convert API response to FilePreview format
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
          rawPreview: preview.raw_preview,
        }

        // Update both preview AND file
        console.log('[TableEditor] Updating table preview and file', {
          projectId: activeProject.id,
          tableId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        })

        updateTablePreview(activeProject.id, tableId, filePreview)
        updateTableFile(activeProject.id, tableId, file)

        console.log('[TableEditor] Table preview and file updated successfully')
        console.log('[TableEditor] New file blob created:', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })

        toast.success(t('data.tableUpdated'), {
          description: `${filePreview.numSamples} ${t('data.samples')} × ${filePreview.numVariables} ${t('data.variables')}`,
        })
      } catch (error) {
        console.error('[TableEditor] Failed to update table data:', error)
        toast.error('Failed to update table', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [activeProject, activeTable, updateTablePreview, updateTableFile, t]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  })

  return (
    <>
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-surface-raised/50 flex-shrink-0">
        {/* Left toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleLeftSidebar}
          className={leftSidebarOpen ? 'text-text-secondary' : 'text-accent'}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm">
          {activeProject ? (
            <>
              <FolderOpen className="h-4 w-4 text-accent" />
              <span className="text-text-secondary">{activeProject.name}</span>
              {activeTable && (
                <>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                  <FileSpreadsheet className="h-4 w-4 text-text-secondary" />
                  <span className="text-text-primary font-medium">{activeTable.name}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-text-muted">{t('header.noProject')}</span>
          )}
        </nav>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="secondary" size="sm" disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t('files.uploadFiles')}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!activeTable?.analysis?.results || exporting}
            onClick={handleExport}
            title={t('header.export')}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>

          {/* Language Switcher */}
          <LanguageToggle />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleRightSidebar}
            className={rightSidebarOpen ? 'text-text-secondary' : 'text-accent'}
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-grid noise">
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTable ? (
              <motion.div
                key={activeTable.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Title + Config button */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-text-primary">
                      {activeTable.name}
                    </h1>
                    <p className="text-text-secondary text-sm mt-1">
                      {activeTable.filename}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setSettingsOpen(true)}
                    disabled={!activeTable.preview}
                  >
                    <Settings className="h-4 w-4" />
                    {t('analysis.settings')}
                  </Button>
                </div>

                {/* Data Preview */}
                {activeTable.preview && (
                  <DataPreview
                    preview={activeTable.preview}
                    tableId={activeTable.id}
                    onUpdateRawData={handleUpdateRawData}
                  />
                )}

                {/* Pre-Analysis Visualization (Phase 3) */}
                {activeTable.preview && (
                  <PreAnalysisVisualizer preview={activeTable.preview} />
                )}

                {/* Advanced Data Visualization (Phase 7) */}
                {activeTable.preview && (
                  <DataVisualization preview={activeTable.preview} />
                )}

                {/* Analysis Results */}
                {activeTable.analysis?.results && (
                  <AnalysisResults analysis={activeTable.analysis} />
                )}
              </motion.div>
            ) : (
              <EmptyState
                onUpload={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                uploading={uploading}
                isDragActive={isDragActive}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Settings Dialog */}
      <AnalysisSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  )
}

function EmptyState({
  onUpload,
  uploading,
  isDragActive,
}: {
  onUpload: () => void
  uploading: boolean
  isDragActive: boolean
}) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh]"
    >
      <motion.div
        animate={{
          scale: isDragActive ? 1.1 : 1,
          borderColor: isDragActive ? 'hsl(168 80% 55%)' : 'hsl(220 15% 18%)',
        }}
        className="w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center mb-6 bg-surface-raised/50"
      >
        {uploading ? (
          <Loader2 className="h-10 w-10 text-accent animate-spin" />
        ) : (
          <BarChart3 className="h-10 w-10 text-text-muted" />
        )}
      </motion.div>

      <h2 className="text-xl font-semibold text-text-primary mb-2">
        {isDragActive ? t('empty.dropHere') : t('empty.startAnalysis')}
      </h2>
      <p className="text-text-secondary text-center max-w-md mb-6">
        {t('empty.description')}
      </p>

      <Button onClick={onUpload} disabled={uploading}>
        <Upload className="h-4 w-4" />
        {t('empty.uploadBtn')}
      </Button>

      <p className="text-text-muted text-xs mt-4">
        {t('empty.supported')}
      </p>
    </motion.div>
  )
}


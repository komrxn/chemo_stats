import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Database, Tag, Hash, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/i18n'
import { openTableEditor, getTableEditorResult } from './TableEditor'
import type { FilePreview } from '@/types'

interface DataPreviewProps {
  preview: FilePreview
  tableId?: string
  onUpdateRawData?: (tableId: string, newRawData: string[][]) => void
}

export function DataPreview({ preview, tableId, onUpdateRawData }: DataPreviewProps) {
  const { t } = useTranslation()
  const [editorWindow, setEditorWindow] = useState<Window | null>(null)

  // Open editor in separate window
  const handleOpenEditor = useCallback(() => {
    if (!preview.previewRows || preview.previewRows.length === 0 || !tableId) return

    console.log('[DataPreview] Opening editor with processed data')

    // Convert previewRows (object array with processed column names) to 2D array
    const headers = Object.keys(preview.previewRows[0])
    const data2D: string[][] = [
      headers, // First row is headers
      ...preview.previewRows.map(row =>
        headers.map(header => String(row[header] ?? ''))
      )
    ]

    console.log('[DataPreview] Data prepared:', { headers: headers.slice(0, 5), rows: data2D.length })

    const win = openTableEditor(tableId, data2D)
    setEditorWindow(win)
  }, [preview.previewRows, tableId])

  // Listen for messages from editor window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[DataPreview] postMessage received:', event.data?.type)
      if (event.data?.type === 'TABLE_EDITOR_SAVE' && event.data.tableId && event.data.data) {
        console.log('[DataPreview] Processing save:', { tableId: event.data.tableId, rows: event.data.data?.length })
        if (onUpdateRawData) {
          onUpdateRawData(event.data.tableId, event.data.data)
        }
        setEditorWindow(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onUpdateRawData])

  // Check if editor window was closed and result is available
  useEffect(() => {
    if (!editorWindow) return

    const checkWindow = setInterval(() => {
      if (editorWindow.closed) {
        console.log('[DataPreview] Editor window closed, checking for result...')
        clearInterval(checkWindow)
        setEditorWindow(null)

        // Check for saved result
        const result = getTableEditorResult()
        console.log('[DataPreview] Result from localStorage:', result ? { tableId: result.tableId, saved: result.saved, rows: result.data?.length } : null)
        if (result?.saved && onUpdateRawData) {
          onUpdateRawData(result.tableId, result.data)
        }
      }
    }, 500)

    return () => clearInterval(checkWindow)
  }, [editorWindow, onUpdateRawData])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-6"
    >
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-accent" />
            <div>
              <h3 className="font-semibold text-text-primary">{t('data.overview')}</h3>
              <p className="text-sm text-text-secondary">
                {preview.numSamples} {t('data.samples')} × {preview.numVariables} {t('data.variables')}
              </p>
            </div>
          </div>

          {/* Edit Table Button */}
          {preview.previewRows && preview.previewRows.length > 0 && tableId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenEditor}
              disabled={!!editorWindow}
            >
              <Edit3 className="h-4 w-4" />
              {editorWindow ? 'Editor Open...' : t('data.editTable')}
            </Button>
          )}
        </div>
      </div>

      <div className="card-content">
        {/* Metadata columns */}
        {preview.metadataColumns.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {t('data.classColumns')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {preview.metadataColumns.map((col) => (
                <div
                  key={col.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay border border-border"
                >
                  <Tag className="h-3.5 w-3.5 text-accent" />
                  <span className="text-sm font-medium text-text-primary">{col.name}</span>
                  <span className="text-xs text-text-muted">
                    ({col.uniqueCount} {t('data.groups')})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview table (compact) */}
        {preview.previewRows && preview.previewRows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(preview.previewRows[0]).slice(0, 8).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                  {Object.keys(preview.previewRows[0]).length > 8 && (
                    <th className="text-center">...</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {Object.entries(row).slice(0, 8).map(([key, value]) => (
                      <td key={key} className="tabular-nums">
                        {typeof value === 'number' ? (value as number).toFixed(4) : String(value)}
                      </td>
                    ))}
                    {Object.keys(row).length > 8 && (
                      <td className="text-center text-text-muted">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Variable count */}
        <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
          <Hash className="h-4 w-4" />
          <span>
            {preview.variableNames.length} {t('data.numericVariables')}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

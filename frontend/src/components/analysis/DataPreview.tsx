import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Tag, Hash, Expand } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/i18n'
import type { FilePreview } from '@/types'

interface DataPreviewProps {
  preview: FilePreview
}

export function DataPreview({ preview }: DataPreviewProps) {
  const { t } = useTranslation()
  const [fullViewOpen, setFullViewOpen] = useState(false)

  return (
    <>
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

            {/* View Full Data Button */}
            {preview.previewRows && preview.previewRows.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFullViewOpen(true)}
              >
                <Expand className="h-4 w-4" />
                {t('data.viewFull')}
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

      {/* Full Data Modal */}
      <Dialog open={fullViewOpen} onOpenChange={setFullViewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] w-full flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-accent" />
              {t('data.fullView')}
              <span className="text-sm font-normal text-text-secondary ml-2">
                {preview.numSamples} {t('data.rows')} × {Object.keys(preview.previewRows?.[0] || {}).length} {t('data.columns')}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Double scroll container - both X and Y */}
          <div className="flex-1 overflow-auto rounded-lg border border-border min-h-0">
            {preview.previewRows && preview.previewRows.length > 0 && (
              <table className="data-table w-max min-w-full">
                <thead className="sticky top-0 z-10 bg-surface-overlay">
                  <tr>
                    <th className="text-center w-12 sticky left-0 bg-surface-overlay z-20">#</th>
                    {Object.keys(preview.previewRows[0]).map((key) => (
                      <th key={key} className="whitespace-nowrap">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-center text-text-muted font-mono text-xs sticky left-0 bg-surface z-10">
                        {i + 1}
                      </td>
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="tabular-nums whitespace-nowrap">
                          {typeof value === 'number' 
                            ? (value as number).toFixed(4) 
                            : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Scroll hint */}
          <p className="text-xs text-text-muted mt-2 flex-shrink-0">
            {t('data.scrollHint')}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

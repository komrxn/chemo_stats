import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  Play,
  Loader2,
  BarChart3,
  Layers,
  Target,
  Info,
  Sparkles,
  TrendingUp,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip'
import { useAppStore, useActiveProject, useActiveTable } from '@/store'
import { useTranslation } from '@/lib/i18n'
import { api } from '@/lib/api'
import type { AnalysisMethod, AnovaResults, PcaResults } from '@/types'
import { cn } from '@/lib/utils'

interface AnalysisSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnalysisSettingsDialog({
  open,
  onOpenChange,
}: AnalysisSettingsDialogProps) {
  const { t } = useTranslation()
  const activeProject = useActiveProject()
  const activeTable = useActiveTable()
  const updateTableAnalysis = useAppStore((s) => s.updateTableAnalysis)

  const [method, setMethod] = useState<AnalysisMethod>('anova')
  const [classColumn, setClassColumn] = useState('')
  const [fdrThreshold, setFdrThreshold] = useState('0.05')
  const [designLabel, setDesignLabel] = useState('Treatment')
  const [plotOption, setPlotOption] = useState('3')
  const [numPcs, setNumPcs] = useState('3')
  const [scalingMethod, setScalingMethod] = useState<'auto' | 'mean' | 'pareto'>('auto')
  const [running, setRunning] = useState(false)

  const metadataColumns = activeTable?.preview?.metadataColumns ?? []

  // Auto-select first class column
  if (!classColumn && metadataColumns.length > 0) {
    setClassColumn(metadataColumns[0].name)
  }

  const handleRunAnalysis = async () => {
    if (!activeProject || !activeTable?.file) return

    setRunning(true)
    
    updateTableAnalysis(activeProject.id, activeTable.id, {
      status: 'running',
      method,
      results: null,
      error: null,
    })

    try {
      if (method === 'anova') {
        const response = await api.runAnova(activeTable.file, {
          classColumn,
          fdrThreshold: parseFloat(fdrThreshold),
          designLabel,
          plotOption: parseInt(plotOption),
        })

        const results: AnovaResults = {
          type: 'anova',
          results: response.results,
          summary: {
            totalVariables: response.summary.total_variables,
            benjaminiSignificant: response.summary.benjamini_significant,
            bonferroniSignificant: response.summary.bonferroni_significant,
            nominalSignificant: response.summary.nominal_significant,
            numGroups: response.summary.num_groups,
          },
          boxplotData: Object.fromEntries(
            Object.entries(response.boxplot_data).map(([key, val]) => [
              key,
              {
                variableName: val.variable_name,
                groups: val.groups,
                yLimits: val.y_limits,
              },
            ])
          ),
          overviewData: {
            pValuesSorted: response.overview_data.p_values_sorted,
            benjaminiIndices: response.overview_data.benjamini_indices,
            bonferroniIndices: response.overview_data.bonferroni_indices,
            bonferroniThreshold: response.overview_data.bonferroni_threshold,
            benjaminiThreshold: response.overview_data.benjamini_threshold,
            nominalThreshold: response.overview_data.nominal_threshold,
          },
        }

        updateTableAnalysis(activeProject.id, activeTable.id, {
          status: 'complete',
          method: 'anova',
          results,
          error: null,
        })

        toast.success(t('analysis.complete'), {
          description: `${results.summary.benjaminiSignificant} ${t('analysis.significantVars')}`,
        })
      } else {
        const response = await api.runPca(activeTable.file, {
          numPcs: parseInt(numPcs),
          scalingMethod,
          designLabel,
        })

        const results: PcaResults = {
          type: 'pca',
          scores: response.scores,
          loadings: response.loadings,
          explainedVariance: response.explained_variance,
          summary: {
            totalVarianceExplained: response.summary.total_variance_explained,
          },
        }

        updateTableAnalysis(activeProject.id, activeTable.id, {
          status: 'complete',
          method: 'pca',
          results,
          error: null,
        })

        toast.success(t('analysis.complete'), {
          description: `${results.summary.totalVarianceExplained.toFixed(1)}% variance`,
        })
      }

      onOpenChange(false)
    } catch (error) {
      updateTableAnalysis(activeProject.id, activeTable.id, {
        status: 'error',
        method,
        results: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      toast.error(t('analysis.failed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setRunning(false)
    }
  }

  const selectedColumnInfo = metadataColumns.find((c) => c.name === classColumn)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-surface-raised/50">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10">
                <Settings2 className="h-6 w-6 text-accent" />
              </div>
              <div>
                <DialogTitle className="text-xl">{t('analysis.settings')}</DialogTitle>
                <DialogDescription className="text-text-secondary mt-1">
                  {t('analysis.configure')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Method Selection */}
          <div className="space-y-3">
            <FieldLabel icon={Sparkles} label={t('analysis.method')} />
            
            <div className="grid grid-cols-2 gap-3">
              <MethodCard
                selected={method === 'anova'}
                onClick={() => setMethod('anova')}
                icon={BarChart3}
                title={t('analysis.anova')}
                description={t('analysis.anovaDesc')}
              />
              <MethodCard
                selected={method === 'pca'}
                onClick={() => setMethod('pca')}
                icon={Layers}
                title={t('analysis.pca')}
                description={t('analysis.pcaDesc')}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {method === 'anova' ? (
              <motion.div
                key="anova"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Class Column */}
                <div className="space-y-2">
                  <FieldLabel
                    icon={Target}
                    label={t('analysis.groupingVar')}
                    tooltip={t('analysis.fdrHelp')}
                  />
                  <Select value={classColumn} onValueChange={setClassColumn}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={t('analysis.selectColumn')} />
                    </SelectTrigger>
                    <SelectContent>
                      {metadataColumns.map((col) => (
                        <SelectItem key={col.name} value={col.name} className="py-3">
                          <div className="flex items-center gap-3">
                            <Target className="h-4 w-4 text-accent" />
                            <div>
                              <div className="font-medium">{col.name}</div>
                              <div className="text-xs text-text-muted">
                                {col.uniqueCount} {t('analysis.uniqueGroups')}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected column preview */}
                  {selectedColumnInfo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 rounded-lg bg-accent/5 border border-accent/20"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4 text-accent" />
                        <span className="text-text-secondary">
                          <span className="text-accent font-medium">{selectedColumnInfo.uniqueCount}</span> {t('analysis.groupsFound')}
                          {selectedColumnInfo.sampleValues && selectedColumnInfo.sampleValues.length > 0 && (
                            <span className="ml-1 text-text-muted">
                              ({selectedColumnInfo.sampleValues.slice(0, 3).join(', ')}
                              {selectedColumnInfo.sampleValues.length > 3 && '...'})
                            </span>
                          )}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* FDR & Design Label Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel
                      icon={TrendingUp}
                      label={t('analysis.fdrThreshold')}
                      tooltip={t('analysis.fdrHelp')}
                    />
                    <Input
                      type="number"
                      value={fdrThreshold}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFdrThreshold(e.target.value)}
                      step="0.01"
                      min="0"
                      max="1"
                      className="h-12 font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FieldLabel icon={FolderOpen} label={t('analysis.designLabel')} />
                    <Input
                      value={designLabel}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDesignLabel(e.target.value)}
                      placeholder="Treatment"
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Plot Option */}
                <div className="space-y-2">
                  <FieldLabel icon={BarChart3} label={t('analysis.visualization')} />
                  <Select value={plotOption} onValueChange={setPlotOption}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.noPlots')}</span>
                          <span className="text-xs text-text-muted">{t('tooltip.noPlots')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="1" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.nominal')}</span>
                          <span className="text-xs text-text-muted">{t('tooltip.nominal')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="2" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.bonferroni')}</span>
                          <span className="text-xs text-text-muted">{t('tooltip.bonferroni')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="3" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.benjamini')} ✨</span>
                          <span className="text-xs text-text-muted">{t('tooltip.benjamini')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="4" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.allVariables')}</span>
                          <span className="text-xs text-text-muted">{t('tooltip.allVars')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="pca"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Num PCs */}
                <div className="space-y-2">
                  <FieldLabel
                    icon={Layers}
                    label={t('analysis.numComponents')}
                    tooltip={t('analysis.numComponentsHelp')}
                  />
                  <Input
                    type="number"
                    value={numPcs}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumPcs(e.target.value)}
                    min="1"
                    max="10"
                    className="h-12 font-mono"
                  />
                </div>

                {/* Scaling Method */}
                <div className="space-y-2">
                  <FieldLabel icon={TrendingUp} label={t('analysis.scalingMethod')} />
                  <Select value={scalingMethod} onValueChange={(v: string) => setScalingMethod(v as typeof scalingMethod)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.autoScale')}</span>
                          <span className="text-xs text-text-muted">{t('analysis.autoScaleDesc')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="mean" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.meanCenter')}</span>
                          <span className="text-xs text-text-muted">{t('analysis.meanCenterDesc')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pareto" className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{t('analysis.pareto')}</span>
                          <span className="text-xs text-text-muted">{t('analysis.paretoDesc')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Design Label */}
                <div className="space-y-2">
                  <FieldLabel icon={FolderOpen} label="Метка дизайна" />
                  <Input
                    value={designLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDesignLabel(e.target.value)}
                    placeholder="Treatment"
                    className="h-12"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-raised/30">
          <Button
            onClick={handleRunAnalysis}
            disabled={running || (method === 'anova' && !classColumn)}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {running ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('analysis.running')}
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                {t('analysis.run')} {method.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper Components
function FieldLabel({
  icon: Icon,
  label,
  tooltip,
}: {
  icon: typeof Info
  label: string
  tooltip?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-text-muted" />
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-text-muted hover:text-text-secondary transition-colors">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function MethodCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  icon: typeof BarChart3
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border-2 text-left transition-all duration-200',
        'hover:border-accent/50 hover:bg-accent/5',
        selected
          ? 'border-accent bg-accent/10'
          : 'border-border bg-surface-raised/50'
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            'p-2 rounded-lg',
            selected ? 'bg-accent/20 text-accent' : 'bg-surface-overlay text-text-muted'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn('font-semibold', selected ? 'text-accent' : 'text-text-primary')}>
          {title}
        </span>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
    </button>
  )
}

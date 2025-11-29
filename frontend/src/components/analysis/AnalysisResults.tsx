import { motion } from 'framer-motion'
import { BarChart3, CheckCircle2, TrendingUp, Sparkles, Layers } from 'lucide-react'
import type { AnalysisState, AnovaResults, PcaResults } from '@/types'
import { useAppStore } from '@/store'
import { useTranslation } from '@/lib/i18n'
import { ResultsTable } from './ResultsTable'
import { BoxPlotChart } from './BoxPlotChart'
import { cn } from '@/lib/utils'

interface AnalysisResultsProps {
  analysis: AnalysisState
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  if (!analysis.results) return null

  if (analysis.results.type === 'anova') {
    return <AnovaResultsView results={analysis.results} />
  }

  return <PcaResultsView results={analysis.results} />
}

function AnovaResultsView({ results }: { results: AnovaResults }) {
  const { t } = useTranslation()
  const { summary, boxplotData } = results
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  
  // Calculate grid columns based on sidebars state
  const bothClosed = !leftSidebarOpen && !rightSidebarOpen
  const oneClosed = !leftSidebarOpen || !rightSidebarOpen

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className={cn(
        "grid gap-4",
        bothClosed ? "grid-cols-4" : oneClosed ? "grid-cols-4" : "grid-cols-2 lg:grid-cols-4"
      )}>
        <SummaryCard
          title={t('results.totalVars')}
          value={summary.totalVariables}
          icon={BarChart3}
          color="default"
        />
        <SummaryCard
          title={t('results.benjaminiSig')}
          value={summary.benjaminiSignificant}
          icon={CheckCircle2}
          color="accent"
        />
        <SummaryCard
          title={t('results.bonferroniSig')}
          value={summary.bonferroniSignificant}
          icon={CheckCircle2}
          color="warning"
        />
        <SummaryCard
          title={t('results.numGroups')}
          value={summary.numGroups}
          icon={TrendingUp}
          color="default"
        />
      </div>

      {/* Results Table */}
      <ResultsTable results={results.results} />

      {/* Box Plots */}
      {Object.keys(boxplotData).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text-primary">
            {t('results.topSignificant')}
          </h2>
          {/* Adaptive grid: 2 cols when both sidebars closed, 1 col otherwise */}
          <div className={cn(
            "grid gap-6",
            bothClosed ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
          )}>
            {Object.entries(boxplotData).slice(0, 6).map(([key, data], idx) => {
              const result = results.results[idx]
              return (
                <BoxPlotChart
                  key={key}
                  data={data}
                  pValue={result?.pValue}
                  fdr={result?.fdr}
                />
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function PcaResultsView({ results }: { results: PcaResults }) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-text-primary">PCA Results</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-surface-overlay border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider">Total Variance</p>
              <p className="text-2xl font-bold text-accent mt-1">
                {results.summary.totalVarianceExplained.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-surface-overlay border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider">Components</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {results.explainedVariance.length}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-surface-overlay border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider">Samples</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {results.scores.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Placeholder */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="card-content py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="p-4 rounded-2xl bg-gradient-to-br from-accent/20 to-violet-500/20 mb-6"
            >
              <Layers className="h-12 w-12 text-accent" />
            </motion.div>
            
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-warning" />
              <h3 className="text-xl font-bold text-text-primary">
                {t('pca.comingSoon')}
              </h3>
              <Sparkles className="h-5 w-5 text-warning" />
            </div>
            
            <p className="text-text-secondary max-w-md">
              {t('pca.comingSoonDesc')}
            </p>

            {/* Teaser features */}
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-text-muted">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Interactive Score Plot
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                Loading Plot
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <div className="w-2 h-2 rounded-full bg-warning" />
                Scree Plot
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <div className="w-2 h-2 rounded-full bg-success" />
                Biplot
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: typeof BarChart3
  color: 'default' | 'accent' | 'warning'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-content">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'p-2 rounded-lg',
              color === 'accent' && 'bg-accent/10',
              color === 'warning' && 'bg-warning/10',
              color === 'default' && 'bg-surface-overlay'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                color === 'accent' && 'text-accent',
                color === 'warning' && 'text-warning',
                color === 'default' && 'text-text-secondary'
              )}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}


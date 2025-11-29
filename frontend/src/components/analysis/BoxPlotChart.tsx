import { useMemo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Plot from 'react-plotly.js'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { BoxplotVariable } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { formatPValue, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface BoxPlotChartProps {
  data: BoxplotVariable
  pValue?: number
  fdr?: number
}

// Color palette matching our design
const COLORS = [
  '#2dd4bf', // accent (mint)
  '#a78bfa', // violet
  '#fb923c', // orange
  '#4ade80', // green
  '#f472b6', // pink
  '#38bdf8', // sky
]

const MIN_HEIGHT = 280
const MAX_HEIGHT = 800
const DEFAULT_HEIGHT = 380

export function BoxPlotChart({ data, pValue, fdr }: BoxPlotChartProps) {
  const { t } = useTranslation()
  const [chartHeight, setChartHeight] = useState(DEFAULT_HEIGHT)
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<any>(null)

  // Native wheel handler to properly prevent page scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        
        const delta = e.deltaY > 0 ? -30 : 30
        setChartHeight((prev) => {
          const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, prev + delta))
          return newHeight
        })
      }
    }

    // Use passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Force Plotly to resize when height changes
  useEffect(() => {
    if (plotRef.current?.el) {
      // Trigger Plotly resize
      window.dispatchEvent(new Event('resize'))
    }
  }, [chartHeight])

  // Transform data for Plotly
  const plotData = useMemo(() => {
    const traces: Plotly.Data[] = []
    const groupNames = Object.keys(data.groups)

    groupNames.forEach((groupName, idx) => {
      const stats = data.groups[groupName]
      const color = COLORS[idx % COLORS.length]

      traces.push({
        type: 'box',
        name: groupName,
        y: stats.values,
        boxpoints: 'all',
        jitter: 0.4,
        pointpos: 0,
        marker: {
          color: color,
          size: 7,
          opacity: 0.7,
          line: {
            color: 'rgba(255,255,255,0.3)',
            width: 1,
          },
        },
        line: {
          color: color,
          width: 2,
        },
        fillcolor: `${color}33`,
        width: 0.5,
        hoverinfo: 'y+name',
        hoverlabel: {
          bgcolor: '#1a1d23',
          bordercolor: color,
          font: {
            family: 'JetBrains Mono',
            size: 12,
            color: '#f1f5f9',
          },
        },
      })
    })

    return traces
  }, [data])

  // Layout with height dependency
  const layout: Partial<Plotly.Layout> = useMemo(
    () => ({
      title: {
        text: data.variableName,
        font: {
          family: 'Plus Jakarta Sans',
          size: 18,
          color: '#f1f5f9',
        },
        x: 0.5,
        xanchor: 'center',
      },
      height: chartHeight, // Explicitly set height in layout
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'Plus Jakarta Sans',
        color: '#94a3b8',
      },
      showlegend: true,
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.15,
        font: {
          size: 12,
          color: '#94a3b8',
        },
        bgcolor: 'transparent',
      },
      margin: {
        l: 60,
        r: 30,
        t: 60,
        b: 80,
      },
      xaxis: {
        showgrid: false,
        zeroline: false,
        showline: true,
        linecolor: '#334155',
        tickfont: {
          family: 'Plus Jakarta Sans',
          size: 12,
          color: '#94a3b8',
        },
      },
      yaxis: {
        title: {
          text: 'Value',
          font: {
            family: 'Plus Jakarta Sans',
            size: 12,
            color: '#64748b',
          },
        },
        showgrid: true,
        gridcolor: '#1e293b',
        gridwidth: 1,
        zeroline: false,
        showline: true,
        linecolor: '#334155',
        tickfont: {
          family: 'JetBrains Mono',
          size: 11,
          color: '#94a3b8',
        },
        autorange: true,
        automargin: true,
      },
      hovermode: 'closest',
      hoverlabel: {
        bgcolor: '#1a1d23',
        bordercolor: '#334155',
        font: {
          family: 'JetBrains Mono',
          size: 12,
          color: '#f1f5f9',
        },
      },
    }),
    [data, chartHeight]
  )

  const config: Partial<Plotly.Config> = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      'select2d',
      'lasso2d',
      'autoScale2d',
      'hoverClosestCartesian',
      'hoverCompareCartesian',
    ],
    responsive: true,
  }

  const totalObservations = Object.values(data.groups).reduce(
    (sum, g) => sum + g.values.length,
    0
  )

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-header flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{data.variableName}</h3>
          <p className="text-sm text-text-secondary mt-0.5">
            {Object.keys(data.groups).length} {t('boxplot.groups')} • {totalObservations} {t('results.observations')}
          </p>
        </div>

        {/* Statistics badges and resize controls */}
        <div className="flex items-center gap-2">
          {pValue !== undefined && (
            <span
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono font-medium border',
                pValue < 0.05
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-surface-raised text-text-secondary border-border'
              )}
            >
              <span className="text-text-muted mr-1">p =</span>
              {formatPValue(pValue)}
            </span>
          )}
          {fdr !== undefined && (
            <span
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono font-medium border',
                fdr < 0.05
                  ? 'bg-success/15 text-success border-success/30'
                  : 'bg-surface-raised text-text-secondary border-border'
              )}
            >
              <span className="text-text-muted mr-1">FDR =</span>
              {formatPValue(fdr)}
            </span>
          )}
          
          {/* Resize controls */}
          <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartHeight(MIN_HEIGHT)}
              title={t('boxplot.minimize')}
              disabled={chartHeight === MIN_HEIGHT}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartHeight(MAX_HEIGHT)}
              title={t('boxplot.maximize')}
              disabled={chartHeight === MAX_HEIGHT}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="card-content">
        {/* Hint about scroll resize */}
        <p className="text-xs text-text-muted mb-2 flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-surface-overlay rounded text-2xs font-mono">Ctrl</kbd>
          {t('boxplot.resizeHint')}
        </p>

        {/* Plotly Chart */}
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <Plot
            ref={plotRef}
            data={plotData}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
            onInitialized={(_, graphDiv) => {
              plotRef.current = { el: graphDiv }
            }}
          />
        </div>

        {/* Group statistics cards */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(data.groups).map(([groupName, stats], idx) => (
            <div
              key={groupName}
              className="p-3 rounded-lg bg-surface border border-border"
              style={{ borderLeftColor: COLORS[idx % COLORS.length], borderLeftWidth: 3 }}
            >
              <p className="text-xs font-medium text-text-muted mb-1">{groupName}</p>
              <div className="space-y-0.5 font-mono text-xs">
                <p>
                  <span className="text-text-muted">n = </span>
                  <span className="text-text-primary font-semibold">{stats.n}</span>
                </p>
                <p>
                  <span className="text-text-muted">Median = </span>
                  <span className="text-accent font-semibold">{stats.median.toFixed(2)}</span>
                </p>
                <p>
                  <span className="text-text-muted">IQR = </span>
                  <span className="text-text-secondary">
                    {(stats.q3 - stats.q1).toFixed(2)}
                  </span>
                </p>
                <p>
                  <span className="text-text-muted">Range = </span>
                  <span className="text-text-secondary">
                    {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

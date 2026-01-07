import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import Plot from 'react-plotly.js'
import { Maximize2, Minimize2, MessageSquarePlus, Download, Pen } from 'lucide-react'
import type { BoxplotVariable } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { formatPValue, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store'
import html2canvas from 'html2canvas'

interface BoxPlotChartProps {
  data: BoxplotVariable
  fdr?: number  // FDR-corrected p-value (Benjamini-Hochberg)
  effectSize?: number  // Effect size (η²) as percentage
  plotType?: 'box' | 'violin'
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

export function BoxPlotChart({ data, fdr, effectSize, plotType = 'box' }: BoxPlotChartProps) {
  const { t } = useTranslation()
  const [chartHeight, setChartHeight] = useState(DEFAULT_HEIGHT)
  const [capturing, setCapturing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<any>(null)

  const setPendingAttachment = useAppStore((s) => s.setPendingAttachment)
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)

  // Global Visualization Settings
  const visualizationSettings = useAppStore((s) => s.visualizationSettings)
  const setVisualizationSettings = useAppStore((s) => s.setVisualizationSettings)

  // Local state for labels (initialized from global settings)
  const [yAxisLabel, setYAxisLabel] = useState(visualizationSettings.yAxisLabel)
  const [xAxisLabel, setXAxisLabel] = useState(visualizationSettings.xAxisLabel)
  const [groupMappings, setGroupMappings] = useState<Record<string, string>>({})

  // Customization State
  const [isCustomizing, setIsCustomizing] = useState(false)

  // Check for global updates
  useEffect(() => {
    setYAxisLabel(visualizationSettings.yAxisLabel)
    setXAxisLabel(visualizationSettings.xAxisLabel)
  }, [visualizationSettings])

  // Update handler from dialog
  const handleUpdateConfig = (
    newX: string,
    newY: string,
    newMappings: Record<string, string>,
    applyGlobal: boolean
  ) => {
    setXAxisLabel(newX)
    setYAxisLabel(newY)
    setGroupMappings(newMappings)

    if (applyGlobal) {
      setVisualizationSettings({ xAxisLabel: newX, yAxisLabel: newY })
    }
    setIsCustomizing(false)
  }

  // Download PNG handler using Plotly's built-in method
  const handleDownloadPNG = useCallback(() => {
    if (!plotRef.current?.el) return

    // Clean filename (remove potential invalid characters)
    const cleanName = data.variableName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${cleanName}_${plotType}`

    // Use Plotly's downloadImage for clean, high-quality export
    const gd = plotRef.current.el

    import('plotly.js-dist-min').then((Plotly) => {
      Plotly.downloadImage(gd, {
        format: 'png',
        width: 1200,
        height: 800,
        filename: filename, // Plotly appends extension automatically
        scale: 2  // 2x resolution for publication quality
      } as any)
    }).catch((error) => {
      console.error('Failed to export chart:', error)
    })
  }, [data.variableName, plotType])

  // Add boxplot to chat
  const handleAddToChat = useCallback(async () => {
    if (!containerRef.current || capturing) return

    setCapturing(true)
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#12141a',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const imageData = canvas.toDataURL('image/png')

      setPendingAttachment({
        type: 'image',
        data: imageData,
        name: `${data.variableName}_${plotType}.png`,
        variableName: data.variableName,
      })

      // Open sidebar if closed
      if (!rightSidebarOpen) {
        toggleRightSidebar()
      }
    } catch (error) {
      console.error('Failed to capture chart:', error)
    } finally {
      setCapturing(false)
    }
  }, [data.variableName, capturing, setPendingAttachment, rightSidebarOpen, toggleRightSidebar, plotType])

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
      const displayName = groupMappings[groupName] || groupName

      if (plotType === 'violin') {
        // Violin Plot Trace
        traces.push({
          type: 'violin',
          name: displayName, // Use mapped name
          y: stats.values, // Raw values needed for violin density
          points: 'all',   // Show all points like MATLAB script
          jitter: 0.4,
          pointpos: 0,     // Points centered
          box: {
            visible: true, // Show inner boxplot
            width: 0.2,
            line: { color: 'rgba(255,255,255,0.8)', width: 1 }
          },
          meanline: {
            visible: true,
            color: 'rgba(255,255,255,0.8)'
          },
          line: {
            color: color,
            width: 1
          },
          fillcolor: `${color}66`, // More opacity for violin body
          marker: {
            color: color,
            size: 4,
            opacity: 0.6,
            line: {
              color: 'rgba(255,255,255,0.3)',
              width: 0.5,
            },
          },
          width: 0.8,
          hoverinfo: 'y+name',
          hoverlabel: {
            bgcolor: '#1a1d23',
            bordercolor: color,
            font: { family: 'JetBrains Mono', size: 12, color: '#f1f5f9' },
          },
          scalegroup: 'group', // Scale violins relative to each other if needed
        } as any)
      } else {
        // Standard Box Plot Trace
        traces.push({
          type: 'box',
          name: displayName, // Use mapped name
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
      }
    })

    return traces
  }, [data, plotType, groupMappings])

  // Layout with height dependency
  const layout: Partial<Plotly.Layout> = useMemo(
    () => {
      // Construct title with stats for export visibility
      let titleText = data.variableName

      // Add stats to title (smaller font)
      const statsParts: string[] = []
      if (effectSize !== undefined) statsParts.push(`η²: ${effectSize.toFixed(1)}%`)
      if (fdr !== undefined) statsParts.push(`FDR: ${formatPValue(fdr)}`)

      if (statsParts.length > 0) {
        titleText += `<br><span style="font-size: 13px; color: #64748b; font-weight: normal">${statsParts.join(' | ')}</span>`
      }

      return {
        title: {
          text: titleText,
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
          y: -0.2, // Moved down to prevent overlap
          font: {
            size: 12,
            color: '#94a3b8',
          },
          bgcolor: 'transparent',
        },
        margin: {
          l: 60,
          r: 30,
          t: 80,
          b: 100,
        },
        xaxis: {
          title: {
            text: xAxisLabel,
            font: { family: 'Plus Jakarta Sans', size: 12, color: '#64748b' },
            standoff: 40
          },
          showgrid: false,
          zeroline: false,
          showline: true,
          linecolor: '#334155',
          tickangle: -30,
          automargin: true,
          tickfont: {
            family: 'Plus Jakarta Sans',
            size: 11,
            color: '#94a3b8',
          },
        },
        yaxis: {
          title: {
            text: yAxisLabel,
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
      }
    },
    [data, chartHeight, effectSize, fdr, plotType, xAxisLabel, yAxisLabel]
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
    <>
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

          {/* Statistics badges and action buttons */}
          <div className="flex items-center gap-2">
            {/* Effect Size Badge - Shows biological/practical significance */}
            {effectSize !== undefined && (
              <span
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono font-medium border',
                  effectSize > 14  // Large effect (η² > 0.14 = 14%)
                    ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                    : effectSize > 6  // Medium effect
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : 'bg-surface-raised text-text-secondary border-border'
                )}
                title="Effect size (η² as %) - measures the proportion of variance explained"
              >
                <span className="text-text-muted mr-1">η² =</span>
                {effectSize.toFixed(1)}%
              </span>
            )}

            {/* FDR-Corrected P-value Badge - Shows statistical significance after multiple testing correction */}
            {fdr !== undefined && (
              <span
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono font-medium border',
                  fdr < 0.05
                    ? 'bg-success/15 text-success border-success/30'
                    : fdr < 0.1
                      ? 'bg-warning/15 text-warning border-warning/30'
                      : 'bg-surface-raised text-text-secondary border-border'
                )}
                title="FDR-corrected p-value (Benjamini-Hochberg)"
              >
                <span className="text-text-muted mr-1">FDR corrected p-value =</span>
                {formatPValue(fdr)}
              </span>
            )}

            {/* Action buttons group */}
            <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">

              {/* CUSTOMIZE CHART BUTTON */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomizing(true)}
                className="text-text-secondary hover:bg-surface-overlay"
              >
                <Pen className="h-4 w-4" />
              </Button>

              {/* Download PNG button - Clean export for publications */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadPNG}
                className="text-text-secondary hover:bg-surface-overlay"
                title="Download high-quality PNG (transparent background, 2x resolution)"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Add to chat button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddToChat}
                disabled={capturing}
                className="text-accent hover:bg-accent/10"
                title={t('boxplot.addToChat')}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </div>

            {/* Resize controls */}
            <div className="flex items-center gap-1 ml-1 border-l border-border pl-2">
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
          {/* Plotly Chart Container */}
          <div className="w-full relative" style={{ height: `${chartHeight}px` }}>
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

      {/* Helper Modal for Chart Customization */}
      {isCustomizing && (
        <ChartCustomizationDialog
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          groups={Object.keys(data.groups)}
          groupMappings={groupMappings}
          onClose={() => setIsCustomizing(false)}
          onSave={handleUpdateConfig}
        />
      )}
    </>
  )
}

// ----------------------------------------------------------------------------
// Chart Customization Dialog (Axis Titles & Group Names)
// ----------------------------------------------------------------------------
function ChartCustomizationDialog({
  xAxisLabel,
  yAxisLabel,
  groups,
  groupMappings,
  onClose,
  onSave,
}: {
  xAxisLabel: string
  yAxisLabel: string
  groups: string[]
  groupMappings: Record<string, string>
  onClose: () => void
  onSave: (
    xAxisLabel: string,
    yAxisLabel: string,
    newGroupMappings: Record<string, string>,
    applyAxisGlobal: boolean
  ) => void
}) {
  const [xLabel, setXLabel] = useState(xAxisLabel)
  const [yLabel, setYLabel] = useState(yAxisLabel)
  const [mappings, setMappings] = useState<Record<string, string>>({ ...groupMappings })
  const [applyGlobal, setApplyGlobal] = useState(false)


  const handleGroupRename = (original: string, newName: string) => {
    setMappings((prev) => ({
      ...prev,
      [original]: newName,
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface-raised border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-semibold text-text-primary">Customize Chart</h3>
          <p className="text-sm text-text-secondary">Edit axis titles and rename groups</p>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Axis Titles Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-accent uppercase tracking-wider">Axis Titles</h4>
            <div className="grid gap-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">X-Axis Title</label>
                <input
                  type="text"
                  value={xLabel}
                  onChange={(e) => setXLabel(e.target.value)}
                  className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">Y-Axis Title</label>
                <input
                  type="text"
                  value={yLabel}
                  onChange={(e) => setYLabel(e.target.value)}
                  className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={applyGlobal}
                  onChange={(e) => setApplyGlobal(e.target.checked)}
                  className="rounded border-border bg-surface-overlay text-accent focus:ring-accent"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  Apply axis titles to all plots
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-border my-2"></div>

          {/* Group Renaming Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-accent uppercase tracking-wider">Group Names</h4>
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                  <span className="text-sm text-text-secondary truncate text-right" title={group}>
                    {group}
                  </span>
                  <span className="text-text-muted">→</span>
                  <input
                    type="text"
                    value={mappings[group] ?? group}
                    onChange={(e) => handleGroupRename(group, e.target.value)}
                    className="bg-surface-overlay border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-w-0"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted italic">
              Renaming groups only affects this specific chart.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-surface-raised rounded-b-xl flex justify-end gap-2 flex-shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(xLabel, yLabel, mappings, applyGlobal)}>
            Save Changes
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Plot from 'react-plotly.js'
import { BarChart3, ChevronDown, ChevronUp, Settings2, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { FilePreview } from '@/types'
import type { Data } from 'plotly.js'

interface PreAnalysisVisualizerProps {
    preview: FilePreview
}

type PlotData =
    | {
        type: 'distribution'
        data: { val: number; group: string }[]
        groups: string[]
        stats: {
            min: number
            max: number
            mean: number
            median: number
            zeros: number
            n: number
        }
    }
    | {
        type: 'profiles'
        samples: Record<string, string>[]
        groups: string[]
        vars: string[]
    }

export function PreAnalysisVisualizer({ preview }: PreAnalysisVisualizerProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [selectedVar, setSelectedVar] = useState<string>('')
    const [selectedGroup, setSelectedGroup] = useState<string>('')
    const [vizMode, setVizMode] = useState<'distribution' | 'profiles'>('distribution')

    // Initialize selected variable
    useEffect(() => {
        if (preview.variableNames.length > 0 && !selectedVar) {
            setSelectedVar(preview.variableNames[0])
        }
    }, [preview.variableNames, selectedVar])

    // Get data for plotting
    const plotData = useMemo<PlotData | null>(() => {
        if (!preview.previewRows) return null

        if (vizMode === 'distribution') {
            if (!selectedVar) return null
            const data = preview.previewRows.map(row => ({
                val: parseFloat(row[selectedVar]),
                group: selectedGroup ? row[selectedGroup] : 'All'
            })).filter(d => !isNaN(d.val))

            const groups = [...new Set(data.map(d => d.group))].sort()

            // Calculate stats
            const values = data.map(d => d.val)
            const stats = {
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
                zeros: values.filter(v => v === 0).length,
                n: values.length
            }

            return { type: 'distribution', data, groups, stats }
        } else {
            // Profiles Mode
            // Limit to 500 samples for performance
            const samplesToUse = preview.previewRows.slice(0, 500)

            // Determine unique groups for coloring
            const groups = selectedGroup
                ? [...new Set(samplesToUse.map(r => r[selectedGroup]))].sort()
                : ['All']

            return {
                type: 'profiles',
                samples: samplesToUse,
                groups,
                vars: preview.variableNames
            }
        }
    }, [preview.previewRows, selectedVar, selectedGroup, vizMode, preview.variableNames])

    if (!preview.variableNames.length) return null

    // Helper to generate plotly data
    const getPlotlyData = (): Data[] => {
        if (!plotData) return []

        if (plotData.type === 'distribution') {
            if (selectedGroup) {
                // Boxplot by Group
                return plotData.groups.map(g => ({
                    y: plotData.data.filter(d => d.group === g).map(d => d.val),
                    type: 'box',
                    name: String(g),
                    boxpoints: 'outliers',
                    marker: { opacity: 0.7 }
                } as Data))
            } else {
                // Histogram
                return [{
                    x: plotData.data.map(d => d.val),
                    type: 'histogram',
                    opacity: 0.7,
                    marker: { color: '#0ea5e9' },
                    name: 'Distribution'
                } as Data]
            }
        } else {
            // Profiles Mode
            return plotData.samples.map((sample, i) => {
                const groupName = selectedGroup ? sample[selectedGroup] : 'All'
                const sampleId = `Sample ${i + 1}`

                // Explicitly cast to any to avoid complex union type errors with react-plotly.js
                return {
                    x: plotData.vars,
                    y: plotData.vars.map(v => parseFloat(sample[v] || '0')),
                    type: 'scattergl',
                    mode: 'lines',
                    name: String(groupName),
                    legendgroup: String(groupName),
                    showlegend: i === 0 || (selectedGroup && plotData.samples.findIndex(s => (selectedGroup ? s[selectedGroup] : 'All') === groupName) === i),
                    line: {
                        width: 1,
                        opacity: 0.5
                    },
                    hoverinfo: 'x+y+text',
                    text: `Sample: ${sampleId}<br>Group: ${groupName}`
                } as any
            })
        }
    }

    return (
        <div className="card mb-6 border-l-4 border-l-accent">
            <div
                className="card-header cursor-pointer hover:bg-surface-raised transition-colors flex items-center justify-between"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                        <BarChart3 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-primary">{t('pre.title')}</h3>
                        <p className="text-sm text-text-secondary">
                            {t('pre.description')
                                .replace('{{count}}', String(preview.numVariables))
                                .replace('{{samples}}', String(preview.numSamples))}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon-sm">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="card-content border-t border-border">
                            {/* Mode Toggle */}
                            <div className="flex border-b border-border mb-6">
                                <button
                                    onClick={() => setVizMode('distribution')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                        vizMode === 'distribution'
                                            ? "border-accent text-accent"
                                            : "border-transparent text-text-secondary hover:text-text-primary"
                                    )}
                                >
                                    Univariate Distribution
                                </button>
                                <button
                                    onClick={() => setVizMode('profiles')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                        vizMode === 'profiles'
                                            ? "border-accent text-accent"
                                            : "border-transparent text-text-secondary hover:text-text-primary"
                                    )}
                                >
                                    Sample Profiles (All Vars)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                                {/* Controls */}
                                <div className="space-y-6">
                                    {/* Variable Select - Only for Distribution */}
                                    {vizMode === 'distribution' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                                                <Settings2 className="h-3.5 w-3.5" />
                                                {t('pre.variable')}
                                            </label>
                                            <select
                                                className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                value={selectedVar}
                                                onChange={(e) => setSelectedVar(e.target.value)}
                                            >
                                                {preview.variableNames.map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Group Select - For Both */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                                            <Settings2 className="h-3.5 w-3.5" />
                                            {t('pre.grouping')}
                                        </label>
                                        <select
                                            className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                            value={selectedGroup}
                                            onChange={(e) => setSelectedGroup(e.target.value)}
                                        >
                                            <option value="">{t('pre.noGrouping')}</option>
                                            {preview.metadataColumns.map(c => (
                                                <option key={c.name} value={c.name}>
                                                    {c.name} ({c.uniqueCount})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Stats Panel - Only Distribution */}
                                    {vizMode === 'distribution' && plotData?.type === 'distribution' && (
                                        <div className="bg-surface-overlay rounded-lg p-4 space-y-3">
                                            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                                {t('pre.stats')}
                                            </h4>
                                            <StatRow label="Mean" value={plotData.stats.mean.toFixed(2)} />
                                            <StatRow label="Median" value={plotData.stats.median.toFixed(2)} />
                                            <StatRow label="Min / Max" value={`${plotData.stats.min.toFixed(2)} / ${plotData.stats.max.toFixed(2)}`} />
                                            <StatRow label="Zeros" value={`${plotData.stats.zeros} (${(plotData.stats.zeros / plotData.stats.n * 100).toFixed(1)}%)`} />
                                        </div>
                                    )}

                                    <div className="text-xs text-text-muted flex items-start gap-2 bg-warning/5 p-2 rounded border border-warning/10">
                                        <Info className="h-3.5 w-3.5 text-warning/70 mt-0.5" />
                                        <p>Visualizing {vizMode === 'profiles' ? `up to 500 samples` : `first ${Math.min(1000, preview.numSamples)} samples`}.</p>
                                    </div>
                                </div>

                                {/* Plot Area */}
                                <div className="lg:col-span-3 min-h-[400px] bg-surface-raised rounded-lg border border-border p-1 relative">
                                    {plotData ? (
                                        <Plot
                                            data={getPlotlyData()}
                                            layout={{
                                                autosize: true,
                                                margin: { l: 50, r: 20, t: 30, b: 40 },
                                                paper_bgcolor: 'transparent',
                                                plot_bgcolor: 'transparent',
                                                font: { color: '#94a3b8' },
                                                xaxis: {
                                                    title: { text: vizMode === 'distribution' ? selectedVar : 'Variables' },
                                                    gridcolor: '#334155',
                                                    zerolinecolor: '#475569'
                                                },
                                                yaxis: {
                                                },
                                                showlegend: !!selectedGroup,
                                                legend: { orientation: 'h', y: 1.1 }
                                            }}
                                            useResizeHandler
                                            className="w-full h-full min-h-[400px]"
                                            config={{ displayModeBar: false }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-text-muted">
                                            No data available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function StatRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-text-secondary">{label}</span>
            <span className="font-mono text-text-primary">{value}</span>
        </div>
    )
}

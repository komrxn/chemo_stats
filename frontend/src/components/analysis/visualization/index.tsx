import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { FilePreview } from '@/types'
import type { Data, Layout as PlotlyLayout } from 'plotly.js'

import { PlotConfig } from './types'
import { DEFAULT_CONFIG } from './constants'
import { PropertyInspector } from './components/PropertyInspector'
import { PlotPreview } from './components/PlotPreview'
import { resolveGroupValue } from '@/lib/grouping'
import { generateScatterTrace, generateLineTrace, generateHistogramTrace, generateBoxTrace, generatePieTrace, generateStemTrace } from './utils/generators'

interface DataVisualizationProps {
    preview: FilePreview
}

export function DataVisualization({ preview }: DataVisualizationProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [config, setConfig] = useState<PlotConfig>(DEFAULT_CONFIG)

    // Initialize defaults when preview loads
    useEffect(() => {
        if (preview.variableNames.length > 0 && !config.xVariable) {
            setConfig(prev => ({
                ...prev,
                xVariable: preview.variableNames[0],
                yVariable: preview.variableNames[1] || ''
            }))
        }
    }, [preview, config.xVariable])

    // Update labels when variables change
    useEffect(() => {
        setConfig(prev => ({
            ...prev,
            title: `${prev.type.charAt(0).toUpperCase() + prev.type.slice(1)} Plot`,
            xLabel: prev.xVariable,
            yLabel: prev.type === 'histogram' ? 'Count' : prev.yVariable
        }))
    }, [config.xVariable, config.yVariable, config.type])


    // --- Data Generation Logic ---
    // --- Data Generation Logic ---
    const { plotData, allValues } = useMemo(() => {
        if (!preview.previewRows || !config.xVariable) return { plotData: [], allValues: [] }
        if (config.type !== 'histogram' && config.type !== 'pie' && !config.yVariable) return { plotData: [], allValues: [] }

        const rows = preview.previewRows

        // Helper to get group
        const getGroup = (row: any) => {
            if (!config.groupVariable) return 'Data'
            return resolveGroupValue(row, config.groupVariable, preview.metadataColumns)
        }

        // --- PIE CHART SPECIAL HANDLING ---
        if (config.type === 'pie') {
            if (!config.groupVariable || !config.xVariable) return { plotData: [], allValues: [] }

            const groupSums: Record<string, number> = {}
            rows.forEach(r => {
                const g = getGroup(r)
                // Use X Variable as the VALUE to sum
                const val = parseFloat(r[config.xVariable])
                if (!isNaN(val)) {
                    groupSums[g] = (groupSums[g] || 0) + val
                }
            })

            const labels = Object.keys(groupSums).sort()
            const values = labels.map(l => groupSums[l])

            return {
                plotData: [generatePieTrace({ config, labels, values })],
                allValues: values
            }
        }

        // --- OTHER PLOTS ---
        const groups = [...new Set(rows.map(r => getGroup(r)))].sort()
        const collectedValues: number[] = []

        const traces = groups.map(group => {
            const groupRows = rows.filter(r => getGroup(r) === group)
            const x = groupRows.map(r => r[config.xVariable])
            const y = config.type !== 'histogram' ? groupRows.map(r => parseFloat(r[config.yVariable])) : []

            const params = { config, x, y, groupName: String(group) }

            // Collect values for stats
            if (config.type === 'histogram') {
                // For histogram, we analyze the distribution of X (or Y if horizontal)
                const vals = x.map(v => parseFloat(v)).filter(v => !isNaN(v))
                collectedValues.push(...vals)
            } else {
                const vals = y.filter(v => !isNaN(v))
                collectedValues.push(...vals)
            }

            if (config.type === 'scatter') return generateScatterTrace(params)
            if (config.type === 'line') return generateLineTrace(params)
            if (config.type === 'stem') return generateStemTrace(params)
            if (config.type === 'box') return generateBoxTrace(params)
            if (config.type === 'histogram') {
                return generateHistogramTrace({ config, x: config.orientation === 'v' ? x : y, groupName: String(group) })
            }

            return {} as Data
        })

        return { plotData: traces, allValues: collectedValues }
    }, [preview.previewRows, config])


    // --- Layout Generation ---
    const layout = useMemo<Partial<PlotlyLayout>>(() => ({
        autosize: true,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { family: 'Plus Jakarta Sans', color: '#94a3b8' },
        margin: { l: 60, r: 20, t: 60, b: 100 },
        showlegend: config.showLegend,
        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
        title: { text: config.title, font: { size: 18, color: '#f8fafc' }, y: 0.95 },
        xaxis: config.type === 'pie' ? { visible: false } : {
            title: { text: config.xLabel, standoff: 20 },
            gridcolor: config.showGrid ? '#334155' : 'transparent',
            zerolinecolor: '#475569',
        },
        yaxis: config.type === 'pie' ? { visible: false } : {
            title: { text: config.yLabel },
            gridcolor: config.showGrid ? '#334155' : 'transparent',
            zerolinecolor: '#475569'
        },
        barmode: 'overlay'
    }), [config])

    const updateConfig = (key: keyof PlotConfig | string, value: any) => {
        // @ts-ignore
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="card mb-6 border-l-4 border-l-violet-500">
            <div
                className="card-header cursor-pointer hover:bg-surface-raised transition-colors flex items-center justify-between"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <Activity className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-primary">Advanced Data Visualization</h3>
                        <p className="text-sm text-text-secondary">
                            MATLAB-style plotting with full property control
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
                        <div className="card-content border-t border-border p-0 flex flex-col lg:flex-row h-[600px] relative">
                            <PropertyInspector
                                preview={preview}
                                config={config}
                                updateConfig={updateConfig}
                                statsData={allValues}
                            />
                            <div className="flex-1 relative">
                                <PlotPreview plotData={plotData} layout={layout} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

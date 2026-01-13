
export type PlotType = 'scatter' | 'line' | 'histogram' | 'box' | 'pie' | 'stem'

export interface PlotConfig {
    // Data
    type: PlotType
    xVariable: string
    yVariable: string
    groupVariable: string

    // Appearance - Scatter/Line/Stem
    markerSymbol: string
    markerSize: number
    markerColor: string // 'auto' or hex
    markerFilled: boolean
    lineStyle: string // 'solid', 'dash', 'dot', 'dashdot'
    lineWidth: number
    alpha: number

    // Appearance - Histogram
    normalization: '' | 'percent' | 'probability' | 'probability density'
    bins: number | 'auto'
    orientation: 'v' | 'h'
    displayStyle: 'bar' | 'stairs'

    // Appearance - Box
    boxNotch: boolean
    boxWhiskerWidth: number // 0-1
    showOutliers: boolean

    // Appearance - Pie
    pieHole: number // 0-1 (0=pie, >0=donut)

    // Layout
    title: string
    xLabel: string
    yLabel: string
    showGrid: boolean
    showLegend: boolean

    // Customization
    groupMarkers?: Record<string, string>
}

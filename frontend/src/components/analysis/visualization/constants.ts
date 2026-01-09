import { PlotConfig } from './types'

export const DEFAULT_CONFIG: PlotConfig = {
    type: 'scatter',
    xVariable: '',
    yVariable: '',
    groupVariable: '',

    markerSymbol: 'circle',
    markerSize: 8,
    markerColor: 'auto',
    markerFilled: true,
    lineStyle: 'solid',
    lineWidth: 2,
    alpha: 0.8,

    normalization: '',
    bins: 'auto',
    orientation: 'v',
    displayStyle: 'bar',

    boxNotch: false,
    boxWhiskerWidth: 0.5,
    showOutliers: true,

    pieHole: 0,

    title: 'Plot Title',
    xLabel: '',
    yLabel: '',
    showGrid: true,
    showLegend: true
}

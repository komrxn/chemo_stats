import type { Data } from 'plotly.js'
import { PlotConfig } from '../types'

interface GenerateTraceParams {
    config: PlotConfig
    x: any[]
    y: any[]
    groupName: string
}

export function generateScatterTrace({ config, x, y, groupName }: GenerateTraceParams): Partial<Data> {
    return {
        name: groupName,
        opacity: config.alpha,
        x, y,
        mode: 'markers',
        type: 'scattergl',
        marker: {
            symbol: config.markerSymbol + (config.markerFilled ? '' : '-open'),
            size: config.markerSize,
            color: config.markerColor === 'auto' ? undefined : config.markerColor,
            line: {
                width: config.markerFilled ? 0 : 2,
                color: config.markerColor === 'auto' ? undefined : config.markerColor
            }
        }
    }
}

export function generateLineTrace({ config, x, y, groupName }: GenerateTraceParams): Partial<Data> {
    return {
        name: groupName,
        opacity: config.alpha,
        x, y,
        mode: config.markerSymbol !== 'none' ? 'lines+markers' : 'lines',
        type: 'scattergl',
        line: {
            dash: config.lineStyle as any,
            width: config.lineWidth,
            color: config.markerColor === 'auto' ? undefined : config.markerColor
        },
        marker: {
            symbol: config.markerSymbol,
            size: config.markerSize,
        }
    }
}

export function generateHistogramTrace({ config, x, groupName }: Omit<GenerateTraceParams, 'y'>): Partial<Data> {
    return {
        name: groupName,
        opacity: 0.7,
        x: config.orientation === 'v' ? x : undefined,
        y: config.orientation === 'h' ? x : undefined,
        type: 'histogram',
        histnorm: config.normalization,
        orientation: config.orientation,
        marker: {
            color: config.markerColor === 'auto' ? undefined : config.markerColor,
            line: { width: 1, color: '#333' }
        },
        nbinsx: config.bins !== 'auto' ? Number(config.bins) : undefined
    } as any as Data
}

export function generateBoxTrace({ config, x, groupName }: GenerateTraceParams): Partial<Data> {
    return {
        name: groupName,
        // Box plot orientation: 'h' = x is values, y is group. 'v' = y is values, x is group.
        // In our data model, 'x' and 'y' passed here are data vectors.
        // We usually map: 
        //   Vertical: y = data, x = groupName (handled by name/transforms or just x=[groupName...])
        //   Horizontal: x = data, y = groupName
        // Plotly simplified: 
        y: config.orientation === 'v' ? x : undefined,
        x: config.orientation === 'h' ? x : undefined,
        type: 'box',
        boxpoints: config.showOutliers ? 'outliers' : false,
        notched: config.boxNotch,
        marker: {
            color: config.markerColor === 'auto' ? undefined : config.markerColor,
            size: config.markerSize, // outlier size
            symbol: config.markerSymbol
        },
        line: {
            width: config.lineWidth
        },
        fillcolor: config.alpha < 1 ? undefined : undefined, // let plotly handle or use opacity property
        opacity: config.alpha
    } as any
}

export function generatePieTrace({ config, labels, values }: { config: PlotConfig, labels: string[], values: number[] }): Partial<Data> {
    return {
        type: 'pie',
        labels: labels,
        values: values,
        hole: config.pieHole,
        textinfo: 'label+percent',
        opacity: config.alpha,
        marker: {
            // standard colors array if needed, else auto
        }
    } as any
}

export function generateStemTrace({ config, x, y, groupName }: GenerateTraceParams): Partial<Data> {
    // Stem plot: Scatter markers + ErrorBar Hack for lines to zero
    return {
        x: x,
        y: y,
        type: 'scattergl',
        mode: 'markers',
        name: groupName,
        opacity: config.alpha,
        marker: {
            symbol: config.markerSymbol,
            size: config.markerSize,
            color: config.markerColor === 'auto' ? undefined : config.markerColor,
            line: {
                width: config.markerFilled ? 0 : 2,
                color: config.markerColor === 'auto' ? undefined : config.markerColor
            }
        },
        error_y: {
            type: 'data',
            symmetric: false,
            array: [],
            arrayminus: y, // draws line from y down to 0
            visible: true,
            width: 0,
            color: config.markerColor === 'auto' ? undefined : config.markerColor,
            thickness: config.lineWidth
        }
    } as any
}

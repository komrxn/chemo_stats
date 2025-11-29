/**
 * Export utilities for ANOVA results
 * Creates ZIP with Excel + PNG boxplots + original file
 */
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
// @ts-ignore - no types for plotly.js-dist-min
import Plotly from 'plotly.js-dist-min'
import type { AnovaResults, BoxplotVariable } from '@/types'

interface ExportData {
  results: AnovaResults
  filename: string
  originalFile?: File
  designLabel: string
}

/**
 * Export ANOVA results as ZIP archive
 */
export async function exportAnovaResults(data: ExportData): Promise<void> {
  const zip = new JSZip()
  const timestamp = new Date().toISOString().slice(0, 10)
  const folderName = `ANOVA_${data.filename}_${timestamp}`

  // 1. Generate Excel file
  const excelBuffer = generateExcelFile(data.results, data.designLabel)
  zip.file(`${folderName}/ANOVA_Results.xlsx`, excelBuffer)

  // 2. Generate PNG boxplots with p-values
  const boxplotPngs = await generateBoxplotPngs(data.results.boxplotData, data.results.results)
  const boxplotsFolder = zip.folder(`${folderName}/boxplots`)
  
  for (const [name, pngData] of Object.entries(boxplotPngs)) {
    boxplotsFolder?.file(`${name}.png`, pngData, { base64: true })
  }

  // 3. Add original file if available
  if (data.originalFile) {
    const fileData = await data.originalFile.arrayBuffer()
    zip.file(`${folderName}/${data.originalFile.name}`, fileData)
  }

  // 4. Generate README
  const readme = generateReadme(data)
  zip.file(`${folderName}/README.txt`, readme)

  // Download ZIP
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${folderName}.zip`)
}

/**
 * Generate Excel file with ANOVA results (like MATLAB output)
 */
function generateExcelFile(results: AnovaResults, designLabel: string): ArrayBuffer {
  const wb = XLSX.utils.book_new()

  // Sheet 1: ANOVA_TABLE_KKH
  const anovaData = [
    ['VariableIndex', 'Variable', 'P-Nominal', 'P_FDR', 'P_Bonferroni', 'Effect size (%)', 'F-stat', 'Significant (BH)'],
    ...results.results.map((r, i) => [
      i + 1,
      r.variable,
      r.pValue,
      r.fdr,
      r.bonferroni,
      r.effectSize,
      r.fStat,
      r.benjamini ? 'YES' : 'NO'
    ])
  ]
  const wsAnova = XLSX.utils.aoa_to_sheet(anovaData)
  XLSX.utils.book_append_sheet(wb, wsAnova, 'ANOVA_TABLE_KKH')

  // Sheet 2: SUMMARY
  const summaryData = [
    ['Analysis Summary'],
    [''],
    ['Design Label', designLabel],
    ['Total Variables', results.summary.totalVariables],
    ['Benjamini Significant', results.summary.benjaminiSignificant],
    ['Bonferroni Significant', results.summary.bonferroniSignificant],
    ['Nominal Significant (p<0.05)', results.summary.nominalSignificant],
    ['Number of Groups', results.summary.numGroups],
    [''],
    ['Thresholds'],
    ['Nominal', results.overviewData.nominalThreshold],
    ['Benjamini', results.overviewData.benjaminiThreshold],
    ['Bonferroni', results.overviewData.bonferroniThreshold],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'SUMMARY')

  // Sheet 3: BOXPLOT_STATS
  const boxplotHeaders = ['Variable', 'Group', 'N', 'Min', 'Q1', 'Median', 'Q3', 'Max', 'IQR']
  const boxplotRows: (string | number)[][] = [boxplotHeaders]
  
  Object.entries(results.boxplotData).forEach(([_, varData]) => {
    Object.entries(varData.groups).forEach(([groupName, stats]) => {
      boxplotRows.push([
        varData.variableName,
        groupName,
        stats.n,
        stats.min,
        stats.q1,
        stats.median,
        stats.q3,
        stats.max,
        stats.q3 - stats.q1
      ])
    })
  })
  
  const wsBoxplot = XLSX.utils.aoa_to_sheet(boxplotRows)
  XLSX.utils.book_append_sheet(wb, wsBoxplot, 'BOXPLOT_STATS')

  // Sheet 4: SIGNIFICANT_VARS
  const sigVars = results.results.filter(r => r.benjamini)
  const sigData = [
    ['Significant Variables (Benjamini-Hochberg)'],
    [''],
    ['Rank', 'Variable', 'P-value', 'FDR', 'Effect Size (%)'],
    ...sigVars.map((r, i) => [i + 1, r.variable, r.pValue, r.fdr, r.effectSize])
  ]
  const wsSig = XLSX.utils.aoa_to_sheet(sigData)
  XLSX.utils.book_append_sheet(wb, wsSig, 'SIGNIFICANT_VARS')

  // Write to buffer
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return buffer
}

/**
 * Generate PNG images for all boxplots with p-value and FDR annotations
 */
async function generateBoxplotPngs(
  boxplotData: Record<string, BoxplotVariable>,
  anovaResults: { variable: string; pValue: number; fdr: number; benjamini: boolean }[]
): Promise<Record<string, string>> {
  const pngs: Record<string, string> = {}
  
  const COLORS = [
    '#2dd4bf', '#a78bfa', '#fb923c', '#4ade80', '#f472b6', '#38bdf8'
  ]

  // Create lookup map for p-values
  const pValueMap = new Map(anovaResults.map(r => [r.variable, r]))

  for (const [, data] of Object.entries(boxplotData)) {
    // Get p-value and FDR for this variable
    const stats = pValueMap.get(data.variableName)
    const pValue = stats?.pValue ?? null
    const fdr = stats?.fdr ?? null
    const isSignificant = stats?.benjamini ?? false

    // Create temporary container
    const container = document.createElement('div')
    container.style.width = '1200px'
    container.style.height = '800px'
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    document.body.appendChild(container)

    const groupNames = Object.keys(data.groups)
    const traces: Plotly.Data[] = groupNames.map((groupName, idx) => {
      const groupStats = data.groups[groupName]
      const color = COLORS[idx % COLORS.length]
      
      return {
        type: 'box',
        name: groupName,
        y: groupStats.values,
        boxpoints: 'all',
        jitter: 0.4,
        pointpos: 0,
        marker: {
          color: color,
          size: 8,
          opacity: 0.7,
        },
        line: { color: color, width: 2 },
        fillcolor: `${color}40`,
      }
    })

    // Format p-value for display
    const formatP = (p: number | null) => {
      if (p === null) return 'N/A'
      if (p < 0.0001) return '<0.0001'
      return p.toFixed(4)
    }

    // Build title with stats
    const sigLabel = isSignificant ? ' ★ SIGNIFICANT' : ''
    const titleText = `<b>${data.variableName}</b>${sigLabel}<br><span style="font-size:14px">p-value: ${formatP(pValue)} | FDR: ${formatP(fdr)}</span>`

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: titleText,
        font: { size: 20, color: '#1a1d23' },
        y: 0.95,
      },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#f8fafc',
      font: { family: 'Arial, sans-serif', color: '#334155' },
      showlegend: true,
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.12 },
      margin: { l: 80, r: 40, t: 100, b: 100 },
      xaxis: {
        title: { text: 'Group', font: { size: 14 } },
        showgrid: false,
        showline: true,
        linecolor: '#cbd5e1',
      },
      yaxis: {
        title: { text: 'Value', font: { size: 14 } },
        showgrid: true,
        gridcolor: '#e2e8f0',
        showline: true,
        linecolor: '#cbd5e1',
      },
      // Add annotation for significance
      annotations: isSignificant ? [{
        text: '✓ Benjamini-Hochberg Significant',
        xref: 'paper',
        yref: 'paper',
        x: 1,
        y: 1.08,
        showarrow: false,
        font: { size: 12, color: '#16a34a' },
        xanchor: 'right',
      }] : [],
    }

    await Plotly.newPlot(container, traces, layout, { staticPlot: true })

    // Export to PNG
    const imgData = await Plotly.toImage(container, {
      format: 'png',
      width: 1200,
      height: 800,
      scale: 2 // High resolution
    })

    // Remove data URL prefix
    const base64Data = imgData.replace(/^data:image\/png;base64,/, '')
    pngs[data.variableName.replace(/[^a-zA-Z0-9_-]/g, '_')] = base64Data

    // Cleanup
    Plotly.purge(container)
    document.body.removeChild(container)
  }

  return pngs
}

/**
 * Generate README file
 */
function generateReadme(data: ExportData): string {
  const date = new Date().toLocaleString()
  const sig = data.results.summary.benjaminiSignificant
  const total = data.results.summary.totalVariables
  
  return `
ANOVA Analysis Export
=====================
Generated: ${date}
Original File: ${data.filename}
Design Label: ${data.designLabel}

Summary
-------
Total Variables: ${total}
Significant (Benjamini-Hochberg): ${sig} (${((sig/total)*100).toFixed(1)}%)
Significant (Bonferroni): ${data.results.summary.bonferroniSignificant}
Number of Groups: ${data.results.summary.numGroups}

Contents
--------
- ANOVA_Results.xlsx : Complete analysis results
- boxplots/ : High-resolution PNG boxplots for significant variables
- ${data.originalFile?.name || 'original_data'} : Original data file

Sheets in Excel:
1. ANOVA_TABLE_KKH - Main results with p-values, FDR, effect sizes
2. SUMMARY - Analysis summary and thresholds
3. BOXPLOT_STATS - Descriptive statistics for all groups
4. SIGNIFICANT_VARS - List of significant variables

Notes
-----
- P-values corrected using Benjamini-Hochberg FDR method
- Bonferroni correction also provided for comparison
- Effect size calculated as eta-squared (%)
`.trim()
}


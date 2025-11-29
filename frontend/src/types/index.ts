// Project & File Management
export interface Project {
  id: string
  name: string
  createdAt: Date
  tables: Table[]
  folders: Folder[]
}

export interface Folder {
  id: string
  name: string
  parentId: string | null // null = root level
  tables: Table[]
  folders: Folder[]
  createdAt: Date
}

export interface Table {
  id: string
  name: string
  filename: string
  createdAt: Date
  file?: File
  preview?: FilePreview
  analysis?: AnalysisState
}

export interface FilePreview {
  triggerFound: boolean
  triggerColumn: string | null
  metadataColumns: MetadataColumn[]
  variableNames: string[]
  numSamples: number
  numVariables: number
  previewRows?: Record<string, string>[]
}

export interface MetadataColumn {
  name: string
  uniqueCount: number
  sampleValues: (string | number)[]
}

// Analysis
export type AnalysisMethod = 'anova' | 'pca'

export interface AnalysisConfig {
  method: AnalysisMethod
  classColumn: string
  fdrThreshold: number
  designLabel: string
  plotOption: number
  numPcs: number
  scalingMethod: 'auto' | 'mean' | 'pareto'
}

export interface AnalysisState {
  status: 'idle' | 'running' | 'complete' | 'error'
  method: AnalysisMethod | null
  results: AnovaResults | PcaResults | null
  error: string | null
}

export interface AnovaResults {
  type: 'anova'
  results: AnovaRow[]
  summary: {
    totalVariables: number
    benjaminiSignificant: number
    bonferroniSignificant: number
    nominalSignificant: number
    numGroups: number
  }
  boxplotData: Record<string, BoxplotVariable>
  overviewData: OverviewData
}

export interface AnovaRow {
  variable: string
  pValue: number
  fdr: number
  bonferroni: number
  benjamini: boolean
  effectSize: number
  fStat: number
}

export interface BoxplotVariable {
  variableName: string
  groups: Record<string, BoxplotStats>
  yLimits: { min: number; max: number }
}

export interface BoxplotStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  values: number[]
  n: number
}

export interface OverviewData {
  pValuesSorted: number[]
  benjaminiIndices: number[]
  bonferroniIndices: number[]
  bonferroniThreshold: number
  benjaminiThreshold: number
  nominalThreshold: number
}

export interface PcaResults {
  type: 'pca'
  scores: number[][]
  loadings: number[][]
  explainedVariance: number[]
  summary: {
    totalVarianceExplained: number
  }
}

// Chat
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}


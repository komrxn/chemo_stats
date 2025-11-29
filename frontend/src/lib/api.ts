const API_URL = import.meta.env.VITE_API_URL || ''

interface ApiError {
  detail: string
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail)
  }
  return response.json()
}

export const api = {
  async previewFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_URL}/api/preview`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<PreviewResponse>(response)
  },

  async runAnova(file: File, params: AnovaParams) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_column', params.classColumn)
    formData.append('fdr_threshold', params.fdrThreshold.toString())
    formData.append('design_label', params.designLabel)
    formData.append('plot_option', params.plotOption.toString())

    const response = await fetch(`${API_URL}/api/analyze/anova`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<AnovaResponse>(response)
  },

  async runPca(file: File, params: PcaParams) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('num_pcs', params.numPcs.toString())
    formData.append('scaling_method', params.scalingMethod)
    formData.append('design_label', params.designLabel)

    const response = await fetch(`${API_URL}/api/analyze/pca`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<PcaResponse>(response)
  },

  async exportAnova(data: AnovaResponse) {
    const response = await fetch(`${API_URL}/api/export/anova`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Export failed')
    }

    return response.blob()
  },

  async chat(message: string, context: AnalysisContext | null) {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    })
    return handleResponse<ChatResponse>(response)
  },
}

// Types
export interface PreviewResponse {
  trigger_found: boolean
  trigger_column: string | null
  metadata_columns: MetadataColumn[]
  variable_names: string[]
  num_samples: number
  num_variables: number
  preview_rows?: Record<string, string>[]
  all_columns?: string[]
}

export interface MetadataColumn {
  name: string
  unique_count: number
  sample_values: (string | number)[]
}

export interface AnovaParams {
  classColumn: string
  fdrThreshold: number
  designLabel: string
  plotOption: number
}

export interface PcaParams {
  numPcs: number
  scalingMethod: 'auto' | 'mean' | 'pareto'
  designLabel: string
}

export interface AnovaResult {
  variable: string
  pValue: number
  fdr: number
  bonferroni: number
  benjamini: boolean
  effectSize: number
  fStat: number
}

export interface BoxplotGroup {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  values: number[]
  n: number
}

export interface BoxplotData {
  variable_name: string
  groups: Record<string, BoxplotGroup>
  y_limits: { min: number; max: number }
}

export interface AnovaResponse {
  results: AnovaResult[]
  multicomparison: unknown[]
  global_stats: Record<string, number[]>
  group_stats: Record<string, Record<string, number[]>>
  boxplot_data: Record<string, BoxplotData>
  overview_data: {
    p_values_sorted: number[]
    benjamini_indices: number[]
    bonferroni_indices: number[]
    bonferroni_threshold: number
    benjamini_threshold: number
    nominal_threshold: number
  }
  summary: {
    total_variables: number
    benjamini_significant: number
    bonferroni_significant: number
    nominal_significant: number
    num_groups: number
  }
  original_data?: number[][]
  classes?: number[]
  variable_names?: string[]
}

export interface PcaResponse {
  scores: number[][]
  loadings: number[][]
  explained_variance: number[]
  summary: {
    total_variance_explained: number
  }
}

export interface AnalysisContext {
  type: 'anova' | 'pca'
  results: AnovaResponse | PcaResponse
  filename: string
}

export interface ChatResponse {
  response: string
}


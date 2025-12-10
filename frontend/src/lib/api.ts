import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || ''

const axiosInstance = axios.create({
  baseURL: API_URL,
})

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export const api = {
  async previewFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    return axiosInstance.post<PreviewResponse>('/api/preview', formData) as unknown as Promise<PreviewResponse>
  },

  async runAnova(file: File, params: AnovaParams) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_column', params.classColumn)
    formData.append('fdr_threshold', params.fdrThreshold.toString())
    formData.append('design_label', params.designLabel)
    formData.append('plot_option', params.plotOption.toString())

    return axiosInstance.post<AnovaResponse>('/api/analyze/anova', formData) as unknown as Promise<AnovaResponse>
  },

  async runPca(file: File, params: PcaParams) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('num_pcs', params.numPcs.toString())
    formData.append('scaling_method', params.scalingMethod)
    formData.append('design_label', params.designLabel)

    return axiosInstance.post<PcaResponse>('/api/analyze/pca', formData) as unknown as Promise<PcaResponse>
  },

  async exportAnova(data: AnovaResponse) {
    const response = await axiosInstance.post('/api/export/anova', data, {
      responseType: 'blob'
    })
    return response as unknown as Blob
  },

  async chat(fileId: string, message: string, fileName?: string) {
    return axiosInstance.post<ChatResponse>('/api/chat', {
      file_id: fileId,
      message,
      file_name: fileName
    }) as unknown as Promise<ChatResponse>
  },

  async storeAnalysisContext(fileId: string, analysisType: string, results: unknown) {
    const formData = new FormData()
    formData.append('file_id', fileId)
    formData.append('analysis_type', analysisType)
    formData.append('results', JSON.stringify(results))

    return axiosInstance.post<{ status: string; message: string }>('/api/chat/context', formData) as unknown as Promise<{ status: string; message: string }>
  },

  async getChatHistory(fileId: string) {
    return axiosInstance.get<ChatHistoryResponse>(`/api/chat/history/${fileId}`) as unknown as Promise<ChatHistoryResponse>
  },

  async transcribeAudio(audioBlob: Blob) {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'audio.webm')

    return axiosInstance.post<{ text: string }>('/api/transcribe', formData) as unknown as Promise<{ text: string }>
  },

  // Auth Endpoints
  async register(email: string, password: string) {
    return axiosInstance.post<{ message: string, user_id: number }>('/api/auth/register', { email, password }) as unknown as Promise<{ message: string, user_id: number }>
  },

  async login(formData: FormData) {
    // OAuth2PasswordRequestForm expects form data
    return axiosInstance.post<{ access_token: string, token_type: string }>('/api/auth/token', formData) as unknown as Promise<{ access_token: string, token_type: string }>
  },

  async getMe() {
    return axiosInstance.get<User>('/api/auth/me') as unknown as Promise<User>
  },

  admin: {
    getUsers: () => axiosInstance.get<User[]>('/api/admin/users') as unknown as Promise<User[]>,
    approveUser: (userId: number) => axiosInstance.patch<User>(`/api/admin/users/${userId}/approve`, {}) as unknown as Promise<User>,
  }
}

// User Type
export interface User {
  id: number
  email: string
  is_active: boolean
  is_approved: boolean
  is_superuser: boolean
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
  file_id: string
}

export interface ChatHistoryResponse {
  history: { role: string; content: string }[]
  has_context: boolean
  context_type: string | null
}


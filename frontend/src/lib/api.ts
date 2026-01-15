import axios, { AxiosResponse } from 'axios'
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

// Fix the response interceptor to properly type the data extraction
axiosInstance.interceptors.response.use(
  <T = any>(response: AxiosResponse<T>) => response.data as T,
  (error) => {
    // Handle 401 Unauthorized globally
    if (error.response?.status === 401) {
      // Clear auth state (logout)
      useAuthStore.getState().logout()
      // Optional: Redirect to login page is handled by App.tsx observing auth state
    }

    const message = error.response?.data?.detail || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export const api = {
  async previewFile(file: File): Promise<PreviewResponse> {
    const formData = new FormData()
    formData.append('file', file)
    return axiosInstance.post('/api/preview', formData)
  },

  async runAnova(file: File, params: AnovaParams): Promise<AnovaResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_column', params.classColumn)
    formData.append('fdr_threshold', params.fdrThreshold.toString())
    formData.append('design_label', params.designLabel)
    formData.append('plot_option', params.plotOption.toString())
    return axiosInstance.post('/api/analyze/anova', formData)
  },

  async runPca(file: File, params: PcaParams): Promise<PcaResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('num_pcs', params.numPcs.toString())
    formData.append('scaling_method', params.scalingMethod)
    formData.append('design_label', params.designLabel)
    return axiosInstance.post('/api/analyze/pca', formData)
  },

  async exportAnova(data: AnovaResponse): Promise<Blob> {
    // Note: blob responseType requires type cast since axios returns different type
    const response = await axiosInstance.post('/api/export/anova', data, {
      responseType: 'blob'
    })
    return response as unknown as Blob
  },

  async chat(fileId: string, message: string, fileName?: string): Promise<ChatResponse> {
    return axiosInstance.post('/api/chat', {
      file_id: fileId,
      message,
      file_name: fileName
    })
  },

  async storeAnalysisContext(fileId: string, analysisType: string, results: unknown): Promise<{ status: string; message: string }> {
    const formData = new FormData()
    formData.append('file_id', fileId)
    formData.append('analysis_type', analysisType)
    formData.append('results', JSON.stringify(results))
    return axiosInstance.post('/api/chat/context', formData)
  },

  async getChatHistory(fileId: string): Promise<ChatHistoryResponse> {
    return axiosInstance.get(`/api/chat/history/${fileId}`)
  },

  async transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'audio.webm')
    return axiosInstance.post('/api/transcribe', formData)
  },

  // Auth Endpoints
  async register(email: string, password: string): Promise<{ message: string, user_id: number }> {
    return axiosInstance.post('/api/auth/register', { email, password })
  },

  async login(formData: FormData): Promise<{ access_token: string, token_type: string }> {
    // OAuth2PasswordRequestForm expects form data
    return axiosInstance.post('/api/auth/token', formData)
  },

  async getMe(): Promise<User> {
    return axiosInstance.get('/api/auth/me')
  },

  admin: {
    getUsers: (): Promise<User[]> => axiosInstance.get('/api/admin/users'),
    approveUser: (userId: number): Promise<User> => axiosInstance.patch(`/api/admin/users/${userId}/approve`, {}),
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
  raw_preview?: string[][]
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


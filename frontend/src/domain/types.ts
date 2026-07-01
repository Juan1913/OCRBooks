export type BookStatus =
  | 'uploading' | 'extracting' | 'processing' | 'compiling' | 'paused' | 'done' | 'error'

export type PageStatus = 'pending' | 'processing' | 'ocr_done' | 'error'

export type ProgressPhase =
  | 'extracting' | 'ocr' | 'compiling' | 'done' | 'error' | 'compile_error'

export interface BookSummary {
  id: string
  title: string
  status: BookStatus
  total_pages: number
  processed_pages: number
  created_at: string
}

export interface PageInfo {
  page_number: number
  status: PageStatus
  has_figures: boolean
  image_url: string | null
}

export interface BookDetail extends BookSummary {
  error_message: string | null
  pages: PageInfo[]
  storage_path?: string
  page_width_mm?: number | null
  page_height_mm?: number | null
}

export interface PageDetail {
  page_number: number
  status: PageStatus
  has_figures: boolean
  image_url: string
  markdown: string | null
  latex_override: string | null
  content: string | null
  error_message: string | null
}

export interface AIConfig {
  provider: string
  base_url: string
  model: string
  api_key: string
  vision: boolean
}

export interface AIStatus {
  configured: boolean
  provider: string
  model: string
}

export interface ProgressMessage {
  phase: ProgressPhase
  page?: number
  total?: number
  status?: string
  preview_url?: string
  image_url?: string
  pdf_url?: string
  message?: string
  error?: string
}

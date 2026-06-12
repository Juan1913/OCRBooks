import type { BookDetail, BookSummary } from '../../domain/types'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const bookApi = {
  list: (): Promise<BookSummary[]> =>
    request('/api/books'),

  get: (id: string): Promise<BookDetail> =>
    request(`/api/books/${id}`),

  upload: (file: File): Promise<{ id: string; title: string; status: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    return request('/api/books', { method: 'POST', body: fd })
  },

  compile: (id: string): Promise<{ status: string }> =>
    request(`/api/books/${id}/compile`, { method: 'POST' }),

  pause: (id: string): Promise<{ status: string }> =>
    request(`/api/books/${id}/pause`, { method: 'POST' }),

  resume: (id: string): Promise<{ status: string }> =>
    request(`/api/books/${id}/resume`, { method: 'POST' }),

  deleteBook: (id: string): Promise<{ status: string }> =>
    request(`/api/books/${id}`, { method: 'DELETE' }),

  downloadPdfUrl: (id: string): string =>
    `${BASE}/api/books/${id}/pdf`,
}

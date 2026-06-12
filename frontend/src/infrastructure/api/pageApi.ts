import type { PageDetail } from '../../domain/types'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const pageApi = {
  get: (bookId: string, pageNumber: number): Promise<PageDetail> =>
    request(`/api/books/${bookId}/pages/${pageNumber}`),

  updateLatex: (bookId: string, pageNumber: number, latex: string): Promise<{ status: string }> =>
    request(`/api/books/${bookId}/pages/${pageNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex_override: latex }),
    }),
}

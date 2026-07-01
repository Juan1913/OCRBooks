import type { AIConfig, AIStatus } from '../../domain/types'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const aiApi = {
  status: (): Promise<AIStatus> =>
    req('/api/ai/status'),

  getConfig: (): Promise<Partial<AIConfig>> =>
    req('/api/ai/config'),

  saveConfig: (config: Partial<AIConfig>): Promise<{ status: string }> =>
    req('/api/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),

  test: (): Promise<{ ok: boolean; preview?: string; error?: string }> =>
    req('/api/ai/test', { method: 'POST' }),

  fixPage: (bookId: string, pageNumber: number): Promise<{ content: string }> =>
    req(`/api/books/${bookId}/pages/${pageNumber}/ai-fix`, { method: 'POST' }),
}

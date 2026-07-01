import { useEffect, useState } from 'react'
import { X, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { aiApi } from '../../infrastructure/api/aiApi'
import type { AIConfig } from '../../domain/types'

interface Props {
  onClose: () => void
}

const PROVIDERS = [
  { id: 'ollama',    label: 'Ollama (local / VPS)',  free: true,  url: 'http://localhost:11434/v1',                              models: ['llava', 'llava-llama3', 'llava:13b', 'minicpm-v', 'moondream', 'llama3', 'gemma3'] },
  { id: 'nvidia',    label: 'NVIDIA NIM',             free: true,  url: 'https://integrate.api.nvidia.com/v1',                   models: ['nvidia/llama-3.2-90b-vision-instruct', 'meta/llama-3.1-70b-instruct'] },
  { id: 'gemini',    label: 'Google Gemini',          free: true,  url: 'https://generativelanguage.googleapis.com/v1beta/openai/', models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
  { id: 'deepseek',  label: 'DeepSeek',               free: false, url: 'https://api.deepseek.com/v1',                           models: ['deepseek-chat'] },
  { id: 'anthropic', label: 'Anthropic (Claude)',     free: false, url: '',                                                      models: ['claude-haiku-4-5', 'claude-sonnet-4-6'] },
  { id: 'openai',    label: 'OpenAI',                 free: false, url: 'https://api.openai.com/v1',                             models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'custom',    label: 'Personalizado',          free: null,  url: '',                                                      models: [] },
]

const VISION_PROVIDERS = ['ollama', 'nvidia', 'gemini', 'anthropic', 'openai', 'custom']

export function AISettingsModal({ onClose }: Props) {
  const [form, setForm] = useState<Partial<AIConfig>>({
    provider: 'ollama',
    base_url: 'http://localhost:11434/v1',
    model: '',
    api_key: '',
    vision: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    aiApi.getConfig().then(cfg => {
      if (cfg.provider) setForm(f => ({ ...f, ...cfg }))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const currentProvider = PROVIDERS.find(p => p.id === form.provider)

  const handleProviderChange = (id: string) => {
    const p = PROVIDERS.find(pr => pr.id === id)!
    setForm(f => ({
      ...f,
      provider: id,
      base_url: p.url,
      model: p.models[0] ?? '',
      vision: VISION_PROVIDERS.includes(id),
    }))
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await aiApi.saveConfig(form)
    } finally {
      setSaving(false)
      onClose()
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setSaving(true)
    await aiApi.saveConfig(form).catch(() => {})
    setSaving(false)
    try {
      const res = await aiApi.test()
      setTestResult({ ok: res.ok, msg: res.ok ? (res.preview ?? 'OK') : (res.error ?? 'Error') })
    } catch (e: unknown) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Error de conexión' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Configurar IA</h2>
              <p className="text-xs text-gray-400">Para mejorar páginas automáticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
        ) : (
          <div className="p-6 space-y-4">

            {/* Provider */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Proveedor</label>
              <select
                value={form.provider ?? 'ollama'}
                onChange={e => handleProviderChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}{p.free === true ? ' — gratis' : p.free === false ? ' — pago' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Base URL (hidden for anthropic) */}
            {form.provider !== 'anthropic' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={form.base_url ?? ''}
                  onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                  placeholder="http://localhost:11434/v1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {form.provider === 'ollama' && (
                  <p className="text-xs text-gray-400 mt-1">Para Ollama en VPS cambia <code>localhost</code> por la IP del servidor</p>
                )}
              </div>
            )}

            {/* Model */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Modelo</label>
              {currentProvider && currentProvider.models.length > 0 ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={form.model ?? ''}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    placeholder={currentProvider.models[0]}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {currentProvider.models.map(m => (
                      <button key={m} onClick={() => setForm(f => ({ ...f, model: m }))}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.model === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={form.model ?? ''}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="nombre-del-modelo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              )}
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                API Key {form.provider === 'ollama' && <span className="font-normal normal-case text-gray-400">(opcional para Ollama local)</span>}
              </label>
              <input
                type="password"
                value={form.api_key ?? ''}
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder={form.provider === 'ollama' ? 'dejar vacío si es local' : 'sk-...'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Vision toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={form.vision ?? true}
                  onChange={e => setForm(f => ({ ...f, vision: e.target.checked }))} />
                <div className={`w-9 h-5 rounded-full transition-colors ${form.vision ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.vision ? 'translate-x-4' : ''}`} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Modo visión</span>
                <p className="text-xs text-gray-400">Envía la imagen del scan junto al texto OCR (más preciso, requiere modelo con visión)</p>
              </div>
            </label>

            {/* Test result */}
            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span className="break-all">{testResult.msg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleTest} disabled={testing || saving || !form.model}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-40">
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Probar conexión
              </button>
              <button onClick={handleSave} disabled={saving || !form.model || !form.provider}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

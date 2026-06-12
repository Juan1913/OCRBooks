import type { ProgressPhase } from '../../domain/types'
import clsx from 'clsx'

interface Props {
  phase: ProgressPhase | string
  page: number
  total: number
  errorMessage?: string | null
}

const LABELS: Record<string, string> = {
  uploading:     'En cola — esperando turno…',
  extracting:    'Extrayendo páginas…',
  ocr:           'Ejecutando OCR…',
  compiling:     'Compilando LaTeX…',
  paused:        'Pausado',
  done:          'Proceso completado',
  error:         'Error en el proceso',
  compile_error: 'Error al compilar LaTeX',
}

const COLORS: Record<string, string> = {
  uploading:     'bg-gray-100 text-gray-600',
  done:          'bg-green-100 text-green-800',
  paused:        'bg-amber-100 text-amber-800',
  error:         'bg-red-100 text-red-800',
  compile_error: 'bg-red-100 text-red-800',
  extracting:    'bg-blue-100 text-blue-800',
  ocr:           'bg-indigo-100 text-indigo-800',
  compiling:     'bg-amber-100 text-amber-800',
}

export function ProcessingStatusView({ phase, page, total, errorMessage }: Props) {
  const pct = total > 0 ? Math.round((page / total) * 100) : 0
  const isActive = phase !== 'done' && phase !== 'error' && phase !== 'compile_error'

  return (
    <div className="space-y-4">
      <div className={clsx('inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium', COLORS[phase] ?? 'bg-gray-100 text-gray-700')}>
        {isActive && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
        {LABELS[phase] ?? phase}
      </div>

      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{phase === 'ocr' ? `Página ${page} / ${total}` : `${pct}%`}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-brand h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded">{errorMessage}</p>
      )}
    </div>
  )
}

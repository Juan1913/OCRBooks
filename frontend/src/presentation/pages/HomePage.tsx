import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, AlertCircle, Loader2, Clock, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BookUploadView } from '../components/BookUploadView'
import { UploadAIModeModal } from '../components/UploadAIModeModal'
import { useUploadBook } from '../../application/useUploadBook'
import { useBooks } from '../../application/useBooks'
import { aiApi } from '../../infrastructure/api/aiApi'
import type { BookStatus } from '../../domain/types'
import clsx from 'clsx'

const STATUS_DOT: Record<BookStatus, string> = {
  uploading:  'bg-gray-300',
  extracting: 'bg-blue-400',
  processing: 'bg-indigo-500 animate-pulse',
  compiling:  'bg-amber-400',
  paused:     'bg-amber-400',
  done:       'bg-green-400',
  error:      'bg-red-400',
}

const STATUS_CHIP: Record<BookStatus, string> = {
  uploading:  'bg-gray-100 text-gray-500',
  extracting: 'bg-blue-50 text-blue-700',
  processing: 'bg-indigo-50 text-indigo-700',
  compiling:  'bg-amber-50 text-amber-700',
  paused:     'bg-amber-50 text-amber-600',
  done:       'bg-green-50 text-green-700',
  error:      'bg-red-50 text-red-700',
}

const STATUS_LABEL: Record<BookStatus, string> = {
  uploading: 'En cola', extracting: 'Extrayendo', processing: 'OCR en curso',
  compiling: 'Compilando', paused: 'Pausado', done: 'Completado', error: 'Error',
}

export function HomePage() {
  const { uploading, error, pendingFile, selectFile, upload, cancelPending } = useUploadBook()
  const { data: books, isLoading } = useBooks()
  const [dragging, setDragging] = useState(false)
  const { data: aiStatus } = useQuery({ queryKey: ['ai-status'], queryFn: aiApi.status, staleTime: 30_000 })

  const handleFile = useCallback((file: File) => {
    if (aiStatus?.configured) {
      selectFile(file)   // show AI mode modal first
    } else {
      upload(file, null) // no AI configured → upload directly
    }
  }, [aiStatus, selectFile, upload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const total      = books?.length ?? 0
  const processing = books?.filter(b => ['extracting','processing','compiling'].includes(b.status)).length ?? 0
  const done       = books?.filter(b => b.status === 'done').length ?? 0
  const errors     = books?.filter(b => b.status === 'error').length ?? 0

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900">Panel principal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona y digitaliza tus libros escaneados</p>
      </div>

      <div className="px-8 py-6 space-y-6 max-w-6xl mx-auto">

        {/* Stats cards */}
        {total > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={<BookOpen className="w-5 h-5" />} label="Total libros"   value={total}      color="indigo" />
            <StatCard icon={<Loader2  className="w-5 h-5 animate-spin" />} label="Procesando" value={processing} color="blue" />
            <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Completados" value={done}   color="green" />
            <StatCard icon={<AlertCircle className="w-5 h-5" />}  label="Con errores" value={errors} color="red" />
          </div>
        )}

        {/* Upload section */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Subir nuevo libro</h2>
          </div>
          <BookUploadView
            dragging={dragging} uploading={uploading} error={error}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onFileSelect={handleFile}
          />
        </section>

        {/* Book list */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Biblioteca</h2>
            </div>
            {total > 0 && <span className="text-xs text-gray-400">{total} libro{total !== 1 ? 's' : ''}</span>}
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
            </div>
          )}

          {!isLoading && books?.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-sm text-gray-400">No hay libros aún. Sube uno arriba para empezar.</p>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {books?.map((book) => {
              const pct = book.total_pages > 0 ? Math.round((book.processed_pages / book.total_pages) * 100) : 0
              const isActive = !['done', 'error', 'paused'].includes(book.status)
              const to = book.status === 'done' || book.processed_pages > 0
                ? `/review/${book.id}/1`
                : isActive
                  ? `/processing/${book.id}`
                  : `/processing/${book.id}`
              return (
                <Link
                  key={book.id}
                  to={to}
                  className="flex items-center gap-4 py-3.5 px-2 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  {/* Status dot */}
                  <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', STATUS_DOT[book.status])} />

                  {/* Title + progress */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                      {book.title}
                    </p>
                    {book.total_pages > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 max-w-32 bg-gray-100 rounded-full h-1">
                          <div
                            className={clsx('h-1 rounded-full transition-all', book.status === 'done' ? 'bg-green-500' : 'bg-indigo-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400">{book.processed_pages}/{book.total_pages} págs</span>
                      </div>
                    )}
                  </div>

                  {/* Status chip */}
                  <span className={clsx('text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0', STATUS_CHIP[book.status])}>
                    {STATUS_LABEL[book.status]}
                  </span>

                  {/* Date */}
                  <span className="text-[11px] text-gray-300 flex-shrink-0 hidden sm:block">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(book.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>

      {pendingFile && aiStatus && (
        <UploadAIModeModal
          file={pendingFile}
          provider={aiStatus.provider}
          onConfirm={(mode) => upload(pendingFile, mode)}
          onCancel={cancelPending}
        />
      )}
    </div>
  )
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'indigo' | 'blue' | 'green' | 'red'
}) {
  const palette = {
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-600', text: 'text-indigo-600' },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-600',   text: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-600',  text: 'text-green-600' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-600',    text: 'text-red-600' },
  }
  const p = palette[color]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0', p.icon)}>
        {icon}
      </div>
      <div>
        <p className={clsx('text-2xl font-bold', p.text)}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

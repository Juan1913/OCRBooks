import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Pause, Play, Trash2, Eye, UploadCloud,
  CheckCircle2, AlertCircle, Loader2, Clock, ChevronRight, Settings,
} from 'lucide-react'
import { bookApi } from '../../infrastructure/api/bookApi'
import { ConfirmModal } from './ConfirmModal'
import { AISettingsModal } from './AISettingsModal'
import type { BookSummary, BookStatus } from '../../domain/types'
import clsx from 'clsx'

/* ── Constants ─────────────────────────────────────────────────────────────── */

const ACTIVE_STATUSES: BookStatus[] = ['extracting', 'processing', 'compiling']
const PAUSABLE: BookStatus[] = ['uploading', 'extracting', 'processing', 'compiling']
const RESUMABLE: BookStatus[] = ['paused', 'error']

const STATUS_META: Record<BookStatus, { label: string; icon: React.ReactNode; dot: string }> = {
  uploading:  { label: 'En cola',     icon: <Clock className="w-3.5 h-3.5" />,            dot: 'bg-gray-300' },
  extracting: { label: 'Extrayendo',  icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, dot: 'bg-blue-400' },
  processing: { label: 'OCR',         icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, dot: 'bg-indigo-500 animate-pulse' },
  compiling:  { label: 'Compilando',  icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, dot: 'bg-amber-400' },
  paused:     { label: 'Pausado',     icon: <Pause className="w-3.5 h-3.5" />,            dot: 'bg-amber-400' },
  done:       { label: 'Completado',  icon: <CheckCircle2 className="w-3.5 h-3.5" />,     dot: 'bg-green-400' },
  error:      { label: 'Error',       icon: <AlertCircle className="w-3.5 h-3.5" />,      dot: 'bg-red-400' },
}

const STATUS_CHIP: Record<BookStatus, string> = {
  uploading:  'bg-gray-100 text-gray-500',
  extracting: 'bg-blue-50 text-blue-700',
  processing: 'bg-indigo-50 text-indigo-700',
  compiling:  'bg-amber-50 text-amber-700',
  paused:     'bg-amber-50 text-amber-700',
  done:       'bg-green-50 text-green-700',
  error:      'bg-red-50 text-red-700',
}

/* ── BookCard ───────────────────────────────────────────────────────────────── */

interface DeleteConfirm { open: boolean; bookId: string; title: string }

function BookCard({
  book, isCurrent, onDeleteRequest,
}: {
  book: BookSummary
  isCurrent: boolean
  onDeleteRequest: (id: string, title: string) => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pct = book.total_pages > 0 ? Math.round((book.processed_pages / book.total_pages) * 100) : 0
  const isProcessing = ACTIVE_STATUSES.includes(book.status as BookStatus)
  const meta = STATUS_META[book.status as BookStatus]

  const pause = useMutation({
    mutationFn: () => bookApi.pause(book.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })
  const resume = useMutation({
    mutationFn: () => bookApi.resume(book.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      navigate(`/processing/${book.id}`)
    },
  })

  const viewTo = book.status === 'done'
    ? `/review/${book.id}/1`
    : book.processed_pages > 0
      ? `/review/${book.id}/1`
      : book.status !== 'uploading'
        ? `/processing/${book.id}`
        : null

  return (
    <div
      className={clsx(
        'rounded-xl border p-3 transition-all duration-200 group',
        isCurrent
          ? 'border-indigo-300 bg-indigo-50 shadow-sm'
          : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2">
        {/* Status dot */}
        <span className={clsx('mt-1.5 w-2 h-2 rounded-full flex-shrink-0', meta?.dot ?? 'bg-gray-300')} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 leading-snug line-clamp-2">{book.title}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1', STATUS_CHIP[book.status as BookStatus] ?? 'bg-gray-100 text-gray-500')}>
              {meta?.icon}
              {meta?.label ?? book.status}
            </span>
            {book.total_pages > 0 && (
              <span className="text-[10px] text-gray-400">{book.processed_pages}/{book.total_pages} págs</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {book.total_pages > 0 && isProcessing && (
        <div className="mb-2 px-4">
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div
              className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-gray-400 mt-0.5">{pct}%</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        {viewTo && (
          <Link
            to={viewTo}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Eye className="w-3 h-3" />
            {book.status === 'done' ? 'Revisar' : 'Ver'}
            <ChevronRight className="w-2.5 h-2.5" />
          </Link>
        )}

        <div className="flex-1" />

        {/* Pause */}
        {PAUSABLE.includes(book.status as BookStatus) && (
          <button
            onClick={() => pause.mutate()}
            disabled={pause.isPending}
            title="Pausar"
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Resume */}
        {RESUMABLE.includes(book.status as BookStatus) && (
          <button
            onClick={() => resume.mutate()}
            disabled={resume.isPending}
            title="Reanudar"
            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => onDeleteRequest(book.id, book.title)}
          title="Eliminar"
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ── BooksSidebar ───────────────────────────────────────────────────────────── */

export function BooksSidebar() {
  const { bookId } = useParams<{ bookId?: string }>()
  const queryClient = useQueryClient()

  const [confirm, setConfirm] = useState<DeleteConfirm>({ open: false, bookId: '', title: '' })
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: bookApi.list,
    refetchInterval: 4000,
    staleTime: 2000,
  })

  const remove = useMutation({
    mutationFn: (id: string) => bookApi.deleteBook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setConfirm({ open: false, bookId: '', title: '' })
    },
  })

  // Stats
  const active  = books.filter(b => ACTIVE_STATUSES.includes(b.status as BookStatus)).length
  const queued  = books.filter(b => b.status === 'uploading').length
  const done    = books.filter(b => b.status === 'done').length
  const errors  = books.filter(b => b.status === 'error').length

  // Groups
  const grouped = [
    { label: 'Procesando ahora',  items: books.filter(b => ACTIVE_STATUSES.includes(b.status as BookStatus)) },
    { label: 'En cola',          items: books.filter(b => b.status === 'uploading') },
    { label: 'Pausado / Error',  items: books.filter(b => b.status === 'paused' || b.status === 'error') },
    { label: 'Completados',      items: books.filter(b => b.status === 'done') },
  ].filter(g => g.items.length > 0)

  return (
    <>
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full shadow-sm">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
              <BookOpen className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">OCRBooks</span>
          </Link>
          <button onClick={() => setAiSettingsOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Configurar IA">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Stats chips */}
        {books.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-2 gap-2">
            <StatChip label="Procesando" value={active} color="indigo" />
            <StatChip label="En cola"    value={queued}  color="gray" />
            <StatChip label="Listos"     value={done}    color="green" />
            <StatChip label="Errores"    value={errors}  color="red" />
          </div>
        )}

        {/* Book list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {books.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 mt-10 px-4 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Sube tu primer libro para empezar la digitalización.
              </p>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.label} className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                {group.label}
              </p>
              {group.items.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  isCurrent={book.id === bookId}
                  onDeleteRequest={(id, title) => setConfirm({ open: true, bookId: id, title })}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Upload button */}
        <div className="px-4 py-4 border-t border-gray-100">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl py-2.5 shadow-sm hover:shadow-md transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Subir libro
          </Link>
        </div>
      </aside>

      {/* Confirm delete modal */}
      <ConfirmModal
        open={confirm.open}
        danger
        title="¿Eliminar libro?"
        message={`Se eliminarán todos los archivos de "${confirm.title}". Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onConfirm={() => remove.mutate(confirm.bookId)}
        onCancel={() => setConfirm({ open: false, bookId: '', title: '' })}
      />
      {aiSettingsOpen && <AISettingsModal onClose={() => setAiSettingsOpen(false)} />}
    </>
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: 'indigo' | 'gray' | 'green' | 'red' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    gray:   'bg-gray-50 text-gray-500',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <div className={clsx('rounded-lg px-2 py-1.5 flex flex-col', colors[color])}>
      <span className="text-base font-bold leading-none">{value}</span>
      <span className="text-[10px] mt-0.5 font-medium opacity-80">{label}</span>
    </div>
  )
}

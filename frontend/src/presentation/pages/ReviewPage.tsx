import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Edit2, X, FileDown, RefreshCw } from 'lucide-react'
import { useReviewPage } from '../../application/useReviewPage'
import { useCompileBook } from '../../application/useCompileBook'
import { PageViewerView } from '../components/PageViewerView'
import { LaTeXEditorView } from '../components/LaTeXEditorView'
import { bookApi } from '../../infrastructure/api/bookApi'
import clsx from 'clsx'

const DOT: Record<string, string> = {
  pending: 'bg-gray-300', processing: 'bg-yellow-400', ocr_done: 'bg-green-400', error: 'bg-red-400',
}

export function ReviewPage() {
  const { bookId, pageNumber: pageParam } = useParams<{ bookId: string; pageNumber: string }>()
  const navigate = useNavigate()
  const pageNumber = parseInt(pageParam ?? '1', 10)

  const { book, page, isLoading } = useReviewPage(bookId, pageNumber)
  const { compiling, compile } = useCompileBook(bookId)

  const [editOpen, setEditOpen] = useState(false)
  const [editorContent, setEditorContent] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { saveLatex } = useReviewPage(bookId, pageNumber)

  const total = book?.total_pages ?? 1
  const goTo = (n: number) => { if (n >= 1 && n <= total) { setEditOpen(false); navigate(`/review/${bookId}/${n}`) } }

  const openEditor = () => {
    setEditorContent(page?.content ?? '')
    setEditOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveLatex(editorContent)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const pageStatuses = book?.pages?.reduce((acc, p) => ({ ...acc, [p.page_number]: p.status }), {} as Record<number, string>) ?? {}

  // page strip window
  const STRIP = 20
  const start = Math.max(1, pageNumber - Math.floor(STRIP / 2))
  const end = Math.min(total, start + STRIP - 1)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-5 py-3.5 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to={`/processing/${bookId}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <span className="font-semibold text-gray-900 truncate max-w-xs text-sm">{book?.title}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Pág. <strong className="text-gray-600">{pageNumber}</strong> / {total}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={editOpen ? () => setEditOpen(false) : openEditor}
              className={clsx('flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors', editOpen ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:border-brand')}>
              {editOpen ? <><X className="w-4 h-4" /> Cerrar</> : <><Edit2 className="w-4 h-4" /> Editar LaTeX</>}
            </button>
            <button onClick={compile} disabled={compiling}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={clsx('w-4 h-4', compiling && 'animate-spin')} />
              {compiling ? 'Compilando…' : 'Compilar'}
            </button>
            {book?.status === 'done' && (
              <a href={bookApi.downloadPdfUrl(bookId!)} download
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <FileDown className="w-4 h-4" /> Descargar PDF
              </a>
            )}
          </div>
        </div>

        {/* Page strip */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto">
          <button onClick={() => goTo(pageNumber - 1)} disabled={pageNumber <= 1} className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: end - start + 1 }, (_, i) => {
            const n = start + i
            const s = pageStatuses[n] ?? 'pending'
            return (
              <button key={n} onClick={() => goTo(n)}
                className={clsx('flex flex-col items-center gap-0.5 px-1.5 py-1 rounded text-xs flex-shrink-0 transition-colors', n === pageNumber ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
                <span className={clsx('w-2 h-2 rounded-full', DOT[s] ?? 'bg-gray-300')} />
                {n}
              </button>
            )
          })}
          <button onClick={() => goTo(pageNumber + 1)} disabled={pageNumber >= total} className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        {editOpen && page?.content ? (
          <LaTeXEditorView
            pageNumber={pageNumber} content={editorContent} saving={saving} saved={saved}
            onChange={setEditorContent} onSave={handleSave}
            onReset={() => setEditorContent(page.content ?? '')}
            onClose={() => setEditOpen(false)}
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : page ? (
          <PageViewerView
            page={page}
            pageWidthMm={book?.page_width_mm ?? null}
            pageHeightMm={book?.page_height_mm ?? null}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">Página no encontrada</div>
        )}
      </div>
    </div>
  )
}

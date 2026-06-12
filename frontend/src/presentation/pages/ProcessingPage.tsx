import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Eye } from 'lucide-react'
import { useProcessingState } from '../../application/useProcessingState'
import { ProcessingStatusView } from '../components/ProcessingStatusView'
import clsx from 'clsx'

const DOT_COLOR: Record<string, string> = {
  pending:    'bg-gray-200',
  processing: 'bg-yellow-400 animate-pulse',
  ocr_done:   'bg-green-400',
  error:      'bg-red-400',
}

export function ProcessingPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const { book, isLoading, lastMessage, pageProgress } = useProcessingState(bookId)

  if (isLoading || !book) {
    return <div className="flex-1 bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>
  }

  const total = book.total_pages || lastMessage?.total || 0
  const currentPage = lastMessage?.phase === 'ocr' ? (lastMessage.page ?? 0) : book.processed_pages
  const phase = lastMessage?.phase ?? book.status

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-semibold text-gray-900">{book.title}</h1>
            <p className="text-xs text-gray-500">{total} páginas</p>
          </div>
          {(book.status === 'done' || book.processed_pages > 0) && (
            <Link to={`/review/${bookId}/1`} className="ml-auto flex items-center gap-2 text-sm bg-brand text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
              <Eye className="w-4 h-4" /> Revisar páginas
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <ProcessingStatusView
          phase={phase} page={currentPage} total={total}
          errorMessage={lastMessage?.message}
        />

        {total > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Mapa de páginas</h2>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: total }, (_, i) => {
                const n = i + 1
                const pageInfo = book.pages?.find(p => p.page_number === n)
                const status = pageProgress[n] ?? pageInfo?.status ?? 'pending'
                return (
                  <div key={n} className="relative group">
                    <div className={clsx('w-4 h-4 rounded-sm transition-colors', DOT_COLOR[status] ?? 'bg-gray-200')} />
                    {status === 'ocr_done' && (
                      <Link to={`/review/${bookId}/${n}`} className="absolute inset-0 rounded-sm hover:ring-2 hover:ring-indigo-400" title={`Página ${n}`} />
                    )}
                    <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap z-10">{n}</div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              {[['bg-gray-200', 'Pendiente'], ['bg-yellow-400', 'Procesando'], ['bg-green-400', 'Completo'], ['bg-red-400', 'Error']].map(([cls, label]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={clsx('w-3 h-3 rounded-sm inline-block', cls)} /> {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

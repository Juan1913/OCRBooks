import { UploadCloud, FileText, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  dragging: boolean
  uploading: boolean
  error: string | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (file: File) => void
}

export function BookUploadView({ dragging, uploading, error, onDragOver, onDragLeave, onDrop, onFileSelect }: Props) {
  return (
    <div className="w-full max-w-xl mx-auto">
      <label
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={clsx(
          'flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-colors',
          dragging ? 'border-brand bg-indigo-50' : 'border-gray-300 hover:border-brand hover:bg-gray-50',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        <input
          type="file" accept=".pdf" className="hidden" disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = '' }}
        />
        {uploading ? (
          <>
            <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Subiendo libro…</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-12 h-12 text-gray-400" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">Arrastra un PDF aquí</p>
              <p className="text-sm text-gray-500 mt-1">o haz clic para seleccionarlo</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="w-4 h-4" />
              <span>Libros escaneados Mir Moscú y similares</span>
            </div>
          </>
        )}
      </label>
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

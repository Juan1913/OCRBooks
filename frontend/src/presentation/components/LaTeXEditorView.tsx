import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { Save, X, RotateCcw } from 'lucide-react'

interface Props {
  pageNumber: number
  content: string
  saving: boolean
  saved: boolean
  onChange: (value: string) => void
  onSave: () => void
  onReset: () => void
  onClose: () => void
}

export function LaTeXEditorView({ pageNumber, content, saving, saved, onChange, onSave, onReset, onClose }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-lg">
        <span className="text-sm text-gray-300 font-mono">Editando LaTeX — Página {pageNumber}</span>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
            <RotateCcw className="w-3 h-3" /> Revertir
          </button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors disabled:opacity-50">
            <Save className="w-3 h-3" />
            {saving ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-b-lg">
        <CodeMirror value={content} height="100%" extensions={[markdown()]} theme={oneDark} onChange={onChange} style={{ height: '100%', fontSize: '13px' }} />
      </div>
    </div>
  )
}

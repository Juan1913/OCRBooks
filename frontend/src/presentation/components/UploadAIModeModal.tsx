import { X, Zap, FileText, Eye, Ban } from 'lucide-react'

interface Props {
  file: File
  provider: string
  onConfirm: (aiMode: string | null) => void
  onCancel: () => void
}

const OPTIONS = [
  {
    mode: 'vision' as const,
    icon: Eye,
    title: 'IA con imagen original',
    desc: 'El modelo ve el scan y el texto OCR. Más preciso — requiere modelo con visión (llava, gpt-4o, claude…)',
    color: 'border-indigo-300 bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  {
    mode: 'text' as const,
    icon: FileText,
    title: 'IA solo texto',
    desc: 'El modelo corrige el texto OCR sin ver la imagen. Más rápido — funciona con cualquier modelo de texto.',
    color: 'border-violet-300 bg-violet-50 text-violet-700',
    dot: 'bg-violet-400',
  },
  {
    mode: null,
    icon: Ban,
    title: 'Sin IA',
    desc: 'Usar el OCR tal cual, sin post-procesado. Puedes mejorar páginas manualmente desde el editor.',
    color: 'border-gray-200 bg-gray-50 text-gray-600',
    dot: 'bg-gray-300',
  },
]

export function UploadAIModeModal({ file, provider, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Opciones de IA</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{file.name}</p>
          </div>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-400">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            Proveedor activo: <span className="font-medium text-gray-600">{provider}</span>
          </div>

          {OPTIONS.map(({ mode, icon: Icon, title, desc, color, dot }) => (
            <button key={String(mode)} onClick={() => onConfirm(mode)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm ${color}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{title}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  </div>
                  <p className="text-xs mt-0.5 opacity-75 leading-relaxed">{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { Components } from 'react-markdown'
import type { ReactNode } from 'react'
import type { PageDetail } from '../../domain/types'

interface Props {
  page: PageDetail
  pageWidthMm?: number | null
  pageHeightMm?: number | null
}

declare global {
  interface Window { MathJax?: { typesetPromise: (nodes?: HTMLElement[]) => Promise<void> } }
}

function resolveImageSrc(src: string | undefined): string {
  if (!src) return ''
  if (src.startsWith('/storage/')) return src
  const match = src.match(/[/\\]storage[/\\](.+)$/)
  if (match) return `/storage/${match[1].replace(/\\/g, '/')}`
  return src
}

/** Recursively collect all plain text from a ReactNode. */
function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node)
    return extractText((node as { props: { children?: ReactNode } }).props.children)
  return ''
}

/**
 * Pre-process markdown from Marker OCR to fix common layout artifacts:
 *
 * 1. Join orphaned exercise numbers with their display-math formula.
 *    Marker reads multi-column exercise lists sequentially and outputs:
 *      "118*.\n$$y = \arcsin x$$"  →  two separate elements
 *    We join them as inline math:
 *      "118*. $y = \arcsin x$"    →  one compact line
 *
 * 2. Strip leading ". " artifacts (e.g. ". y = sin x ." → "y = sin x .")
 *    that appear when the OCR splits a problem number from the period that
 *    precedes the formula.
 */
function preprocessMarkdown(raw: string): string {
  const lines = raw.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Detect a lone exercise number: "118*.", "80*.", "122.", "83*." etc.
    if (/^\d+[\\*]*\*?[.\\]\s*$/.test(trimmed)) {
      // Skip blank lines, then check if next content line is $$formula$$
      let j = i + 1
      while (j < lines.length && lines[j].trim() === '') j++

      if (j < lines.length) {
        const next = lines[j].trim()
        // Single-line display math: $$...$$
        if (next.startsWith('$$') && next.endsWith('$$') && next.length > 4) {
          const formula = next.slice(2, -2).trim()
          out.push(`${trimmed} $${formula}$`)
          i = j + 1
          continue
        }
      }
    }

    // Strip leading ". " artifact on short lines
    if (/^\.\s+/.test(trimmed) && trimmed.length < 120) {
      out.push(line.replace(/^\s*\.\s+/, ''))
      i++
      continue
    }

    out.push(line)
    i++
  }

  return out.join('\n')
}

/**
 * Return true only for paragraphs that look like title/portada text:
 *   - Short (< 60 chars)
 *   - Does NOT end with ':'  (intro lines like "Resolver las inecuaciones:")
 *   - Does NOT start with ';' (continuation of a multi-item series)
 *   - Does NOT look like a sub-problem label: "a)", "b)", "1.", "2.", etc.
 *   - Does NOT start with a digit followed by '.' (numbered problems)
 * This keeps title-page text (edition, publisher, short title fragments) centered
 * while leaving body content (problems, intro phrases, labels) left-aligned.
 */
function shouldCenter(node: ReactNode): boolean {
  const text = extractText(node).trim()
  if (!text || text.length === 0 || text.length > 60) return false
  if (text.endsWith(':'))                   return false  // intro line
  if (text.startsWith(';'))                 return false  // continuation
  if (/^[a-zA-Z]\)\s*$/.test(text))        return false  // lone label: a) b) c)
  if (/^[a-zA-Z]\)\s+\S/.test(text))       return false  // label + content: a) |x-1|
  if (/^\d+[.*]\s/.test(text))             return false  // numbered problem: 1. 2.
  if (/^\d+\*\*/.test(text))              return false  // starred problem: 1**
  return true
}

const mdComponents: Components = {
  /* Headings — always centered, large */
  h1: ({ children }) => (
    <h1 className="text-[2.1em] font-bold text-center mt-14 mb-8 leading-tight tracking-wide uppercase">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[1.55em] font-semibold text-center mt-10 mb-5 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[1.2em] font-semibold mt-7 mb-3 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[1.05em] font-semibold italic mt-5 mb-2">
      {children}
    </h4>
  ),

  /* Paragraphs — center only for portada/title-like text; body always justified */
  p: ({ children }) => (
    <p className={`mb-[0.5em] leading-[1.75] hyphens-auto ${shouldCenter(children) ? 'text-center' : 'text-justify'}`}>
      {children}
    </p>
  ),

  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,

  ol: ({ children, start }) => (
    <ol start={typeof start === 'number' ? start : undefined} className="pl-0 mb-4 space-y-2 list-none">
      {children}
    </ol>
  ),

  li: ({ children, node }) => {
    const val = (node as { properties?: { value?: number } })?.properties?.value
    return (
      <li className="leading-[1.9] flex gap-3 items-baseline">
        {val != null && (
          <span className="flex-shrink-0 font-normal text-gray-500 min-w-[2.5rem] text-right">{val}.</span>
        )}
        <span className="flex-1">{children}</span>
      </li>
    )
  },

  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-gray-400 pl-4 italic text-gray-600 my-5 py-1">
      {children}
    </blockquote>
  ),

  code: ({ children, className }) => {
    const isBlock = Boolean(className)
    return isBlock
      ? <pre className="bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-[0.85em] my-4 font-mono leading-relaxed"><code>{children}</code></pre>
      : <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[0.88em]">{children}</code>
  },

  img: ({ src, alt }) => (
    <figure className="my-6 flex flex-col items-center">
      <img
        src={resolveImageSrc(src)} alt={alt ?? ''} className="max-w-full" loading="lazy"
        onError={(e) => {
          const t = e.currentTarget; t.style.display = 'none'
          const msg = document.createElement('span')
          msg.className = 'text-[0.8em] text-gray-400 italic'
          msg.textContent = `[Figura: ${alt || src || 'imagen'}]`
          t.parentNode?.insertBefore(msg, t)
        }}
      />
      {alt && <figcaption className="text-[0.8em] text-gray-500 mt-1.5 italic text-center">{alt}</figcaption>}
    </figure>
  ),

  table: ({ children }) => (
    <div className="overflow-x-auto my-5">
      <table className="mx-auto border-collapse text-[0.9em]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-gray-400 bg-gray-50 px-3 py-1.5 text-center font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-gray-300 px-3 py-1.5 text-center">{children}</td>,

  hr: () => <hr className="my-10 border-gray-400 w-3/5 mx-auto" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  sup: ({ children }) => <sup className="text-[0.7em] align-super leading-none">{children}</sup>,
  sub: ({ children }) => <sub className="text-[0.7em] align-sub leading-none">{children}</sub>,
}

export function PageViewerView({ page, pageWidthMm, pageHeightMm }: Props) {
  const mathRef   = useRef<HTMLDivElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)   // measures right column width
  const [panelW, setPanelW] = useState(0)

  /* MathJax typeset on content change */
  useEffect(() => {
    if (mathRef.current && page.content && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([mathRef.current]).catch(() => {})
    }
  }, [page.content])

  /* Measure right-column width so we can compute proportional page height */
  useLayoutEffect(() => {
    if (!panelRef.current) return
    const obs = new ResizeObserver(entries => setPanelW(entries[0].contentRect.width))
    obs.observe(panelRef.current)
    return () => obs.disconnect()
  }, [])

  /* Page card dimensions — width reference: 210mm = 760px (A4) */
  const A4_MM = 210
  const A4_PX = 760
  const MARGIN_MM = 20

  const naturalWidthPx = pageWidthMm ? Math.round((pageWidthMm / A4_MM) * A4_PX) : A4_PX
  const displayedWidthPx = panelW > 0 ? Math.min(naturalWidthPx, panelW - 32) : naturalWidthPx

  // Proportional page height so the white card always represents the full page
  const pageAspect = pageWidthMm && pageHeightMm ? pageHeightMm / pageWidthMm : 297 / 210
  const minHeightPx = Math.round(displayedWidthPx * pageAspect)

  const hPadPx = Math.round((MARGIN_MM / A4_MM) * A4_PX)

  // Font size scales with how wide the displayed card actually is vs A4 reference
  const scaleFactor = displayedWidthPx / A4_PX
  const baseFontPx = Math.max(13, Math.round(16.5 * scaleFactor))
  const fontSize = `${baseFontPx}px`

  const labelClass = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5'

  return (
    /* grid columns need min-h-0 so flex-1 inside them respects overflow */
    <div className="grid grid-cols-2 gap-4 h-full">

      {/* ── Left: original scan ─────────────────────────────────────── */}
      <div className="flex flex-col min-h-0">
        <div className={labelClass}>Original (scan)</div>
        <div className="flex-1 overflow-auto min-h-0 bg-gray-100 rounded-xl border border-gray-200 flex items-start justify-center p-2">
          {page.image_url
            ? <img src={page.image_url} alt={`Página ${page.page_number}`} className="max-w-full object-contain" />
            : <div className="text-gray-400 text-sm mt-8">Sin imagen</div>}
        </div>
      </div>

      {/* ── Right: book-style rendering ─────────────────────────────── */}
      <div className="flex flex-col min-h-0" ref={panelRef}>
        <div className={labelClass}>
          Resultado renderizado
          {pageWidthMm && pageHeightMm && (
            <span className="ml-2 font-normal normal-case text-gray-300">
              {pageWidthMm} × {pageHeightMm} mm
            </span>
          )}
        </div>

        {/* Paper-tray background — scrollable */}
        <div className="flex-1 overflow-auto min-h-0 rounded-xl border border-gray-200 bg-[#dedad6]">

          {page.status === 'pending' && (
            <div className="p-6 text-gray-400 text-sm">Pendiente de procesar…</div>
          )}
          {page.status === 'processing' && (
            <div className="p-6 flex items-center gap-2 text-indigo-600 text-sm">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Procesando OCR…
            </div>
          )}
          {page.status === 'error' && (
            <div className="p-6 text-red-600 text-sm">
              <strong>Error:</strong> {page.error_message ?? 'Error desconocido'}
            </div>
          )}

          {page.status === 'ocr_done' && page.content && (
            <div className="py-6 px-4 flex justify-center">
              {/* White page card — proportional width + minimum proportional height */}
              <div
                ref={mathRef}
                style={{
                  width: `${naturalWidthPx}px`,
                  maxWidth: '100%',
                  minHeight: `${minHeightPx}px`,
                  paddingLeft:  `${hPadPx}px`,
                  paddingRight: `${hPadPx}px`,
                  paddingTop:   '3.5rem',
                  paddingBottom:'4rem',
                  fontFamily:   'EB Garamond, Georgia, serif',
                  fontSize,
                  lineHeight:   '1.9',
                  color:        '#111',
                  backgroundColor: '#ffffff',
                  boxShadow:    '0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)',
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={mdComponents}
                >
                  {preprocessMarkdown(page.content)}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

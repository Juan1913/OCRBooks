import type { ProgressMessage } from '../../domain/types'

type MessageHandler = (msg: ProgressMessage) => void
type StatusHandler = (connected: boolean) => void

const WS_BASE = `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}`

export class BookSocket {
  private ws: WebSocket | null = null
  private stopped = false
  private retries = 0
  private readonly maxRetries = 5

  constructor(
    private readonly bookId: string,
    private readonly onMessage: MessageHandler,
    private readonly onStatus?: StatusHandler,
  ) {}

  connect(): void {
    if (this.stopped) return

    this.ws = new WebSocket(`${WS_BASE}/ws/${this.bookId}`)

    this.ws.onopen = () => {
      this.retries = 0
      this.onStatus?.(true)
    }

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        this.onMessage(JSON.parse(e.data) as ProgressMessage)
      } catch {}
    }

    this.ws.onclose = () => {
      this.onStatus?.(false)
      if (!this.stopped && this.retries < this.maxRetries) {
        this.retries++
        setTimeout(() => this.connect(), 1000 * this.retries)
      }
    }

    this.ws.onerror = () => this.ws?.close()
  }

  disconnect(): void {
    this.stopped = true
    this.ws?.close()
    this.ws = null
  }
}

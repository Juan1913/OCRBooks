import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BookSocket } from '../infrastructure/websocket/BookSocket'
import { useBookDetail } from './useBookDetail'
import type { ProgressMessage } from '../domain/types'

export interface PageProgressMap {
  [pageNumber: number]: string
}

export function useProcessingState(bookId: string | undefined) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: book, isLoading } = useBookDetail(bookId)
  const [lastMessage, setLastMessage] = useState<ProgressMessage | null>(null)
  const [pageProgress, setPageProgress] = useState<PageProgressMap>({})
  const [wsConnected, setWsConnected] = useState(false)
  const socketRef = useRef<BookSocket | null>(null)

  const handleMessage = useCallback((msg: ProgressMessage) => {
    setLastMessage(msg)

    if (msg.phase === 'ocr' && msg.page) {
      const status = msg.status === 'done' ? 'ocr_done' : msg.status === 'error' ? 'error' : 'processing'
      setPageProgress(prev => ({ ...prev, [msg.page!]: status }))
    }

    qc.invalidateQueries({ queryKey: ['book', bookId] })
    qc.invalidateQueries({ queryKey: ['books'] })

    if (msg.phase === 'done') {
      setTimeout(() => navigate(`/review/${bookId}/1`), 800)
    }
  }, [bookId, navigate, qc])

  useEffect(() => {
    if (!bookId) return
    const socket = new BookSocket(bookId, handleMessage, setWsConnected)
    socket.connect()
    socketRef.current = socket
    return () => socket.disconnect()
  }, [bookId, handleMessage])

  return { book, isLoading, lastMessage, pageProgress, wsConnected }
}

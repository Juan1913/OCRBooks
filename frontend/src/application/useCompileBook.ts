import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { bookApi } from '../infrastructure/api/bookApi'

export function useCompileBook(bookId: string | undefined) {
  const [compiling, setCompiling] = useState(false)
  const qc = useQueryClient()

  const compile = async () => {
    if (!bookId) return
    setCompiling(true)
    try {
      await bookApi.compile(bookId)
      await qc.invalidateQueries({ queryKey: ['book', bookId] })
    } finally {
      setCompiling(false)
    }
  }

  return { compiling, compile }
}

import { useQuery } from '@tanstack/react-query'
import { bookApi } from '../infrastructure/api/bookApi'
import type { BookSummary } from '../domain/types'

export function useBooks() {
  return useQuery<BookSummary[]>({
    queryKey: ['books'],
    queryFn: bookApi.list,
    refetchInterval: 5000,
  })
}

import { useQuery } from '@tanstack/react-query'
import { bookApi } from '../infrastructure/api/bookApi'
import type { BookDetail } from '../domain/types'

export function useBookDetail(bookId: string | undefined) {
  return useQuery<BookDetail>({
    queryKey: ['book', bookId],
    queryFn: () => bookApi.get(bookId!),
    enabled: !!bookId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'done' || status === 'error' ? false : 3000
    },
  })
}

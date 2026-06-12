import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pageApi } from '../infrastructure/api/pageApi'
import { useBookDetail } from './useBookDetail'
import type { PageDetail } from '../domain/types'

export function useReviewPage(bookId: string | undefined, pageNumber: number | undefined) {
  const qc = useQueryClient()
  const { data: book } = useBookDetail(bookId)

  const pageQuery = useQuery<PageDetail>({
    queryKey: ['page', bookId, pageNumber],
    queryFn: () => pageApi.get(bookId!, pageNumber!),
    enabled: !!bookId && pageNumber !== undefined,
  })

  const saveLatex = async (content: string) => {
    await pageApi.updateLatex(bookId!, pageNumber!, content)
    await qc.invalidateQueries({ queryKey: ['page', bookId, pageNumber] })
  }

  return {
    book,
    page: pageQuery.data,
    isLoading: pageQuery.isLoading,
    saveLatex,
  }
}

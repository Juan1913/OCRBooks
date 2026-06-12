import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './presentation/components/AppLayout'
import { HomePage } from './presentation/pages/HomePage'
import { ProcessingPage } from './presentation/pages/ProcessingPage'
import { ReviewPage } from './presentation/pages/ReviewPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 2000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/processing/:bookId" element={<ProcessingPage />} />
            <Route path="/review/:bookId/:pageNumber" element={<ReviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

import type { ReactNode } from 'react'
import { BooksSidebar } from './BooksSidebar'

interface Props {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <BooksSidebar />
      <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-gray-50">
        {children}
      </div>
    </div>
  )
}

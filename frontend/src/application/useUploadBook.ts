import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { bookApi } from '../infrastructure/api/bookApi'

export interface UploadState {
  uploading: boolean
  error: string | null
}

export function useUploadBook() {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const upload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setState({ uploading: false, error: 'Solo se aceptan archivos PDF' })
      return
    }
    setState({ uploading: true, error: null })
    try {
      const result = await bookApi.upload(file)
      await qc.invalidateQueries({ queryKey: ['books'] })
      navigate(`/processing/${result.id}`)
    } catch (e: unknown) {
      setState({ uploading: false, error: (e as Error).message ?? 'Error al subir el archivo' })
    }
  }, [navigate, qc])

  return { ...state, upload }
}

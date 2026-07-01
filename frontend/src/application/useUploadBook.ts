import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { bookApi } from '../infrastructure/api/bookApi'

export interface UploadState {
  uploading: boolean
  error: string | null
  pendingFile: File | null  // file waiting for AI mode selection
}

export function useUploadBook() {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null, pendingFile: null })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const selectFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setState(s => ({ ...s, error: 'Solo se aceptan archivos PDF' }))
      return
    }
    setState(s => ({ ...s, pendingFile: file, error: null }))
  }, [])

  const upload = useCallback(async (file: File, aiMode?: string | null) => {
    setState(s => ({ ...s, uploading: true, error: null, pendingFile: null }))
    try {
      const result = await bookApi.upload(file, aiMode)
      await qc.invalidateQueries({ queryKey: ['books'] })
      navigate(`/processing/${result.id}`)
    } catch (e: unknown) {
      setState({ uploading: false, error: (e as Error).message ?? 'Error al subir el archivo', pendingFile: null })
    }
  }, [navigate, qc])

  const cancelPending = useCallback(() => {
    setState(s => ({ ...s, pendingFile: null }))
  }, [])

  return { ...state, selectFile, upload, cancelPending }
}

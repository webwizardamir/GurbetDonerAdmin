import { useState, useEffect, useCallback } from 'react'
import type { DocumentSettings } from '../types'
import { fetchDocumentSettings, updateDocumentSettings } from '../services/documents'

export function useDocumentSettings() {
  const [settings, setSettings] = useState<DocumentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDocumentSettings()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (
    updates: Partial<Omit<DocumentSettings, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateDocumentSettings(updates)
      setSettings(updated)
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      setError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    settings,
    loading,
    saving,
    error,
    save,
    refresh: load,
  }
}

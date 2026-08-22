import { useCallback, useEffect, useState } from 'react'
import * as estimateApi from '../api/estimateApi'

// Data-access hook for the per-job Estimate worksheet, backed by the SQLite
// API (server/estimateRoutes.js). Plain fetch + refetch-after-mutation, same
// shape as useSchedule.js — fine for this app's size.
export function useEstimate(jobId) {
  const [data, setData] = useState({ groups: [], totals: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(() => {
    if (!jobId) {
      setData({ groups: [], totals: null })
      return Promise.resolve()
    }
    setLoading(true)
    setError(null)
    return estimateApi
      .getEstimate(jobId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addGroup = useCallback((name) => estimateApi.createGroup(jobId, name).then(refresh), [jobId, refresh])
  const removeGroup = useCallback((id) => estimateApi.deleteGroup(id).then(refresh), [refresh])
  const saveItem = useCallback(
    (form) => (form.id ? estimateApi.updateItem(form.id, form) : estimateApi.createItem(jobId, form)).then(refresh),
    [jobId, refresh],
  )
  const removeItem = useCallback((item) => estimateApi.deleteItem(item.id).then(refresh), [refresh])
  const duplicateItem = useCallback((item) => estimateApi.duplicateItem(item.id).then(refresh), [refresh])

  return { ...data, loading, error, addGroup, removeGroup, saveItem, removeItem, duplicateItem, refresh }
}

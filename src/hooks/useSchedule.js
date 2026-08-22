import { useCallback, useEffect, useState } from 'react'
import * as scheduleApi from '../api/scheduleApi'

// Shared data-access hook for schedule items, backed by the SQLite API
// (server/index.js). Both Schedule.jsx and Dashboard.jsx use this so they
// read from the same live source — fixes the old bug where Dashboard read
// a separate static import that never reflected Schedule page edits.
//
// Deliberately a plain fetch + refetch-after-mutation hook, not React
// Query/SWR/Redux — fine for this app's size. Worth revisiting if this
// needs caching across route changes or background refetch later.
export function useSchedule(jobId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(() => {
    if (!jobId) {
      setItems([])
      return Promise.resolve()
    }
    setLoading(true)
    setError(null)
    return scheduleApi
      .listItems(jobId)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = useCallback(
    (form) => (form.id ? scheduleApi.updateItem(form.id, form) : scheduleApi.createItem(jobId, form)).then(refresh),
    [jobId, refresh],
  )
  const remove = useCallback((item) => scheduleApi.deleteItem(item.id).then(refresh), [refresh])
  const copy = useCallback((item) => scheduleApi.copyItem(item).then(refresh), [refresh])

  return { items, loading, error, save, remove, copy, refresh }
}

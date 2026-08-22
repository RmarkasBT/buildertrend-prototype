import { useCallback, useEffect, useState } from 'react'
import * as dailyLogApi from '../api/dailyLogApi'

// Data-access hook for a job's daily logs, backed by the SQLite API. Same
// plain fetch + refetch-after-mutation shape as useSchedule — no React
// Query/SWR — which is fine at this app's size.
//
// `filters` is passed straight through to the API so the live filter
// drawer's criteria are applied server-side rather than by filtering an
// already-fetched page in the browser.
export function useDailyLogs(jobId, filters) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Serialised so a caller can pass a fresh object literal each render
  // without re-triggering the fetch on every keystroke elsewhere.
  const filterKey = JSON.stringify(filters ?? {})

  const refresh = useCallback(() => {
    if (!jobId) {
      setLogs([])
      return Promise.resolve()
    }
    setLoading(true)
    setError(null)
    return dailyLogApi
      .listLogs(jobId, JSON.parse(filterKey))
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [jobId, filterKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  const remove = useCallback((log) => dailyLogApi.deleteLog(log.id).then(refresh), [refresh])

  // Like updates one row, so patch it in place instead of refetching the
  // whole list — refetching would re-sort and visibly jump the card.
  const like = useCallback(
    (log) => dailyLogApi.toggleLike(log.id).then((updated) => {
      setLogs((current) => current.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
      return updated
    }),
    [],
  )

  return { logs, loading, error, refresh, remove, like }
}

// Single-log hook for the detail page, which also needs the comment thread.
export function useDailyLog(id) {
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(() => {
    if (!id) return Promise.resolve()
    setLoading(true)
    return dailyLogApi
      .getLog(id)
      .then(setLog)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    log,
    loading,
    error,
    refresh,
    like: () => dailyLogApi.toggleLike(id).then(setLog),
    addComment: (body) => dailyLogApi.addComment(id, body).then(setLog),
    deleteComment: (commentId) => dailyLogApi.deleteComment(commentId).then(setLog),
  }
}

// Company-wide Daily Log settings (the gear-icon modal). Also read by the
// add form, which seeds a new log's Notes/weather/share defaults from it.
export function useDailyLogSettings() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    dailyLogApi.getSettings().then(setSettings).catch(() => setSettings(null))
  }, [])

  return { settings, setSettings, save: (body) => dailyLogApi.updateSettings(body).then(setSettings) }
}

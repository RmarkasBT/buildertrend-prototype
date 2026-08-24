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
  // `error` is a failure to LOAD; `writeError` is a rejected mutation. They
  // render differently — one replaces the view, the other annotates it.
  const [error, setError] = useState(null)
  const [writeError, setWriteError] = useState(null)
  const [lastChangeSet, setLastChangeSet] = useState(null)

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

  // Every mutation funnels through this so a rejected write can't vanish.
  // Previously these were bare `.then(refresh)` with no catch, so a 400 from
  // the server (a dependency loop, a bad field) became an unhandled promise
  // rejection and the user saw nothing at all — the bar just snapped back.
  const run = useCallback(
    (promise) =>
      promise.then(
        (result) => {
          setWriteError(null)
          return refresh().then(() => result)
        },
        (err) => {
          setWriteError(err.message)
          return refresh().then(() => Promise.reject(err))
        },
      ),
    [refresh],
  )

  const save = useCallback(
    (form) => run(form.id ? scheduleApi.updateItem(form.id, form) : scheduleApi.createItem(jobId, form)),
    [jobId, run],
  )
  const remove = useCallback((item) => run(scheduleApi.deleteItem(item.id)), [run])
  const copy = useCallback((item) => run(scheduleApi.copyItem(item)), [run])

  // Date moves go through batch, not save: moving a bar usually moves its
  // successors too, and that has to be one atomic, undoable write.
  const applyChanges = useCallback(
    (changes, opts) =>
      run(scheduleApi.batchUpdate(jobId, changes, opts)).then((res) => {
        if (res?.changeSet) setLastChangeSet(res.changeSet)
        return res
      }),
    [jobId, run],
  )

  const undo = useCallback(
    (changeSetId, opts) =>
      run(scheduleApi.undoChangeSet(changeSetId, opts)).then((res) => {
        setLastChangeSet(null)
        return res
      }),
    [run],
  )

  return {
    items,
    loading,
    error,
    writeError,
    clearWriteError: () => setWriteError(null),
    save,
    remove,
    copy,
    refresh,
    applyChanges,
    undo,
    lastChangeSet,
  }
}

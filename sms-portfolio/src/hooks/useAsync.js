import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

/**
 * Runs an async function whenever `deps` change.
 * Returns { data, error, loading, reload }. Stale responses are ignored.
 */
export function useAsync(fn, deps = [], tables = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  const instanceId = useId()
  const tablesKey = tables.join(',')

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))
    fn()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!tablesKey) return undefined
    const channel = supabase.channel(`live-query-${instanceId}`)
    tablesKey.split(',').forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, reload)
    })
    channel.subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`Realtime subscription failed for ${tablesKey}`, error)
      }
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tablesKey, instanceId, reload])

  return { ...state, reload }
}

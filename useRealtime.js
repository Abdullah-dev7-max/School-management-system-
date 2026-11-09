import { useEffect } from 'react'
import { subscribeToTable } from '../services/supabaseService.js'

/** Calls `reload` (debounced) whenever rows change in `table`. `reload` must be stable. */
export function useRealtimeReload(table, reload, filter) {
  useEffect(() => {
    let timer
    const unsubscribe = subscribeToTable(
      table,
      () => {
        clearTimeout(timer)
        timer = setTimeout(reload, 400)
      },
      { filter }
    )
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [table, reload, filter])
}

import { supabase } from './supabaseClient.js'

export async function invokeRoleAuth(body) {
  const { data, error } = await supabase.functions.invoke('role-auth', {
    body,
    headers: { 'Content-Type': 'application/json' },
  })
  if (error) {
    let message = error.message
    let status
    if (error.context instanceof Response) {
      status = error.context.status
      const payload = await error.context.clone().json().catch(() => null)
      if (typeof payload?.error === 'string') message = payload.error
    }
    const requestError = new Error(message)
    requestError.status = status
    throw requestError
  }
  if (data?.error) throw new Error(data.error)
  return data
}

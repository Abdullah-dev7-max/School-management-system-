import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !authorization?.startsWith('Bearer ')) {
    return response({ error: 'The request is unauthenticated or the function is not configured.' }, 401)
  }

  let input: { requestId?: string }
  try {
    input = await request.json()
    if (typeof input.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.requestId)) {
      return response({ error: 'Choose a valid Admin access request.' }, 400)
    }
  } catch {
    return response({ error: 'Invalid request body.' }, 400)
  }

  const accessToken = authorization.slice('Bearer '.length)
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return response({ error: 'Your session is invalid or expired. Sign in again.' }, 401)
  }

  const { data: approvedRequest, error: approvalError } = await authClient.rpc(
    'approve_admin_request',
    { p_request_id: input.requestId },
  )
  if (approvalError) return response({ error: approvalError.message }, 403)
  if (!approvedRequest?.email) {
    return response({ error: 'Approval completed without a notification address.' }, 500)
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('ADMIN_APPROVAL_FROM_EMAIL')
  const loginUrl = Deno.env.get('ADMIN_APPROVAL_LOGIN_URL') ?? 'https://school-manage-sys.pages.dev/login'
  if (!apiKey || !from) {
    return response({
      success: true,
      emailSent: false,
      message: 'Access was transferred, but the approval email sender is not configured.',
    })
  }

  const name = typeof approvedRequest.full_name === 'string' && approvedRequest.full_name.trim()
    ? approvedRequest.full_name.trim()
    : 'Administrator'
  const escapedName = escapeHtml(name)
  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [approvedRequest.email],
        subject: 'Scholara Admin access approved',
        text: `Hello ${name}, your Scholara Admin access has been approved. Sign in at ${loginUrl}.`,
        html: `<p>Hello ${escapedName},</p><p>Your Scholara Admin access has been approved. You can now sign in to the Admin panel.</p><p><a href="${escapeHtml(loginUrl)}">Sign in to Scholara</a></p>`,
      }),
    })
    if (!emailResponse.ok) {
      const details = await emailResponse.text()
      console.error('Admin approval email delivery failed:', details)
      return response({
        success: true,
        emailSent: false,
        message: 'Access was transferred, but the approval email could not be delivered. Check the email provider configuration.',
      })
    }
    return response({ success: true, emailSent: true })
  } catch (error) {
    console.error('Admin approval email delivery failed:', error)
    return response({
      success: true,
      emailSent: false,
      message: 'Access was transferred, but the approval email could not be delivered. Check the email provider configuration.',
    })
  }
})

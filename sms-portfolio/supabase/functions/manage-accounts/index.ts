import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type AccountInput = {
  action: 'create_student' | 'create_teacher'
  fullName: string
  email: string
  password: string
  phone?: string
  admissionNo?: string
  classId?: string
  rollNo?: string | number
  status?: string
  employeeCode?: string
  subject?: string
  parentName?: string
  parentEmail?: string
  parentPhone?: string
  parentPassword?: string
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  return value.trim()
}

function validatePassword(password: unknown, label: string) {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error(`${label} must be at least 12 characters.`)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization?.startsWith('Bearer ')) {
    return response({ error: 'Account service is not configured or request is unauthenticated.' }, 401)
  }

  let input: AccountInput
  try {
    input = await request.json()
    if (input.action !== 'create_student' && input.action !== 'create_teacher') {
      return response({ error: 'Unsupported account creation action.' }, 400)
    }

    requiredText(input.fullName, 'Full name')
    requiredText(input.email, 'Email')
    validatePassword(input.password, 'Initial password')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      throw new Error('Enter a valid email address.')
    }
    if (input.action === 'create_student') {
      requiredText(input.admissionNo, 'Admission number')
      if (input.rollNo !== '' && input.rollNo != null && (!Number.isInteger(Number(input.rollNo)) || Number(input.rollNo) < 1)) {
        throw new Error('Roll number must be a positive whole number.')
      }

      const parentFields = [input.parentName, input.parentEmail, input.parentPassword]
      if (parentFields.some((value) => Boolean(value?.trim?.()))) {
        requiredText(input.parentName, 'Parent name')
        requiredText(input.parentEmail, 'Parent email')
        validatePassword(input.parentPassword, 'Parent initial password')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.parentEmail.trim())) {
          throw new Error('Enter a valid parent email address.')
        }
      }
    } else {
      requiredText(input.employeeCode, 'Employee code')
      requiredText(input.subject, 'Subject')
    }
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Invalid account details.' }, 400)
  }

  const token = authorization.slice('Bearer '.length)
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return response({ error: 'Your session is invalid or expired. Sign in again.' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: caller, error: callerError } = await adminClient
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle()
  if (callerError) return response({ error: callerError.message }, 500)
  if (caller?.role !== 'admin') return response({ error: 'Administrator access is required.' }, 403)

  const createdAuthIds: string[] = []
  const createdProfileIds: string[] = []
  try {
    const createAuthProfile = async (name: string, email: string, password: string, role: 'student' | 'teacher' | 'parent', phone?: string) => {
      const { data: profile, error: profileError } = await adminClient
        .from('users')
        .insert({
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          phone: phone?.trim() || null,
        })
        .select('id')
        .single()
      if (profileError) throw profileError
      createdProfileIds.push(profile.id)

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: name.trim() },
      })
      if (createError) throw createError
      createdAuthIds.push(created.user.id)
      return { authId: created.user.id, profileId: profile.id }
    }

    const primary = await createAuthProfile(
      input.fullName,
      input.email,
      input.password,
      input.action === 'create_student' ? 'student' : 'teacher',
      input.phone
    )

    if (input.action === 'create_student') {
      let parentProfileId: string | null = null
      if (input.parentName?.trim() && input.parentEmail?.trim() && input.parentPassword) {
        const parent = await createAuthProfile(
          input.parentName,
          input.parentEmail,
          input.parentPassword,
          'parent',
          input.parentPhone
        )
        parentProfileId = parent.profileId
      }
      const { error: studentError } = await adminClient.from('students').insert({
        user_id: primary.profileId,
        admission_no: input.admissionNo.trim(),
        class_id: input.classId || null,
        roll_no: input.rollNo === '' || input.rollNo == null ? null : Number(input.rollNo),
        status: input.status === 'inactive' || input.status === 'withdrawn' ? input.status : 'active',
        parent_id: parentProfileId,
      })
      if (studentError) throw studentError
    } else {
      const { error: teacherError } = await adminClient.from('teachers').insert({
        user_id: primary.profileId,
        employee_code: input.employeeCode.trim(),
        subject: input.subject.trim(),
        status: 'active',
      })
      if (teacherError) throw teacherError
    }

    return response({ success: true })
  } catch (error) {
    const cleanupErrors: string[] = []
    for (const profileId of createdProfileIds.reverse()) {
      const { error: cleanupError } = await adminClient.from('users').delete().eq('id', profileId)
      if (cleanupError) cleanupErrors.push(cleanupError.message)
    }
    for (const authId of createdAuthIds.reverse()) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(authId)
      if (cleanupError) cleanupErrors.push(cleanupError.message)
    }
    const message = error instanceof Error ? error.message : 'Could not create account.'
    return response({
      error: cleanupErrors.length ? `${message} Cleanup error: ${cleanupErrors.join('; ')}` : message,
    }, 400)
  }
})

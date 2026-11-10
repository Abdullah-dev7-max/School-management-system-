import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const ITERATIONS = 310_000
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000

type Role = 'teacher' | 'student'
type Input = {
  action: 'login' | 'restore' | 'logout' | 'dashboard'
  role?: Role
  email?: string
  password?: string
  token?: string
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

function encodeBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
}

async function digest(value: string) {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return encodeBase64(new Uint8Array(result))
}

async function createSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return encodeBase64(bytes)
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}

async function verifyPassword(password: string, salt: string, expected: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const actual = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: decodeBase64(salt), iterations: ITERATIONS },
    key,
    256
  )
  return constantTimeEqual(new Uint8Array(actual), decodeBase64(expected))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) return response({ error: 'The account service is not configured.' }, 500)

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const input = await request.json() as Input
    if (!['login', 'restore', 'logout', 'dashboard'].includes(input.action)) {
      return response({ error: 'Unsupported account action.' }, 400)
    }

    if (input.action === 'login') {
      if ((input.role !== 'teacher' && input.role !== 'student') || !input.email?.trim() || !input.password) {
        return response({ error: 'Enter a valid email address and password.' }, 400)
      }

      const { data: user, error: userError } = await admin
        .from('users')
        .select('id, full_name, email, phone, role')
        .eq('email', input.email.trim().toLowerCase())
        .eq('role', input.role)
        .maybeSingle()
      if (userError) throw userError

      const table = input.role === 'teacher' ? 'teachers' : 'students'
      const { data: account, error: accountError } = await admin
        .from(table)
        .select('password_salt, password, status')
        .eq('user_id', user?.id ?? '')
        .maybeSingle()
      if (accountError) throw accountError
      if (
        !user
        || !account
        || account.status !== 'active'
        || !account.password_salt
        || !account.password
        || !await verifyPassword(input.password, account.password_salt, account.password)
      ) {
        return response({ error: 'Invalid email or password.' }, 401)
      }

      const token = await createSessionToken()
      const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString()
      const { error: expiredSessionError } = await admin
        .from('role_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
      if (expiredSessionError) throw expiredSessionError
      const { error: sessionError } = await admin.from('role_sessions').insert({
        token_hash: await digest(token),
        user_id: user.id,
        role: input.role,
        expires_at: expiresAt,
      })
      if (sessionError) throw sessionError
      return response({
        token,
        expiresAt,
        profile: { ...user, role: input.role },
      })
    }

    if (!input.token || input.token.length > 256) return response({ error: 'Your session is invalid or expired. Sign in again.' }, 401)
    const tokenHash = await digest(input.token)

    if (input.action === 'logout') {
      const { error } = await admin.from('role_sessions').delete().eq('token_hash', tokenHash)
      if (error) throw error
      return response({ success: true })
    }

    const { data: activeSession, error: sessionError } = await admin
      .from('role_sessions')
      .select('user_id, role')
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (sessionError) throw sessionError
    if (!activeSession) return response({ error: 'Your session is invalid or expired. Sign in again.' }, 401)

    const table = activeSession.role === 'teacher' ? 'teachers' : 'students'
    const { data: account, error: accountError } = await admin
      .from(table)
      .select('status')
      .eq('user_id', activeSession.user_id)
      .maybeSingle()
    if (accountError) throw accountError
    if (account?.status !== 'active') return response({ error: 'This account is inactive.' }, 403)

    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, full_name, email, phone, role')
      .eq('id', activeSession.user_id)
      .eq('role', activeSession.role)
      .single()
    if (profileError) throw profileError
    if (input.action === 'restore') return response({ profile })

    if (activeSession.role === 'teacher') {
      const { data: teacher, error: teacherError } = await admin
        .from('teachers')
        .select('id, employee_code, subject')
        .eq('user_id', profile.id)
        .single()
      if (teacherError) throw teacherError
      const { data: classes, error: classesError } = await admin
        .from('classes')
        .select('id, name, section, academic_year')
        .eq('class_teacher_id', teacher.id)
        .order('name')
        .order('section')
      if (classesError) throw classesError
      const classIds = classes.map((item) => item.id)
      const { data: students, error: studentsError } = classIds.length
        ? await admin
          .from('students')
          .select('id, admission_no, roll_no, class_id, student:users!user_id(full_name)')
          .in('class_id', classIds)
          .eq('status', 'active')
          .order('admission_no')
        : { data: [], error: null }
      if (studentsError) throw studentsError
      const studentIds = students.map((student) => student.id)
      const [attendance, marks] = studentIds.length
        ? await Promise.all([
          admin.from('attendance').select('student_id, attended_on, status').in('student_id', studentIds).order('attended_on', { ascending: false }).limit(20),
          admin.from('marks').select('student_id, subject, exam, score, max_score, exam_date').in('student_id', studentIds).order('exam_date', { ascending: false }).limit(20),
        ])
        : [{ data: [], error: null }, { data: [], error: null }]
      if (attendance.error) throw attendance.error
      if (marks.error) throw marks.error
      return response({ role: activeSession.role, teacher, classes, students, attendance: attendance.data, marks: marks.data })
    }

    const { data: students, error: studentsError } = await admin
      .from('students')
      .select('id, user_id, parent_id, admission_no, roll_no, status, student:users!user_id(full_name), classes(id, name, section, academic_year)')
      .eq('user_id', profile.id)
      .order('admission_no')
    if (studentsError) throw studentsError
    const studentIds = students.map((student) => student.id)
    const [fees, attendance, marks] = studentIds.length
      ? await Promise.all([
        admin.from('fees').select('id, student_id, title, amount, amount_paid, due_date, status').in('student_id', studentIds).order('due_date', { ascending: false }),
        admin.from('attendance').select('student_id, attended_on, status').in('student_id', studentIds).order('attended_on', { ascending: false }).limit(30),
        admin.from('marks').select('student_id, subject, exam, score, max_score, exam_date').in('student_id', studentIds).order('exam_date', { ascending: false }).limit(30),
      ])
      : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
    if (fees.error) throw fees.error
    if (attendance.error) throw attendance.error
    if (marks.error) throw marks.error
    return response({ role: activeSession.role, students, fees: fees.data, attendance: attendance.data, marks: marks.data })
  } catch (error) {
    console.error('role-auth request failed:', error)
    return response({ error: error instanceof Error ? error.message : 'Account request failed.' }, 500)
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
}
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000

type Role = 'teacher' | 'student'
type Input = {
  action:
    | 'login'
    | 'restore'
    | 'logout'
    | 'dashboard'
    | 'attendance_sheet'
    | 'save_attendance'
    | 'marks_sheet'
    | 'save_marks'
    | 'teacher_notes'
    | 'create_note_upload'
    | 'save_note'
    | 'download_note'
  role?: Role
  email?: string
  password?: string
  token?: string
  classId?: string
  date?: string
  rows?: Array<{ student_id: string; attended_on: string; status: string }>
  subject?: string
  exam?: string
  examDate?: string | null
  maxScore?: number
  score?: number
  title?: string
  fileName?: string
  contentType?: string
  fileSize?: number
  storagePath?: string
  noteId?: string
}

const NOTES_BUCKET = 'class-notes'
const MAX_NOTE_SIZE = 10 * 1024 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NOTE_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) return response({ error: 'The account service is not configured.' }, 500)

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const input = await request.json() as Input
    if (![
      'login',
      'restore',
      'logout',
      'dashboard',
      'attendance_sheet',
      'save_attendance',
      'marks_sheet',
      'save_marks',
      'teacher_notes',
      'create_note_upload',
      'save_note',
      'download_note',
    ].includes(input.action)) {
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
      if (!user) return response({ error: 'Invalid email or password.' }, 401)

      const table = input.role === 'teacher' ? 'teachers' : 'students'
      const { data: account, error: accountError } = await admin
        .from(table)
        .select('password, status')
        .eq('user_id', user.id)
        .maybeSingle()
      if (accountError) throw accountError
      if (
        !account
        || account.status !== 'active'
        || account.password !== input.password
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

    if (input.action === 'attendance_sheet' || input.action === 'save_attendance') {
      if (activeSession.role !== 'teacher') return response({ error: 'Teacher access is required.' }, 403)
      if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > new Date().toISOString().slice(0, 10)) {
        return response({ error: 'Choose a valid attendance date that is not in the future.' }, 400)
      }

      const { data: teacher, error: teacherError } = await admin
        .from('teachers')
        .select('id')
        .eq('user_id', profile.id)
        .single()
      if (teacherError) throw teacherError

      const { data: classes, error: classesError } = await admin
        .from('classes')
        .select('id, name, section')
        .eq('class_teacher_id', teacher.id)
        .order('name')
        .order('section')
      if (classesError) throw classesError
      if (!input.classId) {
        if (input.action === 'save_attendance') return response({ error: 'Choose a class before saving attendance.' }, 400)
        return response({ classes, roster: [] })
      }
      const classItem = classes.find((item) => item.id === input.classId)
      if (!classItem) return response({ error: 'This class is not assigned to your teacher account.' }, 403)

      const { data: roster, error: rosterError } = await admin
        .from('students')
        .select('id, roll_no, admission_no, student:users!user_id(full_name)')
        .eq('class_id', classItem.id)
        .eq('status', 'active')
        .order('roll_no')
      if (rosterError) throw rosterError

      if (input.action === 'save_attendance') {
        const validStatuses = new Set(['present', 'absent', 'late', 'excused'])
        const rosterIds = new Set(roster.map((student) => student.id))
        if (
          !Array.isArray(input.rows)
          || input.rows.length !== roster.length
          || input.rows.some((row) =>
            !row
            || !rosterIds.has(row.student_id)
            || row.attended_on !== input.date
            || !validStatuses.has(row.status)
          )
        ) {
          return response({ error: 'Mark every student in this class before saving attendance.' }, 400)
        }

        const { error: saveError } = await admin.from('attendance').upsert(
          input.rows.map((row) => ({ ...row, marked_by: teacher.id })),
          { onConflict: 'student_id,attended_on' }
        )
        if (saveError) throw saveError
        return response({ success: true })
      }

      const { data: records, error: recordsError } = await admin
        .from('attendance')
        .select('student_id, status')
        .eq('attended_on', input.date)
        .in('student_id', roster.map((student) => student.id))
      if (recordsError) throw recordsError
      const statusByStudent = new Map(records.map((record) => [record.student_id, record.status]))
      return response({
        classes,
        roster: roster.map((student) => ({
          id: student.id,
          rollNo: student.roll_no,
          admissionNo: student.admission_no,
          name: student.student?.full_name ?? 'Unknown student',
          status: statusByStudent.get(student.id) ?? null,
        })),
      })
    }

    if (input.action === 'marks_sheet' || input.action === 'save_marks' || input.action === 'teacher_notes' || input.action === 'create_note_upload' || input.action === 'save_note') {
      if (activeSession.role !== 'teacher') return response({ error: 'Teacher access is required.' }, 403)

      const { data: teacher, error: teacherError } = await admin
        .from('teachers')
        .select('id')
        .eq('user_id', profile.id)
        .single()
      if (teacherError) throw teacherError

      const { data: classes, error: classesError } = await admin
        .from('classes')
        .select('id, name, section')
        .eq('class_teacher_id', teacher.id)
        .order('name')
        .order('section')
      if (classesError) throw classesError

      if (input.action === 'teacher_notes') {
        const { data: notes, error: notesError } = await admin
          .from('class_notes')
          .select('id, class_id, title, subject, file_name, content_type, file_size, created_at')
          .eq('teacher_id', teacher.id)
          .order('created_at', { ascending: false })
        if (notesError) throw notesError
        return response({ classes, notes })
      }

      if (input.action === 'marks_sheet' && !input.classId) {
        return response({ classes, roster: [] })
      }
      const classItem = classes.find((item) => item.id === input.classId)
      if (!classItem) return response({ error: 'This class is not assigned to your teacher account.' }, 403)
      const { data: roster, error: rosterError } = await admin
        .from('students')
        .select('id, roll_no, admission_no, student:users!user_id(full_name)')
        .eq('class_id', classItem.id)
        .eq('status', 'active')
        .order('roll_no')
      if (rosterError) throw rosterError

      if (input.action === 'marks_sheet' || input.action === 'save_marks') {
        if (input.action === 'marks_sheet') {
          const recordsResult = input.subject?.trim() && input.exam?.trim() && roster.length
            ? await admin
              .from('marks')
              .select('student_id, score, max_score, exam_date')
              .eq('subject', input.subject.trim())
              .eq('exam', input.exam.trim())
              .in('student_id', roster.map((student) => student.id))
            : { data: [], error: null }
          if (recordsResult.error) throw recordsResult.error
          const recordsByStudent = new Map(recordsResult.data.map((record) => [record.student_id, record]))
          return response({
            classes,
            roster: roster.map((student) => {
              const record = recordsByStudent.get(student.id)
              return {
                id: student.id,
                rollNo: student.roll_no,
                admissionNo: student.admission_no,
                name: student.student?.full_name ?? 'Unknown student',
                score: record?.score ?? '',
                maxScore: record?.max_score ?? '',
                examDate: record?.exam_date ?? '',
              }
            }),
          })
        }

        const subject = input.subject?.trim()
        const exam = input.exam?.trim()
        const maxScore = Number(input.maxScore)
        const validDate = !input.examDate || /^\d{4}-\d{2}-\d{2}$/.test(input.examDate)
        const studentIds = new Set(roster.map((student) => student.id))
        if (
          !subject || subject.length > 120
          || !exam || exam.length > 120
          || !Number.isFinite(maxScore) || maxScore <= 0
          || !validDate
          || !Array.isArray(input.rows) || input.rows.length === 0
          || input.rows.length > roster.length
          || input.rows.some((row) =>
            !row
            || !studentIds.has(row.student_id)
            || !Number.isFinite(Number(row.score))
            || Number(row.score) < 0
            || Number(row.score) > maxScore
          )
          || new Set(input.rows.map((row) => row.student_id)).size !== input.rows.length
        ) {
          return response({ error: 'Check the exam details and student marks, then try again.' }, 400)
        }

        const { error: saveError } = await admin.from('marks').upsert(
          input.rows.map((row) => ({
            student_id: row.student_id,
            subject,
            exam,
            score: Number(row.score),
            max_score: maxScore,
            exam_date: input.examDate || null,
            teacher_id: teacher.id,
          })),
          { onConflict: 'student_id,subject,exam' }
        )
        if (saveError) throw saveError
        return response({ success: true })
      }

      if (input.action === 'create_note_upload') {
        const fileName = input.fileName?.split(/[\\/]/).pop()?.trim() ?? ''
        const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
        const expectedType = NOTE_TYPES[extension]
        if (
          !fileName || fileName.length > 180
          || !expectedType || input.contentType !== expectedType
          || !Number.isInteger(input.fileSize) || input.fileSize! <= 0 || input.fileSize! > MAX_NOTE_SIZE
        ) {
          return response({ error: 'Upload a supported PDF, Word, PowerPoint, text, JPG, or PNG file up to 10 MB.' }, 400)
        }
        const storagePath = `${teacher.id}/${classItem.id}/${crypto.randomUUID()}`
        const { data: upload, error: uploadError } = await admin.storage
          .from(NOTES_BUCKET)
          .createSignedUploadUrl(storagePath)
        if (uploadError) throw uploadError
        return response({ path: storagePath, token: upload.token })
      }

      if (input.action === 'save_note') {
        const title = input.title?.trim()
        const subject = input.subject?.trim()
        const fileName = input.fileName?.split(/[\\/]/).pop()?.trim() ?? ''
        const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
        const expectedType = NOTE_TYPES[extension]
        const pathPrefix = `${teacher.id}/${classItem.id}/`
        if (
          !title || title.length > 160
          || !subject || subject.length > 120
          || !fileName || fileName.length > 180
          || !expectedType || input.contentType !== expectedType
          || !Number.isInteger(input.fileSize) || input.fileSize! <= 0 || input.fileSize! > MAX_NOTE_SIZE
          || !input.storagePath?.startsWith(pathPrefix)
          || !UUID_PATTERN.test(input.storagePath.slice(pathPrefix.length))
        ) {
          return response({ error: 'The note details are invalid. Please upload the file again.' }, 400)
        }

        const { data: note, error: noteError } = await admin
          .from('class_notes')
          .insert({
            class_id: classItem.id,
            teacher_id: teacher.id,
            title,
            subject,
            file_name: fileName,
            content_type: input.contentType,
            file_size: input.fileSize,
            storage_path: input.storagePath,
          })
          .select('id, class_id, title, subject, file_name, content_type, file_size, created_at')
          .single()
        if (noteError) {
          const { error: cleanupError } = await admin.storage.from(NOTES_BUCKET).remove([input.storagePath])
          if (cleanupError) throw new Error(`${noteError.message} Uploaded file cleanup failed: ${cleanupError.message}`)
          throw noteError
        }
        return response({ note })
      }
    }

    if (input.action === 'download_note') {
      if (!input.noteId || !UUID_PATTERN.test(input.noteId)) {
        return response({ error: 'Choose a valid class note.' }, 400)
      }
      const { data: note, error: noteError } = await admin
        .from('class_notes')
        .select('id, class_id, teacher_id, storage_path')
        .eq('id', input.noteId)
        .maybeSingle()
      if (noteError) throw noteError
      if (!note) return response({ error: 'This class note is no longer available.' }, 404)

      let canRead = false
      if (activeSession.role === 'teacher') {
        const { data: teacher, error: teacherError } = await admin
          .from('teachers')
          .select('id')
          .eq('user_id', profile.id)
          .single()
        if (teacherError) throw teacherError
        canRead = note.teacher_id === teacher.id
      } else {
        const { data: student, error: studentError } = await admin
          .from('students')
          .select('class_id')
          .eq('user_id', profile.id)
          .single()
        if (studentError) throw studentError
        canRead = note.class_id === student.class_id
      }
      if (!canRead) return response({ error: 'You do not have access to this class note.' }, 403)

      const { data: signedFile, error: signedFileError } = await admin.storage
        .from(NOTES_BUCKET)
        .createSignedUrl(note.storage_path, 60)
      if (signedFileError) throw signedFileError
      return response({ signedUrl: signedFile.signedUrl })
    }

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
      const { data: timetable, error: timetableError } = await admin
        .from('timetable_slots')
        .select('id, class_id, day_of_week, period, starts_at, ends_at, subject, room')
        .eq('teacher_id', teacher.id)
        .order('day_of_week')
        .order('period')
      if (timetableError) throw timetableError
      const timetableClassIds = [...new Set(timetable.map((slot) => slot.class_id))]
      const timetableClassesResult = timetableClassIds.length
        ? await admin.from('classes').select('id, name, section').in('id', timetableClassIds)
        : { data: [], error: null }
      if (timetableClassesResult.error) throw timetableClassesResult.error
      const timetableClassNames = new Map(
        timetableClassesResult.data.map((item) => [item.id, `${item.name} ${item.section}`])
      )
      const scheduledSlots = timetable.map((slot) => ({
        ...slot,
        className: timetableClassNames.get(slot.class_id) ?? 'Class',
      }))
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
      return response({ role: activeSession.role, teacher, classes, students, timetable: scheduledSlots, attendance: attendance.data, marks: marks.data })
    }

    const { data: students, error: studentsError } = await admin
      .from('students')
      .select('id, user_id, parent_id, class_id, admission_no, roll_no, status, student:users!user_id(full_name), classes(id, name, section, academic_year)')
      .eq('user_id', profile.id)
      .order('admission_no')
    if (studentsError) throw studentsError
    const studentIds = students.map((student) => student.id)
    const classIds = [...new Set(students.map((student) => student.class_id).filter(Boolean))]
    const [fees, attendance, marks, notes] = studentIds.length
      ? await Promise.all([
        admin.from('fees').select('id, student_id, title, amount, amount_paid, discount_total, late_fine_total, due_date, fee_month, status').in('student_id', studentIds).order('due_date', { ascending: false }),
        admin.from('attendance').select('student_id, attended_on, status').in('student_id', studentIds).order('attended_on', { ascending: false }).limit(30),
        admin.from('marks').select('student_id, subject, exam, score, max_score, exam_date').in('student_id', studentIds).order('exam_date', { ascending: false }).limit(30),
        classIds.length
          ? admin.from('class_notes').select('id, class_id, title, subject, file_name, file_size, created_at').in('class_id', classIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])
      : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
    if (fees.error) throw fees.error
    if (attendance.error) throw attendance.error
    if (marks.error) throw marks.error
    if (notes.error) throw notes.error
    const feeIds = fees.data.map((fee) => fee.id)
    const { data: payments, error: paymentsError } = feeIds.length
      ? await admin
        .from('fee_payments')
        .select('id, fee_id, amount, paid_on, receipt_no, remaining_balance')
        .in('fee_id', feeIds)
        .order('paid_on', { ascending: false })
      : { data: [], error: null }
    if (paymentsError) throw paymentsError
    const feesById = new Map(fees.data.map((fee) => [fee.id, fee]))
    return response({
      role: activeSession.role,
      students,
      fees: fees.data,
      payments: payments.map((payment) => ({
        ...payment,
        title: feesById.get(payment.fee_id)?.title ?? 'Fee payment',
      })),
      notes: notes.data,
      attendance: attendance.data,
      marks: marks.data,
    })
  } catch (error) {
    console.error('role-auth request failed:', error)
    return response({ error: error instanceof Error ? error.message : 'Account request failed.' }, 500)
  }
})

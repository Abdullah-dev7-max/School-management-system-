import { supabase } from './supabaseClient.js'
import { daysAgo, toISODate } from './format.js'

/** supabase-js resolves with { data, error }. Turn errors into thrown exceptions. */
function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

const className = (c) => (c ? `${c.name} ${c.section}` : 'Unassigned')

/* ----------------------------- Admin ----------------------------- */

export async function fetchAdminOverview() {
  const since = toISODate(daysAgo(13))
  const [students, teachers, fees, attendance] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('fees').select('id, student_id, title, amount, amount_paid, due_date, paid_on, status'),
    supabase.from('attendance').select('student_id, attended_on, status').gte('attended_on', since).order('attended_on'),
  ])
  if (students.error) throw new Error(students.error.message)
  if (teachers.error) throw new Error(teachers.error.message)

  return {
    studentCount: students.count ?? 0,
    teacherCount: teachers.count ?? 0,
    fees: unwrap(fees),
    attendance: unwrap(attendance),
  }
}

export async function fetchStudentDirectory() {
  return unwrap(
    await supabase
      .from('students')
      .select(
        'id, admission_no, roll_no, gender, classes(id, name, section), student:users!user_id(full_name, email), guardian:users!parent_id(full_name, phone)'
      )
      .order('admission_no')
  )
}

export async function fetchStudentsPage() {
  const [students, classes] = await Promise.all([
    supabase
      .from('students')
      .select(
        'id, user_id, class_id, admission_no, roll_no, status, classes(id, name, section), student:users!user_id(id, full_name, email)'
      )
      .order('admission_no'),
    supabase.from('classes').select('id, name, section').order('name').order('section'),
  ])
  return { students: unwrap(students), classes: unwrap(classes) }
}

export async function createStudent({ fullName, email, admissionNo, classId, rollNo, status }) {
  const user = unwrap(
    await supabase
      .from('users')
      .insert({ full_name: fullName, email, role: 'student' })
      .select('id')
      .single()
  )

  try {
    unwrap(
      await supabase.from('students').insert({
        user_id: user.id,
        admission_no: admissionNo,
        class_id: classId || null,
        roll_no: rollNo === '' ? null : Number(rollNo),
        status,
      })
    )
  } catch (error) {
    const rollback = await supabase.from('users').delete().eq('id', user.id)
    if (rollback.error) {
      throw new Error(`${error.message} Also, the new user profile could not be removed: ${rollback.error.message}`)
    }
    throw error
  }
}

export async function updateStudent(student, { fullName, email, admissionNo, classId, rollNo, status }) {
  unwrap(
    await supabase
      .from('users')
      .update({ full_name: fullName, email })
      .eq('id', student.user_id)
  )

  const result = await supabase
    .from('students')
    .update({
      admission_no: admissionNo,
      class_id: classId || null,
      roll_no: rollNo === '' ? null : Number(rollNo),
      status,
    })
    .eq('id', student.id)

  if (result.error) {
    const rollback = await supabase
      .from('users')
      .update({ full_name: student.student.full_name, email: student.student.email })
      .eq('id', student.user_id)
    if (rollback.error) {
      throw new Error(`${result.error.message} The profile rollback also failed: ${rollback.error.message}`)
    }
    throw new Error(result.error.message)
  }
}

export async function deleteStudent(userId) {
  unwrap(await supabase.from('users').delete().eq('id', userId))
}

/* ----------------------------- Teacher ----------------------------- */

async function userByEmail(email, role) {
  const user = unwrap(await supabase.from('users').select('id, full_name').eq('email', email).eq('role', role).maybeSingle())
  if (!user) throw new Error(`No ${role} found for ${email}. Did you run database/schema.sql?`)
  return user
}

export async function fetchTeacherContext(email) {
  const user = await userByEmail(email, 'teacher')
  const teacher = unwrap(
    await supabase
      .from('teachers')
      .select('id, subject, classes(id, name, section, room)')
      .eq('user_id', user.id)
      .maybeSingle()
  )
  if (!teacher) throw new Error('This user has no teacher profile.')

  return {
    teacherId: teacher.id,
    name: user.full_name,
    subject: teacher.subject,
    classes: (teacher.classes ?? [])
      .map((c) => ({ id: c.id, label: className(c), room: c.room }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}

export async function fetchRoster(classId) {
  const rows = unwrap(
    await supabase
      .from('students')
      .select('id, roll_no, student:users!user_id(full_name)')
      .eq('class_id', classId)
      .order('roll_no')
  )
  return rows.map((r) => ({ id: r.id, rollNo: r.roll_no, name: r.student?.full_name ?? 'Unknown' }))
}

export async function fetchAttendanceSheet(classId, date) {
  const roster = await fetchRoster(classId)
  const ids = roster.map((s) => s.id)
  const existing = ids.length
    ? unwrap(await supabase.from('attendance').select('student_id, status').eq('attended_on', date).in('student_id', ids))
    : []
  return { roster, existing: Object.fromEntries(existing.map((r) => [r.student_id, r.status])) }
}

export async function saveAttendance(rows) {
  unwrap(await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,attended_on' }))
}

export async function fetchMarksSheet(classId, subject, exam) {
  const roster = await fetchRoster(classId)
  const ids = roster.map((s) => s.id)
  const existing = ids.length
    ? unwrap(
        await supabase
          .from('marks')
          .select('student_id, score, max_score')
          .eq('subject', subject)
          .eq('exam', exam)
          .in('student_id', ids)
      )
    : []
  return {
    roster,
    scores: Object.fromEntries(existing.map((r) => [r.student_id, String(Number(r.score))])),
    maxScore: existing.length ? Number(existing[0].max_score) : null,
  }
}

export async function saveMarks(rows) {
  unwrap(await supabase.from('marks').upsert(rows, { onConflict: 'student_id,subject,exam' }))
}

export async function fetchTimetable(teacherId) {
  return unwrap(
    await supabase
      .from('timetable_slots')
      .select('id, day_of_week, period, starts_at, ends_at, subject, room, classes(name, section)')
      .eq('teacher_id', teacherId)
      .order('day_of_week')
      .order('period')
  )
}

/* ----------------------------- Student & parent ----------------------------- */

const CHILD_COLS = 'id, roll_no, classes(name, section), student:users!user_id(full_name)'
const toChild = (r) => ({ id: r.id, name: r.student?.full_name ?? 'Student', className: className(r.classes), rollNo: r.roll_no })

/** Returns { children: [...] }. A student has one entry, a parent has one per child. */
export async function fetchPortalContext(role, email) {
  if (role === 'parent') {
    const user = await userByEmail(email, 'parent')
    const rows = unwrap(await supabase.from('students').select(CHILD_COLS).eq('parent_id', user.id).order('roll_no'))
    return { children: rows.map(toChild) }
  }
  const user = await userByEmail(email, 'student')
  const row = unwrap(await supabase.from('students').select(CHILD_COLS).eq('user_id', user.id).maybeSingle())
  return { children: row ? [toChild(row)] : [] }
}

export async function fetchStudentReport(studentId) {
  const since = toISODate(daysAgo(29))
  const [marks, attendance] = await Promise.all([
    supabase.from('marks').select('subject, exam, score, max_score, exam_date').eq('student_id', studentId),
    supabase.from('attendance').select('attended_on, status').eq('student_id', studentId).gte('attended_on', since),
  ])
  return { marks: unwrap(marks), attendance: unwrap(attendance) }
}

export async function fetchFees(studentId) {
  return unwrap(
    await supabase
      .from('fees')
      .select('id, title, amount, amount_paid, due_date, paid_on, status')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false })
  )
}

export async function fetchNotices(audience) {
  return unwrap(
    await supabase
      .from('notices')
      .select('id, title, body, category, pinned, published_at')
      .overlaps('audience', ['all', audience])
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(8)
  )
}

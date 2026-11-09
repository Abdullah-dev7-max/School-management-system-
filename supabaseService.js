/**
 * Scholara SMS · data access layer.
 * Every Supabase call in the app lives here so components never build queries.
 * All functions return plain data and throw an Error on failure.
 */
import { supabase } from '../lib/supabaseClient.js'
import { daysAgo, initials, toISODate } from '../lib/format.js'

/* ===================================================================== */
/* Helpers                                                               */
/* ===================================================================== */

/** supabase-js resolves with { data, error }. Turn errors into thrown exceptions. */
function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

const classLabel = (c) => (c ? `${c.name} ${c.section}` : 'Unassigned')

/** Strip characters that have special meaning inside a PostgREST `or()` / ILIKE filter. */
const sanitizeSearch = (value = '') => value.trim().replace(/[%*_,()\\]/g, ' ').replace(/\s+/g, ' ')

const feeStatusFor = (amount, paid) => (paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'pending')

/* ===================================================================== */
/* Profiles (who is the demo user for each role)                         */
/* ===================================================================== */

async function userByEmail(email, role) {
  const user = unwrap(await supabase.from('users').select('id, full_name').eq('email', email).eq('role', role).maybeSingle())
  if (!user) throw new Error(`No ${role} found for ${email}. Did you run database/schema.sql?`)
  return user
}

/** Live name and subtitle for the sidebar and hero, read from the database. */
export async function fetchProfileSummary(email, role) {
  const user = await userByEmail(email, role)

  if (role === 'teacher') {
    const t = unwrap(await supabase.from('teachers').select('subject, classes(name, section)').eq('user_id', user.id).maybeSingle())
    const classes = (t?.classes ?? []).map(classLabel).join(' and ')
    return { name: user.full_name, title: [t?.subject, classes].filter(Boolean).join(', ') || 'Teacher' }
  }
  if (role === 'student') {
    const s = unwrap(await supabase.from('students').select('roll_no, classes(name, section)').eq('user_id', user.id).maybeSingle())
    return { name: user.full_name, title: s ? `${classLabel(s.classes)}, Roll ${s.roll_no ?? '–'}` : 'Student' }
  }
  if (role === 'parent') {
    const kids = unwrap(await supabase.from('students').select('student:users!user_id(full_name)').eq('parent_id', user.id))
    const names = kids.map((k) => k.student?.full_name?.split(' ')[0]).filter(Boolean)
    return { name: user.full_name, title: names.length ? `Parent of ${names.join(' and ')}` : 'Parent' }
  }
  return { name: user.full_name, title: 'School administrator' }
}

/* ===================================================================== */
/* Students                                                              */
/* ===================================================================== */

const SORT_COLUMNS = { name: 'full_name', attendance: 'attendance_rate', admission: 'admission_no' }

const toDirectoryRow = (r) => ({
  id: r.id,
  name: r.full_name,
  email: r.email,
  admissionNo: r.admission_no,
  rollNo: r.roll_no,
  classId: r.class_id,
  className: r.class_label,
  guardian: r.guardian_name ?? '–',
  attendance: r.attendance_rate == null ? null : Number(r.attendance_rate),
  outstanding: Number(r.outstanding),
  feeState: r.fee_state,
})

/**
 * One page of the student directory. Search, filters, sorting and paging all run
 * in Postgres through the `student_directory` view (see step3_migration.sql).
 */
export async function fetchStudentDirectoryPage({
  search = '',
  classId = 'all',
  feeState = 'all',
  sortKey = 'name',
  sortDir = 'asc',
  page = 1,
  pageSize = 6,
} = {}) {
  let query = supabase.from('student_directory').select('*', { count: 'exact' })

  const term = sanitizeSearch(search)
  if (term) {
    query = query.or(
      ['full_name', 'email', 'admission_no', 'guardian_name'].map((col) => `${col}.ilike.%${term}%`).join(',')
    )
  }
  if (classId !== 'all') query = query.eq('class_id', classId)
  if (feeState !== 'all') query = query.eq('fee_state', feeState)

  const from = (page - 1) * pageSize
  const { data, count, error } = await query
    .order(SORT_COLUMNS[sortKey] ?? 'full_name', { ascending: sortDir === 'asc', nullsFirst: false })
    .order('id')
    .range(from, from + pageSize - 1)
  if (error) throw new Error(error.message)

  return { rows: data.map(toDirectoryRow), total: count ?? 0 }
}

/** Counts that feed the filter badges (classes and fee states). */
export async function fetchDirectoryFacets() {
  const rows = unwrap(await supabase.from('student_directory').select('class_id, class_label, fee_state'))
  const classes = new Map()
  const fees = { all: rows.length, overdue: 0, due: 0, clear: 0 }
  rows.forEach((r) => {
    if (r.class_id) {
      const entry = classes.get(r.class_id) ?? { id: r.class_id, label: r.class_label, count: 0 }
      entry.count += 1
      classes.set(r.class_id, entry)
    }
    fees[r.fee_state] += 1
  })
  return { classes: [...classes.values()].sort((a, b) => a.label.localeCompare(b.label)), fees }
}

export async function getStudent(id) {
  return unwrap(
    await supabase
      .from('students')
      .select('*, classes(id, name, section), student:users!user_id(full_name, email), guardian:users!parent_id(id, full_name, phone)')
      .eq('id', id)
      .maybeSingle()
  )
}

/** Creates the login-less user row, then the student row. Rolls the user back on failure. */
export async function createStudent({ fullName, email, classId = null, parentId = null, admissionNo, rollNo = null, dateOfBirth = null, gender = null }) {
  const user = unwrap(await supabase.from('users').insert({ full_name: fullName, email, role: 'student' }).select('id').single())
  try {
    return unwrap(
      await supabase
        .from('students')
        .insert({ user_id: user.id, class_id: classId, parent_id: parentId, admission_no: admissionNo, roll_no: rollNo, date_of_birth: dateOfBirth, gender })
        .select('id')
        .single()
    )
  } catch (error) {
    await supabase.from('users').delete().eq('id', user.id)
    throw error
  }
}

/** Pass only the fields you want to change. */
export async function updateStudent(id, { fullName, email, classId, parentId, admissionNo, rollNo, dateOfBirth, gender } = {}) {
  const current = unwrap(await supabase.from('students').select('user_id').eq('id', id).single())

  const userPatch = {}
  if (fullName !== undefined) userPatch.full_name = fullName
  if (email !== undefined) userPatch.email = email
  if (Object.keys(userPatch).length) unwrap(await supabase.from('users').update(userPatch).eq('id', current.user_id))

  const patch = {}
  if (classId !== undefined) patch.class_id = classId
  if (parentId !== undefined) patch.parent_id = parentId
  if (admissionNo !== undefined) patch.admission_no = admissionNo
  if (rollNo !== undefined) patch.roll_no = rollNo
  if (dateOfBirth !== undefined) patch.date_of_birth = dateOfBirth
  if (gender !== undefined) patch.gender = gender
  if (Object.keys(patch).length) unwrap(await supabase.from('students').update(patch).eq('id', id))
}

/** Deleting the user cascades to the student, their attendance, fees and marks. */
export async function deleteStudent(id) {
  const current = unwrap(await supabase.from('students').select('user_id').eq('id', id).single())
  unwrap(await supabase.from('users').delete().eq('id', current.user_id))
}

export async function fetchRoster(classId) {
  const rows = unwrap(
    await supabase.from('students').select('id, roll_no, student:users!user_id(full_name)').eq('class_id', classId).order('roll_no')
  )
  return rows.map((r) => ({ id: r.id, rollNo: r.roll_no, name: r.student?.full_name ?? 'Unknown' }))
}

/* ===================================================================== */
/* Teachers                                                              */
/* ===================================================================== */

export async function listTeachers() {
  const rows = unwrap(
    await supabase
      .from('teachers')
      .select('id, employee_code, subject, qualification, joined_on, teacher:users!user_id(full_name, email, phone), classes(id, name, section)')
      .order('employee_code')
  )
  return rows.map((t) => ({
    id: t.id,
    name: t.teacher?.full_name ?? 'Unknown',
    email: t.teacher?.email ?? '',
    phone: t.teacher?.phone ?? '',
    employeeCode: t.employee_code,
    subject: t.subject,
    qualification: t.qualification,
    joinedOn: t.joined_on,
    classes: (t.classes ?? []).map(classLabel),
  }))
}

export async function createTeacher({ fullName, email, phone = null, employeeCode, subject, qualification = null, joinedOn = null }) {
  const user = unwrap(await supabase.from('users').insert({ full_name: fullName, email, phone, role: 'teacher' }).select('id').single())
  try {
    return unwrap(
      await supabase
        .from('teachers')
        .insert({ user_id: user.id, employee_code: employeeCode, subject, qualification, joined_on: joinedOn })
        .select('id')
        .single()
    )
  } catch (error) {
    await supabase.from('users').delete().eq('id', user.id)
    throw error
  }
}

export async function updateTeacher(id, { fullName, email, phone, employeeCode, subject, qualification, joinedOn } = {}) {
  const current = unwrap(await supabase.from('teachers').select('user_id').eq('id', id).single())

  const userPatch = {}
  if (fullName !== undefined) userPatch.full_name = fullName
  if (email !== undefined) userPatch.email = email
  if (phone !== undefined) userPatch.phone = phone
  if (Object.keys(userPatch).length) unwrap(await supabase.from('users').update(userPatch).eq('id', current.user_id))

  const patch = {}
  if (employeeCode !== undefined) patch.employee_code = employeeCode
  if (subject !== undefined) patch.subject = subject
  if (qualification !== undefined) patch.qualification = qualification
  if (joinedOn !== undefined) patch.joined_on = joinedOn
  if (Object.keys(patch).length) unwrap(await supabase.from('teachers').update(patch).eq('id', id))
}

/** Classes they teach keep existing; their class_teacher_id is set to null. */
export async function deleteTeacher(id) {
  const current = unwrap(await supabase.from('teachers').select('user_id').eq('id', id).single())
  unwrap(await supabase.from('users').delete().eq('id', current.user_id))
}

/** The signed-in demo teacher: their profile and the classes they are class teacher of. */
export async function fetchTeacherContext(email) {
  const user = await userByEmail(email, 'teacher')
  const teacher = unwrap(
    await supabase.from('teachers').select('id, subject, classes(id, name, section, room)').eq('user_id', user.id).maybeSingle()
  )
  if (!teacher) throw new Error('This user has no teacher profile.')

  return {
    teacherId: teacher.id,
    name: user.full_name,
    subject: teacher.subject,
    classes: (teacher.classes ?? [])
      .map((c) => ({ id: c.id, label: classLabel(c), room: c.room }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}

/* ===================================================================== */
/* Classes                                                               */
/* ===================================================================== */

export async function listClasses() {
  const rows = unwrap(
    await supabase
      .from('classes')
      .select('id, name, section, room, academic_year, class_teacher_id, class_teacher:teachers!class_teacher_id(id, subject, user:users!user_id(full_name)), students(count)')
      .order('name')
      .order('section')
  )
  return rows.map((c) => ({
    id: c.id,
    label: classLabel(c),
    name: c.name,
    section: c.section,
    room: c.room,
    academicYear: c.academic_year,
    teacherId: c.class_teacher_id,
    teacherName: c.class_teacher?.user?.full_name ?? null,
    studentCount: c.students?.[0]?.count ?? 0,
  }))
}

export async function createClass({ name, section, room = null, classTeacherId = null, academicYear }) {
  const row = { name, section, room, class_teacher_id: classTeacherId }
  if (academicYear) row.academic_year = academicYear
  return unwrap(await supabase.from('classes').insert(row).select('id').single())
}

export async function updateClass(id, { name, section, room, classTeacherId, academicYear } = {}) {
  const patch = {}
  if (name !== undefined) patch.name = name
  if (section !== undefined) patch.section = section
  if (room !== undefined) patch.room = room
  if (classTeacherId !== undefined) patch.class_teacher_id = classTeacherId
  if (academicYear !== undefined) patch.academic_year = academicYear
  if (Object.keys(patch).length) unwrap(await supabase.from('classes').update(patch).eq('id', id))
}

/** Students in the class are kept and become unassigned. */
export async function deleteClass(id) {
  unwrap(await supabase.from('classes').delete().eq('id', id))
}

/* ===================================================================== */
/* Attendance                                                            */
/* ===================================================================== */

/** Roster for a class plus any status already recorded for the date. */
export async function fetchAttendanceSheet(classId, date) {
  const roster = await fetchRoster(classId)
  const ids = roster.map((s) => s.id)
  const existing = ids.length
    ? unwrap(await supabase.from('attendance').select('student_id, status').eq('attended_on', date).in('student_id', ids))
    : []
  return { roster, existing: Object.fromEntries(existing.map((r) => [r.student_id, r.status])) }
}

/** Insert or update. rows: [{ student_id, attended_on, status, marked_by?, note? }] */
export async function upsertAttendance(rows) {
  unwrap(await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,attended_on' }))
}

export async function deleteAttendance(studentId, date) {
  unwrap(await supabase.from('attendance').delete().eq('student_id', studentId).eq('attended_on', date))
}

/** Last N days of records for one student. */
export async function fetchStudentAttendance(studentId, days = 30) {
  return unwrap(
    await supabase
      .from('attendance')
      .select('attended_on, status')
      .eq('student_id', studentId)
      .gte('attended_on', toISODate(daysAgo(days - 1)))
      .order('attended_on')
  )
}

/* ===================================================================== */
/* Fee challans                                                          */
/* ===================================================================== */

const FEE_COLS = 'id, student_id, title, amount, amount_paid, due_date, paid_on, status'

export async function fetchFees(studentId) {
  return unwrap(await supabase.from('fees').select(FEE_COLS).eq('student_id', studentId).order('due_date', { ascending: false }))
}

export async function createChallan({ studentId, title, amount, dueDate }) {
  return unwrap(
    await supabase
      .from('fees')
      .insert({ student_id: studentId, title, amount, due_date: dueDate, amount_paid: 0, status: 'pending' })
      .select('id')
      .single()
  )
}

export async function updateChallan(id, { title, amount, dueDate } = {}) {
  const patch = {}
  if (title !== undefined) patch.title = title
  if (amount !== undefined) patch.amount = amount
  if (dueDate !== undefined) patch.due_date = dueDate
  if (Object.keys(patch).length) unwrap(await supabase.from('fees').update(patch).eq('id', id))
}

/** Adds a payment, caps it at the amount due and keeps `status` and `paid_on` in sync. */
export async function recordPayment(id, payment) {
  if (!(payment > 0)) throw new Error('Payment must be greater than zero.')
  const fee = unwrap(await supabase.from('fees').select('amount, amount_paid').eq('id', id).single())
  const amount = Number(fee.amount)
  const paid = Math.min(amount, Number(fee.amount_paid) + payment)
  unwrap(
    await supabase
      .from('fees')
      .update({ amount_paid: paid, status: feeStatusFor(amount, paid), paid_on: toISODate() })
      .eq('id', id)
  )
  return { amountPaid: paid, balance: amount - paid }
}

export async function deleteChallan(id) {
  unwrap(await supabase.from('fees').delete().eq('id', id))
}

/* ===================================================================== */
/* Marks and timetable                                                   */
/* ===================================================================== */

export async function fetchMarksSheet(classId, subject, exam) {
  const roster = await fetchRoster(classId)
  const ids = roster.map((s) => s.id)
  const existing = ids.length
    ? unwrap(
        await supabase.from('marks').select('student_id, score, max_score').eq('subject', subject).eq('exam', exam).in('student_id', ids)
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

/* ===================================================================== */
/* Dashboards                                                            */
/* ===================================================================== */

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

const CHILD_COLS = 'id, roll_no, classes(name, section), student:users!user_id(full_name)'
const toChild = (r) => ({ id: r.id, name: r.student?.full_name ?? 'Student', className: classLabel(r.classes), rollNo: r.roll_no })

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
  const [marks, attendance] = await Promise.all([
    supabase.from('marks').select('subject, exam, score, max_score, exam_date').eq('student_id', studentId),
    fetchStudentAttendance(studentId, 30),
  ])
  return { marks: unwrap(marks), attendance }
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

/* ===================================================================== */
/* Realtime                                                              */
/* ===================================================================== */

/**
 * Listen to row changes on a table. Returns an unsubscribe function.
 * `filter` uses PostgREST syntax, e.g. `student_id=eq.<uuid>`.
 */
export function subscribeToTable(table, onChange, { filter, onStatus } = {}) {
  const channel = supabase
    .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, onChange)
    .subscribe((status) => onStatus?.(status))

  return () => {
    supabase.removeChannel(channel)
  }
}

/** Attendance rows written for one date by anyone (another tab, another teacher). */
export function subscribeToAttendance(date, onRow, onStatus) {
  return subscribeToTable(
    'attendance',
    (payload) => {
      if (payload.new?.student_id) onRow(payload.new)
    },
    { filter: `attended_on=eq.${date}`, onStatus: (status) => onStatus?.(status === 'SUBSCRIBED') }
  )
}

export { initials }

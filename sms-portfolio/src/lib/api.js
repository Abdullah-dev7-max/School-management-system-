import { supabase } from './supabaseClient.js'
import { daysAgo, toISODate } from './format.js'
import { hashPassword } from './password.js'
import { invokeRoleAuth } from './roleAuth.js'

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
    supabase.from('fees').select('id, student_id, title, amount, amount_paid, due_date, paid_on, status, fee_payments(amount, paid_on)'),
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

export async function fetchInstituteSettings() {
  const { data, error } = await supabase.from('institute_settings').select('school_name, address, contact_email, academic_year').eq('id', true).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? { school_name: '', address: '', contact_email: '', academic_year: '' }
}

export async function fetchRoleDashboard(profile, sessionToken) {
  if (profile.role === 'teacher' || profile.role === 'student') {
    return invokeRoleAuth({ action: 'dashboard', token: sessionToken })
  }

  if (profile.role === 'parent') {
    const students = unwrap(
      await supabase
        .from('students')
        .select('id, user_id, parent_id, admission_no, roll_no, status, student:users!user_id(full_name), classes(id, name, section, academic_year)')
        .eq('parent_id', profile.id)
        .order('admission_no')
    )
    const studentIds = students.map((student) => student.id)
    const [fees, attendance, marks] = studentIds.length
      ? await Promise.all([
          supabase.from('fees').select('id, student_id, title, amount, amount_paid, due_date, status').in('student_id', studentIds).order('due_date', { ascending: false }),
          supabase.from('attendance').select('student_id, attended_on, status').in('student_id', studentIds).order('attended_on', { ascending: false }).limit(30),
          supabase.from('marks').select('student_id, subject, exam, score, max_score, exam_date').in('student_id', studentIds).order('exam_date', { ascending: false }).limit(30),
        ])
      : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
    return {
      role: profile.role,
      students,
      fees: unwrap(fees),
      attendance: unwrap(attendance),
      marks: unwrap(marks),
    }
  }

  throw new Error('This account role does not have a dashboard.')
}

export async function saveInstituteSettings(settings) {
  unwrap(await supabase.from('institute_settings').upsert({
    id: true,
    school_name: settings.schoolName.trim(),
    address: settings.address.trim() || null,
    contact_email: settings.contactEmail.trim(),
    academic_year: settings.academicYear.trim(),
  }, { onConflict: 'id' }))
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
        'id, user_id, class_id, admission_no, roll_no, status, classes(id, name, section), student:users!user_id(id, full_name, email, phone)'
      )
      .order('admission_no'),
    supabase.from('classes').select('id, name, section').order('name').order('section'),
  ])
  return { students: unwrap(students), classes: unwrap(classes) }
}

export async function createStudent(values) {
  const { passwordSalt, passwordHash } = await hashPassword(values.password)
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({
      full_name: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      role: 'student',
      phone: values.phone?.trim() || null,
    })
    .select('id')
    .single()
  if (profileError) throw new Error(profileError.message)

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      user_id: profile.id,
      admission_no: values.admissionNo.trim(),
      roll_no: values.rollNo === '' || values.rollNo == null ? null : Number(values.rollNo),
      class_id: values.classId || null,
      status: values.status || 'active',
      password_salt: passwordSalt,
      password_hash: passwordHash,
    })
    .select('id')
    .single()

  if (studentError) {
    const { error: cleanupError } = await supabase.from('users').delete().eq('id', profile.id)
    if (cleanupError) {
      throw new Error(`${studentError.message} The unlinked profile cleanup also failed: ${cleanupError.message}`)
    }
    throw new Error(studentError.message)
  }

  return student
}

export async function updateStudent(student, { fullName, email, phone, password, admissionNo, classId, rollNo, status }) {
  const update = {
    admission_no: admissionNo,
    class_id: classId || null,
    roll_no: rollNo === '' ? null : Number(rollNo),
    status,
  }
  if (password) {
    const { passwordSalt, passwordHash } = await hashPassword(password)
    update.password_salt = passwordSalt
    update.password_hash = passwordHash
  }
  unwrap(
    await supabase
      .from('users')
      .update({ full_name: fullName, email: email.trim().toLowerCase(), phone: phone || null })
      .eq('id', student.user_id)
  )

  const result = await supabase
    .from('students')
    .update(update)
    .eq('id', student.id)

  if (result.error) {
    const rollback = await supabase
      .from('users')
      .update({
        full_name: student.student.full_name,
        email: student.student.email,
        phone: student.student.phone,
      })
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

/* ----------------------------- Admin management ----------------------------- */

export async function fetchTeachersPage() {
  return unwrap(
    await supabase
      .from('teachers')
      .select('id, user_id, employee_code, subject, status, teacher:users!user_id(full_name, email, phone)')
      .order('employee_code')
  )
}

export async function createTeacher(values) {
  const { passwordSalt, passwordHash } = await hashPassword(values.password)
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({
      full_name: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      role: 'teacher',
      phone: values.phone?.trim() || null,
    })
    .select('id')
    .single()
  if (profileError) throw new Error(profileError.message)

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .insert({
      user_id: profile.id,
      employee_code: values.employeeCode.trim(),
      subject: values.subject.trim(),
      status: values.status || 'active',
      password_salt: passwordSalt,
      password_hash: passwordHash,
    })
    .select('id')
    .single()
  if (teacherError) {
    const { error: cleanupError } = await supabase.from('users').delete().eq('id', profile.id)
    if (cleanupError) {
      throw new Error(`${teacherError.message} The unlinked profile cleanup also failed: ${cleanupError.message}`)
    }
    throw new Error(teacherError.message)
  }
  return teacher
}

export async function updateTeacher(teacher, { fullName, email, phone, employeeCode, subject, status, password }) {
  const update = { employee_code: employeeCode, subject, status }
  if (password) {
    const { passwordSalt, passwordHash } = await hashPassword(password)
    update.password_salt = passwordSalt
    update.password_hash = passwordHash
  }
  unwrap(
    await supabase
      .from('users')
      .update({ full_name: fullName, email: email.trim().toLowerCase(), phone: phone || null })
      .eq('id', teacher.user_id)
  )
  const result = await supabase
    .from('teachers')
    .update(update)
    .eq('id', teacher.id)
  if (result.error) {
    const rollback = await supabase
      .from('users')
      .update({
        full_name: teacher.teacher.full_name,
        email: teacher.teacher.email,
        phone: teacher.teacher.phone,
      })
      .eq('id', teacher.user_id)
    if (rollback.error) {
      throw new Error(`${result.error.message} The profile rollback also failed: ${rollback.error.message}`)
    }
    throw new Error(result.error.message)
  }
}

export async function deleteTeacher(userId) {
  unwrap(await supabase.from('users').delete().eq('id', userId))
}

export async function fetchClassesPage() {
  const [classResult, studentResult, teacherResult] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, section, room, academic_year, class_teacher_id')
      .order('academic_year', { ascending: false })
      .order('name')
      .order('section'),
    supabase.from('students').select('class_id'),
    supabase.from('teachers').select('id, user_id, teacher:users!user_id(full_name)'),
  ])
  const classes = unwrap(classResult)
  const studentRows = unwrap(studentResult)
  const teachers = unwrap(teacherResult)
  const teacherById = Object.fromEntries(teachers.map((teacher) => [teacher.id, teacher]))
  const studentCounts = studentRows.reduce((counts, student) => {
    if (student.class_id) counts[student.class_id] = (counts[student.class_id] ?? 0) + 1
    return counts
  }, {})
  return {
    classes: classes.map((item) => ({
      ...item,
      studentCount: studentCounts[item.id] ?? 0,
      classTeacher: item.class_teacher_id ? teacherById[item.class_teacher_id]?.teacher?.full_name ?? null : null,
    })),
    teachers,
  }
}

export async function createClass({ name, section, room, academicYear, classTeacherId }) {
  unwrap(
    await supabase.from('classes').insert({
      name,
      section,
      room: room || null,
      academic_year: academicYear,
      class_teacher_id: classTeacherId || null,
    })
  )
}

export async function updateClass(classId, { name, section, room, academicYear, classTeacherId }) {
  unwrap(await supabase.from('classes').update({
    name,
    section,
    room: room || null,
    academic_year: academicYear,
    class_teacher_id: classTeacherId || null,
  }).eq('id', classId))
}

export async function deleteClass(classId) {
  unwrap(await supabase.from('classes').delete().eq('id', classId))
}

export async function fetchAttendancePage(classId, date) {
  const classes = unwrap(await supabase.from('classes').select('id, name, section').order('name').order('section'))
  if (!classId) return { classes, roster: [] }
  const roster = unwrap(
    await supabase
      .from('students')
      .select('id, roll_no, admission_no, student:users!user_id(full_name)')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('roll_no')
  )
  const ids = roster.map((student) => student.id)
  const records = ids.length
    ? unwrap(
        await supabase
          .from('attendance')
          .select('student_id, status')
          .eq('attended_on', date)
          .in('student_id', ids)
      )
    : []
  return {
    classes,
    roster: roster.map((student) => ({
      id: student.id,
      rollNo: student.roll_no,
      admissionNo: student.admission_no,
      name: student.student?.full_name ?? 'Unknown student',
      status: records.find((record) => record.student_id === student.id)?.status ?? '',
    })),
  }
}

export async function fetchFeesPage() {
  const [feeResult, studentResult] = await Promise.all([
    supabase
      .from('fees')
      .select('id, student_id, title, amount, amount_paid, due_date, paid_on, status, fee_payments(id, amount, paid_on)')
      .order('due_date', { ascending: true }),
    supabase.from('students').select('id, user_id, admission_no'),
  ])
  const fees = unwrap(feeResult)
  const students = unwrap(studentResult)
  const names = unwrap(
    students.length
      ? await supabase.from('users').select('id, full_name').in('id', students.map((student) => student.user_id))
      : { data: [], error: null }
  )
  const studentById = Object.fromEntries(
    students.map((student) => [
      student.id,
      {
        ...student,
        name: names.find((user) => user.id === student.user_id)?.full_name ?? 'Unknown student',
      },
    ])
  )
  return {
    fees: fees.map((fee) => ({ ...fee, student: studentById[fee.student_id] ?? null })),
    students: students.map((student) => ({
      id: student.id,
      admission_no: student.admission_no,
      name: studentById[student.id]?.name ?? 'Unknown student',
    })),
  }
}

export async function issueFeeVoucher({ studentId, title, amount, dueDate }) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) throw new Error('Fee amount must be greater than zero.')
  unwrap(await supabase.from('fees').insert({
    student_id: studentId,
    title: title.trim(),
    amount: value,
    amount_paid: 0,
    due_date: dueDate,
    status: 'pending',
  }))
}

export async function recordFeePayment(fee, paymentAmount, paidOn) {
  unwrap(await supabase.rpc('record_fee_payment', {
    p_fee_id: fee.id,
    p_amount: paymentAmount,
    p_paid_on: paidOn,
  }))
}

export async function fetchMarksPage(classId, subject, exam) {
  const classes = unwrap(await supabase.from('classes').select('id, name, section').order('name').order('section'))
  if (!classId) return { classes, roster: [] }
  const roster = unwrap(
    await supabase
      .from('students')
      .select('id, roll_no, admission_no, student:users!user_id(full_name)')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('roll_no')
  )
  const ids = roster.map((student) => student.id)
  const records = ids.length
    ? unwrap(
        await supabase
          .from('marks')
          .select('student_id, score, max_score, exam_date')
          .eq('subject', subject)
          .eq('exam', exam)
          .in('student_id', ids)
      )
    : []
  return {
    classes,
    roster: roster.map((student) => ({
      id: student.id,
      rollNo: student.roll_no,
      admissionNo: student.admission_no,
      name: student.student?.full_name ?? 'Unknown student',
      score: records.find((record) => record.student_id === student.id)?.score ?? '',
      maxScore: records.find((record) => record.student_id === student.id)?.max_score ?? '',
      examDate: records.find((record) => record.student_id === student.id)?.exam_date ?? '',
    })),
  }
}

export async function saveClassMarks(rows) {
  if (rows.length) unwrap(await supabase.from('marks').upsert(rows, { onConflict: 'student_id,subject,exam' }))
}

export async function saveAttendance(rows) {
  unwrap(await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,attended_on' }))
}

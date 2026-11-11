import { supabase } from './supabaseClient.js'
import { daysAgo, toISODate } from './format.js'
import { invokeRoleAuth } from './roleAuth.js'

/** supabase-js resolves with { data, error }. Turn errors into thrown exceptions. */
function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

function throwProfileInsertError(error) {
  if (error.code === '23505') {
    throw new Error('This email is already registered.')
  }
  throw new Error(error.message)
}

const className = (c) => (c ? `${c.name} ${c.section}` : 'Unassigned')

/* ----------------------------- Admin ----------------------------- */

export async function fetchAdminOverview() {
  const since = toISODate(daysAgo(13))
  const [students, teachers, feeResult, attendance] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('fees').select('id, student_id, title, amount, amount_paid, due_date, paid_on, status'),
    supabase.from('attendance').select('student_id, attended_on, status').gte('attended_on', since).order('attended_on'),
  ])
  if (students.error) throw new Error(students.error.message)
  if (teachers.error) throw new Error(teachers.error.message)
  const feeRows = unwrap(feeResult)
  const payments = unwrap(
    feeRows.length
      ? await supabase
          .from('fee_payments')
          .select('fee_id, amount, paid_on')
          .in('fee_id', feeRows.map((fee) => fee.id))
      : { data: [], error: null }
  )
  const paymentsByFee = {}
  payments.forEach((payment) => {
    const feePayments = paymentsByFee[payment.fee_id] ?? []
    feePayments.push({ amount: payment.amount, paid_on: payment.paid_on })
    paymentsByFee[payment.fee_id] = feePayments
  })

  return {
    studentCount: students.count ?? 0,
    teacherCount: teachers.count ?? 0,
    fees: feeRows.map((fee) => ({ ...fee, fee_payments: paymentsByFee[fee.id] ?? [] })),
    attendance: unwrap(attendance),
  }
}

export async function fetchInstituteSettings() {
  const { data, error } = await supabase
    .from('institute_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) throw error
  return data
}

export async function fetchRoleDashboard(profile, sessionToken) {
  if (profile.role === 'teacher' || profile.role === 'student') {
    return invokeRoleAuth({ action: 'dashboard', token: sessionToken })
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
  if (profileError) throwProfileInsertError(profileError)

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      user_id: profile.id,
      admission_no: values.admissionNo.trim(),
      roll_no: values.rollNo === '' || values.rollNo == null ? null : Number(values.rollNo),
      class_id: values.classId || null,
      status: values.status || 'active',
      password: values.password,
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
    update.password = password
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
  if (profileError) throwProfileInsertError(profileError)

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .insert({
      user_id: profile.id,
      employee_code: values.employeeCode.trim(),
      subject: values.subject.trim(),
      status: values.status || 'active',
      password: values.password,
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
    update.password = password
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
  const [classResult, studentResult, teacherResult, settingsResult] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, section, room, academic_year, class_teacher_id')
      .order('academic_year', { ascending: false })
      .order('name')
      .order('section'),
    supabase.from('students').select('class_id'),
    supabase.from('teachers').select('id, user_id, teacher:users!user_id(full_name)'),
    supabase.from('institute_settings').select('academic_year').limit(1).maybeSingle(),
  ])
  const classes = unwrap(classResult)
  const studentRows = unwrap(studentResult)
  const teachers = unwrap(teacherResult)
  const settings = unwrap(settingsResult)
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
    academicYear: settings?.academic_year ?? `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, '0')}`,
  }
}

export async function fetchTimetablePage() {
  const [classResult, teacherResult, slotResult] = await Promise.all([
    supabase.from('classes').select('id, name, section, academic_year').order('name').order('section'),
    supabase.from('teachers').select('id, user_id, subject, teacher:users!user_id(full_name)').order('employee_code'),
    supabase.from('timetable_slots').select('id, class_id, teacher_id, day_of_week, period, starts_at, ends_at, subject, room').order('day_of_week').order('period'),
  ])
  return {
    classes: unwrap(classResult),
    teachers: unwrap(teacherResult),
    slots: unwrap(slotResult),
  }
}

export async function saveTimetableSlot(values, slotId = null) {
  if (values.endsAt <= values.startsAt) {
    throw new Error('End time must be after start time.')
  }
  const payload = {
    class_id: values.classId,
    teacher_id: values.teacherId || null,
    day_of_week: Number(values.dayOfWeek),
    period: Number(values.period),
    starts_at: values.startsAt,
    ends_at: values.endsAt,
    subject: values.subject.trim(),
    room: values.room.trim() || null,
  }
  const query = slotId
    ? supabase.from('timetable_slots').update(payload).eq('id', slotId)
    : supabase.from('timetable_slots').insert(payload)
  const { error } = await query
  if (error?.code === '23505') {
    const conflict = new Error('This class already has a lesson in that period.')
    conflict.code = error.code
    throw conflict
  }
  if (error) throw new Error(error.message)
}

export async function deleteTimetableSlot(slotId) {
  unwrap(await supabase.from('timetable_slots').delete().eq('id', slotId))
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

export async function fetchAttendancePage(classId, date, sessionToken) {
  if (sessionToken) {
    return invokeRoleAuth({ action: 'attendance_sheet', token: sessionToken, classId, date })
  }
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

export async function fetchFeesPage(month) {
  const feeMonth = `${month}-01`
  const [year, monthNumber] = month.split('-').map(Number)
  const nextMonth = `${monthNumber === 12 ? year + 1 : year}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, '0')}-01`
  unwrap(await supabase.rpc('ensure_monthly_fee_records', { p_month: feeMonth }))
  const [classResult, studentResult, feeResult, settingResult] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, section, monthly_fee, fee_due_day')
      .order('name')
      .order('section'),
    supabase
      .from('students')
      .select('id, user_id, admission_no, roll_no, class_id')
      .eq('status', 'active')
      .order('roll_no'),
    supabase
      .from('fees')
      .select('id, student_id, title, amount, amount_paid, discount_total, late_fine_total, due_date, fee_month, status')
      .or(`fee_month.eq.${feeMonth},and(fee_month.is.null,due_date.gte.${feeMonth},due_date.lt.${nextMonth})`)
      .order('due_date'),
    supabase.from('institute_settings').select('*').limit(1).single(),
  ])
  const classes = unwrap(classResult)
  const studentRows = unwrap(studentResult)
  const fees = unwrap(feeResult)
  const setting = settingResult.error?.code === 'PGRST116' ? null : unwrap(settingResult)
  const profiles = unwrap(
    studentRows.length
      ? await supabase
          .from('users')
          .select('id, full_name, phone')
          .in('id', studentRows.map((student) => student.user_id))
      : { data: [], error: null }
  )
  const classesById = Object.fromEntries(classes.map((classItem) => [classItem.id, classItem]))
  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]))
  const students = studentRows.map((student) => ({
    ...student,
    name: profilesById[student.user_id]?.full_name ?? 'Unknown student',
    phone: profilesById[student.user_id]?.phone ?? '',
    className: classesById[student.class_id]
      ? `${classesById[student.class_id].name} ${classesById[student.class_id].section}`
      : 'Unassigned',
  }))
  const studentIds = studentRows.map((student) => student.id)
  const historyResult = studentRows.length
    ? await supabase
        .from('fees')
        .select('id, student_id, title, amount, amount_paid, discount_total, late_fine_total, due_date, fee_month, status')
        .in('student_id', studentIds)
    : { data: [], error: null }
  const historyFees = unwrap(historyResult)
  const allPayments = unwrap(
    historyFees.length
      ? await supabase
          .from('fee_payments')
          .select('id, fee_id, amount, discount, late_fine, payment_mode, paid_on, receipt_no, remaining_balance, created_at')
          .in('fee_id', historyFees.map((fee) => fee.id))
      : { data: [], error: null }
  )
  const historyFeeById = Object.fromEntries(historyFees.map((fee) => [fee.id, fee]))
  const studentById = Object.fromEntries(students.map((student) => [student.id, student]))
  const paymentsByFee = {}
  allPayments.forEach((payment) => {
    const payments = paymentsByFee[payment.fee_id] ?? []
    payments.push(payment)
    paymentsByFee[payment.fee_id] = payments
  })
  const histories = {}
  historyFees.forEach((fee) => {
    const payments = [...(paymentsByFee[fee.id] ?? [])].sort((a, b) => a.paid_on.localeCompare(b.paid_on))
    let runningPaid = 0
    let runningDiscount = 0
    let runningLateFine = 0
    payments.forEach((payment) => {
      runningPaid += Number(payment.amount)
      runningDiscount += Number(payment.discount ?? 0)
      runningLateFine += Number(payment.late_fine ?? 0)
      const history = histories[fee.student_id] ?? []
      history.push({
        ...payment,
        month: (fee.fee_month ?? fee.due_date).slice(0, 7),
        remainingBalance: payment.remaining_balance == null
          ? Math.max(0, Number(fee.amount) + runningLateFine - runningDiscount - runningPaid)
          : Number(payment.remaining_balance),
      })
      histories[fee.student_id] = history
    })
  })
  Object.values(histories).forEach((history) => history.sort((a, b) => b.paid_on.localeCompare(a.paid_on)))

  const currentDate = toISODate()
  const balanceOf = (fee) => Math.max(
    0,
    Number(fee.amount)
      + Number(fee.late_fine_total ?? 0)
      - Number(fee.discount_total ?? 0)
      - Number(fee.amount_paid)
  )
  const feeRecords = fees.map((fee) => ({
    ...fee,
    payments: [...(paymentsByFee[fee.id] ?? [])].sort((a, b) => a.paid_on.localeCompare(b.paid_on)),
    balance: balanceOf(fee),
  }))
  const activeInvoices = historyFees.map((fee) => ({ ...fee, balance: balanceOf(fee) }))
  const defaulters = activeInvoices.filter((fee) => fee.due_date < currentDate && fee.balance > 0)
  const invoicesByStudent = {}
  activeInvoices.forEach((fee) => {
    const invoices = invoicesByStudent[fee.student_id] ?? []
    const paid = Number(fee.amount_paid) > 0 || Number(fee.discount_total ?? 0) > 0
    invoices.push({
      ...fee,
      month: (fee.fee_month ?? fee.due_date).slice(0, 7),
      status: fee.balance === 0 ? 'Paid' : paid ? 'Partial' : 'Unpaid',
    })
    invoicesByStudent[fee.student_id] = invoices
  })
  Object.values(invoicesByStudent).forEach((invoices) => invoices.sort((a, b) => b.due_date.localeCompare(a.due_date)))
  const paymentRecords = allPayments.map((payment) => {
    const fee = historyFeeById[payment.fee_id]
    return {
      ...payment,
      student: studentById[fee?.student_id] ?? null,
      title: fee?.title ?? 'Fee payment',
      fee_month: fee?.fee_month ?? fee?.due_date ?? null,
    }
  })

  return {
    classes,
    students: students.map((student) => ({
      ...student,
      history: histories[student.id] ?? [],
      invoices: invoicesByStudent[student.id] ?? [],
    })),
    fees: feeRecords,
    payments: paymentRecords.sort((a, b) => b.paid_on.localeCompare(a.paid_on)),
    schoolName: setting?.school_name || 'School',
    pending: activeInvoices.reduce((total, fee) => total + fee.balance, 0),
    defaulters,
  }
}

export async function generateMonthlyFeeVouchers(month, classId = null) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Select a valid fee month.')
  const { data, error } = await supabase.rpc('generate_monthly_fee_vouchers', {
    p_month: `${month}-01`,
    p_class_id: classId || null,
  })
  if (error) throw new Error(error.message)
  return data
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

export async function updateClassFee(classId, monthlyFee, dueDay) {
  const amount = monthlyFee === '' ? null : Number(monthlyFee)
  const day = dueDay === '' ? null : Number(dueDay)
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) throw new Error('Enter a valid monthly fee amount.')
  if (day != null && (!Number.isInteger(day) || day < 1 || day > 31)) throw new Error('Due day must be between 1 and 31.')
  unwrap(await supabase.from('classes').update({ monthly_fee: amount, fee_due_day: day }).eq('id', classId))
}

export async function recordFeePayment(fee, { amount, discount, lateFine, paidOn, paymentMode }) {
  const { data, error } = await supabase.rpc('record_fee_payment', {
    p_fee_id: fee.id,
    p_amount: amount,
    p_paid_on: paidOn,
    p_discount: discount,
    p_late_fine: lateFine,
    p_payment_mode: paymentMode,
  })
  if (error) throw new Error(error.message)
  const payment = unwrap(await supabase
    .from('fee_payments')
    .select('created_at')
    .eq('id', data.payment_id)
    .single())
  return { ...data, created_at: payment.created_at }
}

export async function fetchMarksPage(classId, subject, exam, sessionToken = null) {
  if (sessionToken) {
    return invokeRoleAuth({ action: 'marks_sheet', token: sessionToken, classId, subject, exam })
  }
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

export async function saveClassMarks(rows, sessionToken = null, classId = null) {
  if (sessionToken) {
    return invokeRoleAuth({
      action: 'save_marks',
      token: sessionToken,
      classId,
      subject: rows[0]?.subject,
      exam: rows[0]?.exam,
      examDate: rows[0]?.exam_date,
      maxScore: rows[0]?.max_score,
      rows: rows.map(({ student_id, score }) => ({ student_id, score })),
    })
  }
  if (rows.length) unwrap(await supabase.from('marks').upsert(rows, { onConflict: 'student_id,subject,exam' }))
}

export async function fetchTeacherNotes(sessionToken) {
  return invokeRoleAuth({ action: 'teacher_notes', token: sessionToken })
}

export async function uploadTeacherNote({ sessionToken, classId, title, subject, file }) {
  const upload = await invokeRoleAuth({
    action: 'create_note_upload',
    token: sessionToken,
    classId,
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  })
  const { error: uploadError } = await supabase.storage
    .from('class-notes')
    .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  return invokeRoleAuth({
    action: 'save_note',
    token: sessionToken,
    classId,
    title,
    subject,
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
    storagePath: upload.path,
  })
}

export async function openClassNote(sessionToken, noteId) {
  const { signedUrl } = await invokeRoleAuth({ action: 'download_note', token: sessionToken, noteId })
  window.location.assign(signedUrl)
}

export async function fetchTeacherAnnouncements(sessionToken) {
  return invokeRoleAuth({ action: 'teacher_announcements', token: sessionToken })
}

export async function createClassAnnouncement(sessionToken, values) {
  return invokeRoleAuth({ action: 'create_announcement', token: sessionToken, ...values })
}

export async function saveAttendance(rows, sessionToken, classId, date) {
  if (sessionToken) {
    return invokeRoleAuth({ action: 'save_attendance', token: sessionToken, classId, date, rows })
  }
  unwrap(await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,attended_on' }))
}

export async function fetchAdminAttendanceOverview(date) {
  const [classesResult, studentsResult, attendanceResult] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, section, class_teacher_id, teacher:teachers!class_teacher_id(teacher:users!user_id(full_name))')
      .order('name')
      .order('section'),
    supabase
      .from('students')
      .select('id, class_id, roll_no, admission_no, student:users!user_id(full_name)')
      .eq('status', 'active')
      .order('roll_no'),
    supabase
      .from('attendance')
      .select('student_id, status')
      .eq('attended_on', date),
  ])
  const classes = unwrap(classesResult)
  const students = unwrap(studentsResult)
  const records = unwrap(attendanceResult)
  const statusByStudent = new Map(records.map((record) => [record.student_id, record.status]))
  const studentRows = students.map((student) => ({
    id: student.id,
    classId: student.class_id,
    rollNo: student.roll_no,
    admissionNo: student.admission_no,
    name: student.student?.full_name ?? 'Unknown student',
    status: statusByStudent.get(student.id) ?? null,
  }))
  const studentsByClass = new Map()
  studentRows.forEach((student) => {
    if (!student.classId) return
    const roster = studentsByClass.get(student.classId) ?? []
    roster.push(student)
    studentsByClass.set(student.classId, roster)
  })

  return {
    totalStudents: studentRows.length,
    students: studentRows,
    classes: classes.map((classItem) => ({
      id: classItem.id,
      name: classItem.name,
      section: classItem.section,
      teacherName: classItem.teacher?.teacher?.full_name ?? null,
      students: studentsByClass.get(classItem.id) ?? [],
    })),
  }
}

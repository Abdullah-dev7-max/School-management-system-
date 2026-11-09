import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenCheck, GraduationCap, Plus, Wallet, Users } from 'lucide-react'
import { createStudent, createTeacher, issueFeeVoucher, saveClassMarks } from '../../lib/api.js'
import { pkr } from '../../lib/format.js'
import GlassCard from '../ui/GlassCard.jsx'
import { Field, FORM_BUTTON, FormError, ManagementModal, SelectField } from './ManagementUi.jsx'

const EMPTY_FORM = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  classId: '',
  rollNo: '',
  admissionNo: '',
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  parentPassword: '',
  employeeCode: '',
  subject: '',
  studentId: '',
  title: '',
  amount: '',
  dueDate: '',
  exam: '',
  score: '',
  maxScore: '',
  examDate: '',
}

const ACTIONS = [
  { id: 'student', label: 'Add New Student', icon: Users, description: 'Enroll a student and optionally create their parent account.' },
  { id: 'teacher', label: 'Add New Teacher', icon: GraduationCap, description: 'Create a teacher login and staff record.' },
  { id: 'fee', label: 'Add Fee Record', icon: Wallet, description: 'Issue a fee voucher to an enrolled student.' },
  { id: 'marks', label: 'Add Marks', icon: BookOpenCheck, description: 'Enter an examination mark for a student.' },
]

function ActionForm({ action, students, classes, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (action === 'student') {
        const hasParent = form.parentName.trim() || form.parentEmail.trim() || form.parentPassword
        if (hasParent && (!form.parentName.trim() || !form.parentEmail.trim() || !form.parentPassword)) {
          throw new Error('Provide the parent name, email, and initial password to create a parent account.')
        }
        await createStudent({
          ...form,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          admissionNo: form.admissionNo.trim(),
        })
      } else if (action === 'teacher') {
        await createTeacher({
          ...form,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          employeeCode: form.employeeCode.trim(),
          subject: form.subject.trim(),
          phone: form.phone.trim(),
        })
      } else if (action === 'fee') {
        await issueFeeVoucher({
          studentId: form.studentId,
          title: form.title,
          amount: form.amount,
          dueDate: form.dueDate,
        })
      } else {
        await saveClassMarks([{
          student_id: form.studentId,
          subject: form.subject.trim(),
          exam: form.exam.trim(),
          score: Number(form.score),
          max_score: Number(form.maxScore),
          exam_date: form.examDate || null,
        }])
      }
      onSaved(action)
    } catch (saveError) {
      setError(saveError.message || `Could not save ${action}.`)
      setSaving(false)
    }
  }

  const accountForm = action === 'student' || action === 'teacher'
  const selectedAction = ACTIONS.find((item) => item.id === action)

  return (
    <ManagementModal title={selectedAction.label} description={selectedAction.description} onClose={onClose}>
      <form onSubmit={submit} className="mt-5 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {action === 'student' && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="fullName" value={form.fullName} onChange={change} maxLength={120} required autoFocus />
            <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required />
          </div>
          <Field label="Initial password (at least 12 characters)" name="password" type="password" autoComplete="new-password" minLength={12} value={form.password} onChange={change} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Admission number" name="admissionNo" value={form.admissionNo} onChange={change} required />
            <Field label="Roll number" name="rollNo" type="number" min="1" step="1" value={form.rollNo} onChange={change} />
          </div>
          <SelectField label="Class / section" name="classId" value={form.classId} onChange={change}>
            <option value="">Unassigned</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}
          </SelectField>
          <div className="rounded-2xl border border-ink/10 bg-white/40 p-4">
            <h3 className="text-sm font-semibold">Parent account (optional)</h3>
            <p className="mt-1 text-xs text-ink/55">Fill all three required fields to create a linked parent login.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Parent full name" name="parentName" value={form.parentName} onChange={change} />
              <Field label="Parent email" name="parentEmail" type="email" autoComplete="email" value={form.parentEmail} onChange={change} />
              <Field label="Parent phone" name="parentPhone" type="tel" value={form.parentPhone} onChange={change} />
              <Field label="Parent initial password" name="parentPassword" type="password" autoComplete="new-password" minLength={form.parentPassword ? 12 : undefined} value={form.parentPassword} onChange={change} />
            </div>
          </div>
        </>}

        {action === 'teacher' && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="fullName" value={form.fullName} onChange={change} maxLength={120} required autoFocus />
            <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required />
          </div>
          <Field label="Initial password (at least 12 characters)" name="password" type="password" autoComplete="new-password" minLength={12} value={form.password} onChange={change} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject" name="subject" value={form.subject} onChange={change} required />
            <Field label="Phone number" name="phone" type="tel" value={form.phone} onChange={change} />
            <Field label="Employee code" name="employeeCode" value={form.employeeCode} onChange={change} required />
          </div>
        </>}

        {action === 'fee' && <>
          <SelectField label="Student" name="studentId" value={form.studentId} onChange={change} required>
            <option value="">Select a student</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.student?.full_name} · {student.admission_no}</option>)}
          </SelectField>
          <Field label="Fee description" name="title" value={form.title} onChange={change} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (PKR)" name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={change} required />
            <Field label="Due date" name="dueDate" type="date" value={form.dueDate} onChange={change} required />
          </div>
          {!students.length && <FormError>Add a student before issuing a fee voucher.</FormError>}
        </>}

        {action === 'marks' && <>
          <SelectField label="Student" name="studentId" value={form.studentId} onChange={change} required>
            <option value="">Select a student</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.student?.full_name} · {student.admission_no}</option>)}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject" name="subject" value={form.subject} onChange={change} required />
            <Field label="Examination" name="exam" value={form.exam} onChange={change} required />
            <Field label="Score" name="score" type="number" min="0" step="0.01" value={form.score} onChange={change} required />
            <Field label="Maximum score" name="maxScore" type="number" min="0.01" step="0.01" value={form.maxScore} onChange={change} required />
            <Field label="Exam date" name="examDate" type="date" value={form.examDate} onChange={change} />
          </div>
          {!students.length && <FormError>Add a student before entering examination marks.</FormError>}
          {Number(form.score) > Number(form.maxScore) && <FormError>Score cannot exceed the maximum score.</FormError>}
        </>}

        <FormError>{error}</FormError>
        <div className="sticky bottom-0 flex justify-end gap-2 bg-[rgba(255,255,255,0.8)] py-2">
          <button type="button" onClick={onClose} disabled={saving} className={`${FORM_BUTTON} hover:bg-ink/5`}>Cancel</button>
          <button type="submit" disabled={saving || ((action === 'fee' || action === 'marks') && !students.length) || (action === 'marks' && Number(form.score) > Number(form.maxScore))} className={`${FORM_BUTTON} bg-night-900 text-white`}>
            {saving ? 'Saving…' : action === 'fee' ? `Issue voucher${form.amount ? ` · ${pkr(form.amount)}` : ''}` : action === 'marks' ? 'Save marks' : accountForm ? 'Create account' : 'Save'}
          </button>
        </div>
      </form>
    </ManagementModal>
  )
}

export default function AdminQuickActions({ students, classes, onSaved }) {
  const [activeAction, setActiveAction] = useState(null)
  const [message, setMessage] = useState('')

  const saved = async (action) => {
    setActiveAction(null)
    setMessage(`${ACTIONS.find((item) => item.id === action).label} completed.`)
    await onSaved()
  }

  return (
    <>
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Quick actions</h2>
            <p className="mt-1 text-sm text-ink/55">Create accounts and records without leaving the dashboard.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link to="/students" className="rounded-lg px-3 py-2 font-medium text-lilac-700 hover:bg-lilac-50">Manage students</Link>
            <Link to="/teachers" className="rounded-lg px-3 py-2 font-medium text-lilac-700 hover:bg-lilac-50">Manage teachers</Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => { setMessage(''); setActiveAction(id) }} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/55 px-4 py-3 text-left text-sm font-medium transition hover:border-lilac-300 hover:bg-lilac-50">
              <span>{label}</span><span className="grid h-8 w-8 place-items-center rounded-xl bg-lilac-100 text-lilac-700"><Icon className="h-4 w-4" /></span>
            </button>
          ))}
        </div>
        {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      </GlassCard>
      {activeAction && <ActionForm action={activeAction} students={students} classes={classes} onClose={() => setActiveAction(null)} onSaved={saved} />}
    </>
  )
}

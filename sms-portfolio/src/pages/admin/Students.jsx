import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, UserRoundPen, Users, X } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync.js'
import { createStudent, deleteStudent, fetchStudentsPage, updateStudent } from '../../lib/api.js'
import { ErrorState } from '../../components/ui/States.jsx'
import LoadingScreen from '../../components/ui/LoadingScreen.jsx'
import Badge from '../../components/ui/Badge.jsx'
import GlassCard from '../../components/ui/GlassCard.jsx'
import SectionHeader from '../../components/ui/SectionHeader.jsx'

const FIELD =
  'mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60'

const STATUS = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'warning' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
}

function classLabel(studentClass) {
  return studentClass ? `${studentClass.name} ${studentClass.section}` : 'Unassigned'
}

function StudentDialog({ student, classes, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    fullName: student?.student?.full_name ?? '',
    email: student?.student?.email ?? '',
    phone: student?.student?.phone ?? '',
    password: '',
    admissionNo: student?.admission_no ?? '',
    classId: student?.class_id ?? '',
    rollNo: student?.roll_no ?? '',
    status: student?.status ?? 'active',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, saving])

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (saveError) {
      setError(saveError.message || 'Could not save this student.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={saving}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-night-950/60 backdrop-blur-sm disabled:pointer-events-none"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-dialog-title"
        className="glass-strong relative z-10 my-auto w-full max-w-xl rounded-3xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="student-dialog-title" className="text-lg font-semibold">
              {student ? 'Edit student' : 'Add new student'}
            </h2>
            <p className="mt-1 text-sm text-ink/60">Student details and class assignment</p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={saving}
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/60 hover:bg-ink/5 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Full name
            <input name="fullName" value={form.fullName} onChange={change} required maxLength={120} className={FIELD} autoFocus />
          </label>

          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" value={form.email} onChange={change} required maxLength={255} className={FIELD} />
          </label>

          <label className="block text-sm font-medium">
            Phone
            <input name="phone" type="tel" value={form.phone} onChange={change} maxLength={32} className={FIELD} />
          </label>

          <label className="block text-sm font-medium">
            {student ? 'New password (optional)' : 'Initial password (at least 12 characters)'}
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={change}
              required={!student}
              minLength={form.password ? 12 : undefined}
              autoComplete="new-password"
              placeholder={student ? 'Leave blank to keep current password' : undefined}
              className={FIELD}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Admission number
              <input name="admissionNo" value={form.admissionNo} onChange={change} required maxLength={64} className={FIELD} />
            </label>
            <label className="block text-sm font-medium">
              Roll number
              <input name="rollNo" type="number" min="1" step="1" value={form.rollNo} onChange={change} className={FIELD} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Class
              <select name="classId" value={form.classId} onChange={change} className={FIELD}>
                <option value="">Unassigned</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{classLabel(item)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Status
              <select name="status" value={form.status} onChange={change} className={FIELD}>
                {Object.entries(STATUS).map(([value, item]) => (
                  <option key={value} value={value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={saving} onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="h-10 rounded-xl bg-night-900 px-4 text-sm font-medium text-white disabled:opacity-50">
              {saving ? 'Saving…' : student ? 'Save changes' : 'Add student'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function Students() {
  const studentsQuery = useAsync(fetchStudentsPage, [], ['students', 'users', 'classes'])
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState('')

  const students = studentsQuery.data?.students ?? []
  const classes = studentsQuery.data?.classes ?? []
  if (studentsQuery.loading || !studentsQuery.data) return <LoadingScreen label="Loading students" />

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return students.filter((student) => {
      if (classFilter !== 'all' && student.class_id !== classFilter) return false
      if (!normalized) return true
      return [
        student.id,
        student.admission_no,
        student.student?.full_name,
        student.student?.email,
        student.roll_no,
        student.classes?.name,
        student.classes?.section,
      ].some((value) => String(value ?? '').toLowerCase().includes(normalized))
    })
  }, [students, query, classFilter])

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
    setActionError('')
  }

  const openEdit = (student) => {
    setEditing(student)
    setDialogOpen(true)
    setActionError('')
  }

  const saveStudent = async (form) => {
    const values = {
      ...form,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      admissionNo: form.admissionNo.trim(),
    }
    if (editing) await updateStudent(editing, values)
    else await createStudent(values)
    setDialogOpen(false)
    setEditing(null)
    await studentsQuery.reload()
  }

  const removeStudent = async (student) => {
    const name = student.student?.full_name ?? student.admission_no
    const confirmed = window.confirm(
      `Delete ${name}? This also permanently removes the student's attendance, marks, and fee records.`
    )
    if (!confirmed) return

    setDeletingId(student.id)
    setActionError('')
    try {
      await deleteStudent(student.user_id)
      await studentsQuery.reload()
    } catch (error) {
      setActionError(error.message || 'Could not delete this student.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader
          title="Students"
          description="Manage student profiles, class assignments, and enrollment status."
          action={
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white outline-none hover:bg-night-800 focus-visible:ring-2 focus-visible:ring-lilac-500/60"
            >
              <Plus className="h-4 w-4" />
              Add new student
            </button>
          }
        />
      </GlassCard>

      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{actionError}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setActionError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {studentsQuery.error ? <ErrorState error={studentsQuery.error} onRetry={studentsQuery.reload} /> : (
        <GlassCard className="overflow-hidden">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-ink/10 bg-white px-3 text-ink/50 focus-within:ring-2 focus-within:ring-lilac-500/60">
              <Search className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, ID, email, or admission no."
                aria-label="Search students"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
              />
            </label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-sm">
              <span className="shrink-0 text-ink/55">Class</span>
              <select aria-label="Filter by class" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="min-w-28 bg-transparent outline-none">
                <option value="all">All classes</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
              </select>
            </label>
            <span className="text-sm text-ink/55">{filtered.length} of {students.length} students</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center border-t border-white/70 px-6 py-14 text-center">
              <Users className="h-8 w-8 text-lilac-500" />
              <p className="mt-3 font-semibold">{students.length ? 'No matching students' : 'No students yet'}</p>
              <p className="mt-1 text-sm text-ink/55">
                {students.length ? 'Try another search or class filter.' : 'Add a student to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-white/70">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/40 text-xs text-ink/55">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">ID</th>
                    <th scope="col" className="px-5 py-3 font-medium">Name</th>
                    <th scope="col" className="px-5 py-3 font-medium">Class</th>
                    <th scope="col" className="px-5 py-3 font-medium">Roll no.</th>
                    <th scope="col" className="px-5 py-3 font-medium">Status</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70">
                  {filtered.map((student) => {
                    const status = STATUS[student.status] ?? STATUS.active
                    return (
                      <tr key={student.id} className="transition-colors hover:bg-white/50">
                        <td className="px-5 py-3.5 font-mono text-xs text-ink/60" title={student.id}>{student.id.slice(0, 8)}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium">{student.student?.full_name ?? 'Unknown student'}</p>
                          <p className="mt-0.5 text-xs text-ink/50">{student.admission_no} · {student.student?.email ?? 'No email'}</p>
                        </td>
                        <td className="px-5 py-3.5 text-ink/70">{classLabel(student.classes)}</td>
                        <td className="px-5 py-3.5 tabular-nums text-ink/70">{student.roll_no ?? '–'}</td>
                        <td className="px-5 py-3.5"><Badge tone={status.tone} dot>{status.label}</Badge></td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(student)}
                              aria-label={`Edit ${student.student?.full_name ?? 'student'}`}
                              className="grid h-9 w-9 place-items-center rounded-lg text-ink/60 outline-none hover:bg-lilac-100 hover:text-lilac-600 focus-visible:ring-2 focus-visible:ring-lilac-500/60"
                            >
                              <UserRoundPen className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStudent(student)}
                              disabled={deletingId === student.id}
                              aria-label={`Delete ${student.student?.full_name ?? 'student'}`}
                              className="grid h-9 w-9 place-items-center rounded-lg text-ink/60 outline-none hover:bg-rose-100 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500/60 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {dialogOpen && (
        <StudentDialog
          key={editing?.id ?? 'new'}
          student={editing}
          classes={classes}
          onClose={() => setDialogOpen(false)}
          onSave={saveStudent}
        />
      )}
    </div>
  )
}
